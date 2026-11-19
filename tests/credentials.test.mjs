import test from 'node:test'
import assert from 'node:assert/strict'
import { credentialRef } from '../src/engine/credentials.js'

test('credential refs use the dwc_ namespace', () => {
  assert.equal(credentialRef('weixin_abc123', 'appSecret'), 'dwc_weixin_abc123_appSecret')
  assert.equal(credentialRef('weixin_abc123', 'appId'), 'dwc_weixin_abc123_appId')
})

test('credential refs are POSIX identifiers and never im_connect_', () => {
  const ref = credentialRef('weixin-a/b', 'app:secret')
  assert.match(ref, /^[A-Za-z_][A-Za-z0-9_]*$/)
  assert.ok(ref.startsWith('dwc_'))
  assert.equal(ref.includes('im_connect_'), false)
})
