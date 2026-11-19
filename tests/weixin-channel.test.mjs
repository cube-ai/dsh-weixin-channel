import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  aesEcbPaddedSize,
  buildCdnDownloadUrl,
  clearWeixinLogin,
  createWeixinChannel,
  decryptAesEcb,
  encryptAesEcb,
  isStaleWeixinTokenError,
  mimeFromExt,
  parseAesKey,
  readResponseBufferLimited,
  readWeixinAllowedUserId,
  persistWeixinLogin,
  uniqueMediaFileName,
} from '../src/channels/weixin.js'
import { parseWeixinQr, parseWeixinStatus, weixinHeaders } from '../src/channels/qr/weixin.js'

test('微信适配器只支持微信平台', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dwc-weixin-'))
  try {
    assert.equal(createWeixinChannel({ enabled: false }, () => {}, dir), undefined)
    const channel = createWeixinChannel({ enabled: true, stateDir: dir, botToken: 'token' }, () => {}, dir)
    assert.equal(channel.id, 'weixin')
    assert.equal(channel.label, '微信')
    assert.equal(channel.maxMessageLength, 1200)
    assert.equal(channel.skipInterimText, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('AES-128-ECB 与官方插件使用同一填充和密钥格式', () => {
  assert.equal(aesEcbPaddedSize(0), 16)
  assert.equal(aesEcbPaddedSize(15), 16)
  assert.equal(aesEcbPaddedSize(16), 32)
  const key = Buffer.from('00112233445566778899aabbccddeeff', 'hex')
  const plaintext = Buffer.from('DSH 微信频道 media payload')
  const ciphertext = encryptAesEcb(plaintext, key)
  assert.equal(ciphertext.length, aesEcbPaddedSize(plaintext.length))
  assert.deepEqual(decryptAesEcb(ciphertext, key), plaintext)
  assert.deepEqual(parseAesKey(key.toString('base64')), key)
  assert.deepEqual(parseAesKey(Buffer.from(key.toString('hex')).toString('base64')), key)
  assert.throws(() => parseAesKey(Buffer.alloc(8).toString('base64')))
})

test('CDN 下载地址与媒体文件名生成', () => {
  assert.equal(
    buildCdnDownloadUrl('a+b/c='),
    'https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param=a%2Bb%2Fc%3D',
  )
  assert.equal(mimeFromExt('.png'), 'image/png')
  assert.equal(mimeFromExt('.mp4'), 'video/mp4')
  assert.equal(mimeFromExt('.pdf'), 'application/pdf')
  assert.equal(mimeFromExt('.unknown'), 'application/octet-stream')
  const name = uniqueMediaFileName('image', '.jpg', '照片 1.jpg')
  assert.match(name, /^image-\d+-[0-9a-f]{12}-照片_1\.jpg$/)
  assert.notEqual(uniqueMediaFileName('image', '.jpg'), uniqueMediaFileName('image', '.jpg'))
})

test('媒体读取按实际字节数执行硬上限', async () => {
  const ok = new Response(new Uint8Array([1, 2, 3]))
  assert.deepEqual(await readResponseBufferLimited(ok, 10), Buffer.from([1, 2, 3]))
  const tooLarge = new Response(new Uint8Array([1, 2, 3, 4]))
  await assert.rejects(() => readResponseBufferLimited(tooLarge, 3), /媒体超过 3 字节上限/)
  const declared = new Response(new Uint8Array([1]), { headers: { 'content-length': '99' } })
  await assert.rejects(() => readResponseBufferLimited(declared, 10), /媒体超过 10 字节上限/)
})

test('登录态失效错误按官方 ret=-14 识别', () => {
  assert.equal(isStaleWeixinTokenError(new Error('weixin /ilink/bot/getupdates ret=-14 errcode=0')), true)
  assert.equal(isStaleWeixinTokenError(new Error('ret = -14')), true)
  assert.equal(isStaleWeixinTokenError(new Error('ret=-140')), false)
  assert.equal(isStaleWeixinTokenError(new Error('ECONNRESET')), false)
})

test('微信扫码开始与状态解析', () => {
  const headers = weixinHeaders()
  assert.equal(headers['iLink-App-ClientVersion'], '1')
  assert.equal(headers['content-type'], 'application/json')
  assert.deepEqual(parseWeixinQr({ qrcode: 'qr-id', qrcode_img_content: 'https://weixin.qq.com/qr' }), {
    qrcodeId: 'qr-id',
    qrUrl: 'https://weixin.qq.com/qr',
  })
  assert.throws(() => parseWeixinQr({ qrcode: 'qr-id' }), /二维码字段缺失/)
  assert.deepEqual(parseWeixinStatus({ status: 'confirmed', bot_token: 'token', ilink_user_id: 'wxid_1', baseurl: 'https://ilinkai.weixin.qq.com' }), {
    status: 'success',
    credentials: { botToken: 'token', bound: '1', allowedUserId: 'wxid_1', baseUrl: 'https://ilinkai.weixin.qq.com' },
  })
  assert.deepEqual(parseWeixinStatus({ status: 'scaned' }), { status: 'scanned' })
  assert.deepEqual(parseWeixinStatus({ status: 'expired' }), { status: 'expired', error: '二维码已过期' })
  assert.deepEqual(parseWeixinStatus({}), { status: 'waiting' })
})

test('频道登录态写入与删除', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dwc-weixin-'))
  try {
    persistWeixinLogin(dir, { allowedUserId: 'wxid_1', baseUrl: 'https://ilinkai.weixin.qq.com' })
    assert.equal(readWeixinAllowedUserId(dir), 'wxid_1')
    const saved = JSON.parse(readFileSync(join(dir, 'wechat-state.json'), 'utf8'))
    assert.equal(saved.allowedUserId, 'wxid_1')
    assert.equal(saved.baseUrl, 'https://ilinkai.weixin.qq.com')
    assert.deepEqual(saved.contextTokens, {})
    clearWeixinLogin(dir)
    assert.equal(readWeixinAllowedUserId(dir), undefined)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('微信适配器诊断在未登录时给出认证失败', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dwc-weixin-'))
  try {
    const channel = createWeixinChannel({ enabled: true, stateDir: dir }, () => {}, dir)
    const checks = await channel.diagnose(AbortSignal.timeout(2_000))
    assert.equal(checks.length, 1)
    assert.equal(checks[0].id, 'config')
    assert.equal(checks[0].status, 'failed')
    assert.equal(checks[0].reason, 'auth')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
