import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DWC_SESSION_PREFIX,
  createWeixinSessionId,
  isWeixinOrigin,
  isWeixinSessionId,
  isTaskSession,
  parseWeixinSessionId,
  sessionKeyOf,
} from '../src/engine/session-id.js'

test('session prefix is dwc: and never im:', () => {
  assert.equal(DWC_SESSION_PREFIX, 'dwc:')
  const id = createWeixinSessionId('weixin_abc123', 'dm', 'oc_1', 1700000000000)
  assert.equal(id, 'dwc:weixin_abc123:dm:1700000000000:oc_1')
  assert.equal(isWeixinSessionId(id), true)
  assert.equal(isWeixinSessionId('im:weixin_abc123:dm:1700000000000:oc_1'), false)
})

test('parse round-trips account, kind and chat id', () => {
  const id = createWeixinSessionId('weixin_abc123', 'group', 'oc_group:with:colons', 1700000000001)
  assert.deepEqual(parseWeixinSessionId(id), {
    channel: 'weixin_abc123',
    kind: 'group',
    chatId: 'oc_group:with:colons',
  })
  assert.equal(parseWeixinSessionId('im:weixin_abc:dm:1700000000000:oc_1'), undefined)
  assert.equal(parseWeixinSessionId('dwc:unknown:dm:1700000000000:oc_1'), undefined)
  assert.equal(parseWeixinSessionId('dwc:weixin_abc:nope:1700000000000:oc_1'), undefined)
})

test('task visibility excludes only Weixin sessions and subagents', () => {
  assert.equal(isTaskSession({ id: 'dwc:weixin_abc:dm:1700000000000:oc_1' }), false)
  assert.equal(isTaskSession({ origin: 'dwc' }), false)
  assert.equal(isTaskSession({ origin: 'subagent' }), false)
  assert.equal(isTaskSession({ blank: true }), false)
  assert.equal(isTaskSession({ id: 'normal-session' }), true)
  assert.equal(isWeixinOrigin('dwc'), true)
  assert.equal(isWeixinOrigin('im'), false)
})

test('session key shares account chat identity only', () => {
  assert.equal(sessionKeyOf('weixin_abc', 'dm', 'oc_1'), 'weixin_abc:dm:oc_1')
})
