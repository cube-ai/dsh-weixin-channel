import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionRouter } from '../src/engine/router.js'

function makeRouter(config) {
  const appended = []
  const selection = { current: { provider: 'old-provider', model: 'old-model' } }
  const agent = {
    session: {
      append(type, data) {
        appended.push({ type, data })
      },
    },
  }
  const controller = {
    agents: {
      selectionFor: () => selection,
      selectForNextRequest: (target, next) => {
        target.session.append('model/selection', next)
        selection.current = next
      },
    },
  }
  const ctx = {
    get: (name) => name === 'sessionController' ? controller : undefined,
  }
  const router = new SessionRouter(ctx, {}, config, () => {}, () => config)
  return { router, agent, appended, selection }
}

test('channel model is re-applied to an existing session on the next turn', () => {
  const config = { provider: 'provider-a', model: 'model-a' }
  const { router, agent, appended, selection } = makeRouter(config)

  assert.equal(router.applyConfiguredModel('weixin_test', agent), true)
  assert.deepEqual(selection.current, { provider: 'provider-a', model: 'model-a' })
  assert.deepEqual(appended.at(-1), {
    type: 'model/selection',
    data: { provider: 'provider-a', model: 'model-a' },
  })

  config.provider = 'provider-b'
  config.model = 'model-b'
  assert.equal(router.applyConfiguredModel('weixin_test', agent), true)
  assert.deepEqual(selection.current, { provider: 'provider-b', model: 'model-b' })
  assert.equal(appended.filter((item) => item.type === 'model/selection').length, 2)
})

test('channel model refresh keeps the current reasoning effort', () => {
  const config = { provider: 'provider-a', model: 'model-a', reasoningEffort: 'high' }
  const { router, agent, appended, selection } = makeRouter(config)

  assert.equal(router.applyConfiguredModel('weixin_test', agent), true)
  assert.deepEqual(selection.current, {
    provider: 'provider-a',
    model: 'model-a',
    reasoningEffort: 'high',
  })
  assert.deepEqual(appended.at(-1).data, {
    provider: 'provider-a',
    model: 'model-a',
    reasoningEffort: 'high',
  })
})
