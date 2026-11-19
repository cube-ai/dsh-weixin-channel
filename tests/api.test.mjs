import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { apply } from '../src/index.js'

function makeResponse() {
  return {
    status: 0,
    headers: undefined,
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body ?? ''
    },
  }
}

function makeRequest(url, method = 'GET', headers = {}) {
  return { url, method, headers }
}

function installFake(connection) {
  const routes = []
  const disposers = []
  const ctx = {
    logger: () => ({ info() {} }),
    effect: (fn) => {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    permissionPresets: {
      defaultPreset: 'workspace-write',
      names: ['workspace-write'],
      optionOf: (name) => ({ value: name, name }),
    },
    credentials: { async set() {}, async resolve() { return undefined }, async unset() {} },
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
    get(name) {
      if (name === 'connection') return connection
      return undefined
    },
    agents: {},
    agentPresets: {},
    agentDefaultModel: {},
    llm: {},
  }
  return { ctx, routes, disposers }
}

test('GET /channels returns the Weixin-only channel list', async () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'dwc-api-'))
  const { ctx, routes, disposers } = installFake({ requestRejection: () => undefined })
  try {
    apply(ctx, { stateDir, cwd: process.cwd(), provider: '', model: '', agentPreset: 'standard', mergeTimeoutSecs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const route = routes[0]
    const res = makeResponse()
    await route.handler(makeRequest('/api/dsh-weixin-channel/channels'), res)
    assert.equal(res.status, 200)
    const data = JSON.parse(res.body)
    assert.equal(data.ok, true)
    assert.equal(data.channels.length, 1)
    assert.equal(data.channels[0].id, 'weixin')
    assert.equal(data.channels[0].total, 0)
    assert.deepEqual(data.groups, [])
    assert.deepEqual(data.pending, [])
  } finally {
    for (const dispose of [...disposers].reverse()) await dispose()
    rmSync(stateDir, { recursive: true, force: true })
  }
})

test('API rejects unauthenticated and unmarked mutations', async () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'dwc-api-'))
  let rejection
  const { ctx, routes, disposers } = installFake({ requestRejection: () => rejection })
  try {
    apply(ctx, { stateDir, cwd: process.cwd(), provider: '', model: '', agentPreset: 'standard', mergeTimeoutSecs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const route = routes[0]

    rejection = 401
    const unauthorized = makeResponse()
    await route.handler(makeRequest('/api/dsh-weixin-channel/channels'), unauthorized)
    assert.equal(unauthorized.status, 401)

    rejection = undefined
    const unmarked = makeResponse()
    await route.handler(makeRequest('/api/dsh-weixin-channel/accounts/x/settings', 'POST', {
      'content-type': 'application/json',
    }), unmarked)
    assert.equal(unmarked.status, 403)

    const missingJson = makeResponse()
    await route.handler(makeRequest('/api/dsh-weixin-channel/accounts/x/settings', 'POST', {
      'content-type': 'text/plain',
      'x-dsh-weixin-channel-client': '1',
    }), missingJson)
    assert.equal(missingJson.status, 415)
  } finally {
    for (const dispose of [...disposers].reverse()) await dispose()
    rmSync(stateDir, { recursive: true, force: true })
  }
})


test('account view exposes WeChat identity and token presence', async () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'dwc-api-'))
  writeFileSync(join(stateDir, 'channels.json'), JSON.stringify({
    version: 2,
    channels: {
      weixin_test: {
        id: 'weixin_test',
        platform: 'weixin',
        name: '微信频道1',
        nameOrdinal: 1,
        enabled: false,
        receiveEnabled: false,
        config: {
          botTokenRef: 'dwc_weixin_test_botToken',
          allowedUserId: 'wxid_test',
          provisioning: { checkedAt: '2026-11-04T00:00:00.000Z' },
        },
      },
    },
    allowlist: {},
    pending: {},
  }))
  const { ctx, routes, disposers } = installFake({ requestRejection: () => undefined })
  ctx.credentials = {
    async set() {},
    async unset() {},
    async resolve(ref) { return ref === 'dwc_weixin_test_botToken' ? 'bot-token-value' : undefined },
  }
  try {
    apply(ctx, { stateDir, cwd: process.cwd(), provider: '', model: '', agentPreset: 'standard', mergeTimeoutSecs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const route = routes[0]
    const listRes = makeResponse()
    await route.handler(makeRequest('/api/dsh-weixin-channel/channels'), listRes)
    const list = JSON.parse(listRes.body)
    const account = list.channels[0].accounts[0]
    assert.equal(account.botUserId, 'wxid_test')
    assert.equal(account.hasToken, true)
    assert.equal(account.appId, undefined)
    const saved = JSON.parse(readFileSync(join(stateDir, 'channels.json'), 'utf8'))
    assert.equal(saved.channels.weixin_test.config.provisioning, undefined)

    const req = Readable.from(['{}'])
    req.url = '/api/dsh-weixin-channel/accounts/weixin_test/secret'
    req.method = 'POST'
    req.headers = {
      'content-type': 'application/json',
      'x-dsh-weixin-channel-client': '1',
    }
    const res = makeResponse()
    await route.handler(req, res)
    assert.equal(res.status, 404, 'the removed secret route must not be reachable')
  } finally {
    for (const dispose of [...disposers].reverse()) await dispose()
    rmSync(stateDir, { recursive: true, force: true })
  }
})

