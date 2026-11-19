import { readFileSync, readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []
const notes = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}
function fail(message) {
  failures.push(message)
}
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.npm-cache' || name === '.git') continue
      walk(path, out)
    } else if (name.endsWith('.js')) out.push(path)
  }
  return out
}

const pkg = JSON.parse(read('package.json'))
if (pkg.name !== '@cubeai/dsh-weixin-channel') fail(`package name is ${pkg.name}`)
if (pkg.type !== 'module') fail('package must be ESM')
if (pkg.main !== 'src/index.js') fail(`main is ${pkg.main}`)
if (pkg.exports?.['.'] !== './src/index.js') fail('exports["."] must point at src/index.js')
if (pkg.exports?.['./client'] !== './client.js') fail('exports["./client"] must point at client.js')
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') fail('dsh.bundle.patch missing')
if (pkg.dsh?.client?.platform !== 'web') fail('dsh.client.platform must be web')
if (!Array.isArray(pkg.dsh?.client?.inject) || !pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale')) fail('dsh.client.inject must include locale')
if (!pkg.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-slots')) fail('dsh.client.inject must include slots')
if (pkg.dependencies?.['@larksuiteoapi/node-sdk']) fail('Feishu SDK must not be a dependency')

const files = walk(join(root, 'src')).concat([join(root, 'client.js')])
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (check.status !== 0) fail(`syntax: ${relative(root, file)}\n${check.stderr}`)
}

const runtimeText = files.map((file) => readFileSync(file, 'utf8')).join('\n')
for (const forbidden of [
  '@michengai/dsh-im-connect',
  'im_connect_',
  '/api/dsh-im-connect',
  'x-dsh-im-connect-client',
  'dsh-im-connect',
  '@larksuiteoapi',
  'feishu',
  '飞书',
  'lark',
  'telegram',
  'discord',
  'slack',
  'wecom',
  'dingtalk',
]) {
  if (runtimeText.toLowerCase().includes(forbidden.toLowerCase())) fail(`runtime still contains ${forbidden}`)
}
if (!read('src/engine/session-id.js').includes("DWC_SESSION_PREFIX = 'dwc:'")) fail('session prefix must be dwc:')
if (!read('src/engine/credentials.js').includes('dwc_${channelId}_${key}')) fail('credential ref prefix must be dwc_')
if (!read('src/manager.js').includes("'/api/dsh-weixin-channel'")) fail('manager API prefix must be /api/dsh-weixin-channel')
if (!read('src/manager.js').includes("'x-dsh-weixin-channel-client'")) fail('manager mutation header must be x-dsh-weixin-channel-client')
if (!read('src/manager.js').includes('已有微信频道，请先删除现有频道后再添加')) fail('manager must enforce a single WeChat channel')
if (!read('src/channels/meta.js').includes("CHANNEL_ORDER = ['weixin']")) fail('only the weixin channel may be declared')

const clientText = read('client.js')
if (!clientText.includes('id: "@cubeai/dsh-weixin-channel"')) fail('client module id mismatch')
if (!clientText.includes('"/api/dsh-weixin-channel"')) fail('client API base mismatch')
if (!clientText.includes('"weixin-channel"')) fail('client locale namespace mismatch')
if (!clientText.includes('"sidebar.panellist"')) fail('client must register a sidebar menu item')
if (!clientText.includes('"main"')) fail('client must render a main panel')
if (!clientText.includes('key: PANEL_ID')) fail('client main panel must use the panel id as key')
if (clientText.includes('"sidebar.workspaces"')) fail('client must not wrap the sidebar workspaces slot')
if (clientText.includes('__dshNativeTab')) fail('client must not implement the private tab registry')

const localeStart = clientText.indexOf('const DWC_LOCALES = {')
const localeEnd = clientText.indexOf('const fallbackT', localeStart)
if (localeStart < 0 || localeEnd <= localeStart) fail('DWC_LOCALES block not found')
else {
  const literal = clientText.slice(clientText.indexOf('{', localeStart), localeEnd).trim().replace(/;\s*$/, '')
  const dictionaries = new Function(`return (${literal})`)()
  const zhKeys = Object.keys(dictionaries.zh)
  const enKeys = Object.keys(dictionaries.en)
  if (zhKeys.length !== enKeys.length) fail(`locale key mismatch: zh=${zhKeys.length} en=${enKeys.length}`)
  for (const key of zhKeys) if (!enKeys.includes(key)) fail(`locale key missing in en: ${key}`)
  for (const key of enKeys) if (!zhKeys.includes(key)) fail(`locale key missing in zh: ${key}`)
  const used = new Set([...clientText.matchAll(/(?:^|[^A-Za-z0-9_$.])t\("([^"]+)"\)/g)].map((match) => match[1]))
  for (const key of used) if (!zhKeys.includes(key)) fail(`literal locale key missing: ${key}`)
  const dynamic = [
    'connection.connected', 'connection.connecting', 'connection.reconnecting', 'connection.disconnected',
    'connection.stopped', 'connection.error', 'connection.unknown', 'connection.paused',
    'connection.checking', 'connection.checkFailed', 'connection.restartRequired', 'connection.receiveOn',
    'connection.receiveOff', 'connection.receiveUnknown', 'connection.checkedAt', 'connection.diagnostics',
    'diagnostic.title', 'diagnostic.scope', 'diagnostic.config', 'diagnostic.passed', 'diagnostic.failed',
    'diagnostic.unverified', 'diagnostic.ok', 'diagnostic.local-state', 'diagnostic.cancelled',
    'diagnostic.auth', 'diagnostic.permission', 'diagnostic.rate-limit', 'diagnostic.server',
    'diagnostic.network', 'diagnostic.timeout', 'diagnostic.invalid-response', 'diagnostic.rejected',
    'diagnostic.missing-context', 'diagnostic.not-connected', 'diagnostic.unsupported', 'diagnostic.changed',
    'server.unknownChannel', 'server.channelUnconfigured', 'server.sessionMissing', 'server.accountMissing',
    'server.accountConnectFailed', 'server.accountReconnectFailed', 'server.remarkTooLong',
    'server.remarkControl', 'server.selectAccountSettings', 'server.selectModel', 'server.selectWorkspace',
    'server.createWorkspace', 'server.selectPermission', 'server.missingCredentials', 'server.qrUnsupported',
    'server.qrExpired', 'server.qrIncomplete', 'server.accessDenied', 'server.channelExists',
    'channel.weixin', 'qr.weixin', 'account.statusNotConnected', 'status.stopped', 'status.longConnection',
    'status.saving', 'status.saved', 'action.collapse', 'action.expand', 'action.checkConnection',
    'command.dm', 'command.group', 'permission.readOnly', 'permission.workspaceWrite', 'permission.fullAccess',
  ]
  for (const key of dynamic) if (!zhKeys.includes(key)) fail(`dynamic locale key missing: ${key}`)
}

const zh = JSON.parse(read('locale/zh.json'))
const en = JSON.parse(read('locale/en.json'))
if (!zh.meta?.title || !zh.meta?.description) fail('locale/zh.json meta incomplete')
if (!en.meta?.title || !en.meta?.description) fail('locale/en.json meta incomplete')
if (zh.meta.title !== 'DSH微信频道') fail(`zh meta.title is ${zh.meta.title}`)

for (const path of ['README.md', 'LICENSE', 'NOTICE', 'icon.svg', 'cordis.patch.yml', 'docs/dsh-weixin-channel.md']) {
  try {
    read(path)
  } catch {
    notes.push(`missing optional deliverable: ${path}`)
  }
}

if (failures.length) {
  console.error('check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}
console.log(`check ok: ${files.length} JS files, ${notes.length} notes`)
for (const note of notes) console.log(`note: ${note}`)