test('a second WeChat channel is rejected while one exists', async () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'dwc-api-'))
  writeFileSync(join(stateDir, 'channels.json'), JSON.stringify({
    version: 2,
    channels: {
      weixin_existing: {
        id: 'weixin_existing',
        platform: 'weixin',
        name: '微信频道1',
        nameOrdinal: 1,
        enabled: false,
        receiveEnabled: false,
        config: { allowedUserId: 'wxid_existing' },
        cwd: process.cwd(),
        permission: 'workspace-write',
      },
    },
    allowlist: {},
    pending: {},
  }))
  const { ctx, routes, disposers } = installFake({ requestRejection: () => undefined })
  try {
    apply(ctx, { stateDir, cwd: process.cwd(), provider: '', model: '', agentPreset: 'standard', mergeTimeoutSecs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const route = routes[0]
    const body = JSON.stringify({
      config: { botToken: 'other-token', allowedUserId: 'wxid_other' },
      settings: { name: '微信频道2', cwd: process.cwd(), permission: 'workspace-write', agentPreset: 'standard' },
    })
    const req = Readable.from([body])
    req.url = '/api/dsh-weixin-channel/channels/weixin/connect'
    req.method = 'POST'
    req.headers = {
      'content-type': 'application/json',
      'x-dsh-weixin-channel-client': '1',
    }
    const res = makeResponse()
    await route.handler(req, res)
    assert.equal(res.status, 400)
    assert.match(JSON.parse(res.body).error, /已有微信频道/)
    const saved = JSON.parse(readFileSync(join(stateDir, 'channels.json'), 'utf8'))
    assert.deepEqual(Object.keys(saved.channels), ['weixin_existing'])
  } finally {
    for (const dispose of [...disposers].reverse()) await dispose()
    rmSync(stateDir, { recursive: true, force: true })
  }
})

test('POST /channels/weixin/qr/start returns a locally rendered QR image', async () => {
  const stateDir = mkdtempSync(join(tmpdir(), 'dwc-api-'))
  const { ctx, routes, disposers } = installFake({ requestRejection: () => undefined })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('get_bot_qrcode')) {
      return new Response(JSON.stringify({ ret: 0, qrcode: 'qr-id', qrcode_img_content: 'https://weixin.qq.com/qr' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ret: 1, errcode: 0, status: 'waiting' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  try {
    apply(ctx, { stateDir, cwd: process.cwd(), provider: '', model: '', agentPreset: 'standard', mergeTimeoutSecs: 5 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const route = routes[0]
    const req = Readable.from([JSON.stringify({ settings: { name: '微信频道1' } })])
    req.url = '/api/dsh-weixin-channel/channels/weixin/qr/start'
    req.method = 'POST'
    req.headers = {
      'content-type': 'application/json',
      'x-dsh-weixin-channel-client': '1',
    }
    const res = makeResponse()
    await route.handler(req, res)
    assert.equal(res.status, 200)
    const data = JSON.parse(res.body)
    assert.equal(data.ok, true)
    assert.equal(data.pairing.status, 'waiting')
    assert.match(data.pairing.qrImage, /^data:image\/png;base64,/)
  } finally {
    for (const dispose of [...disposers].reverse()) await dispose()
    globalThis.fetch = originalFetch
    rmSync(stateDir, { recursive: true, force: true })
  }
})
