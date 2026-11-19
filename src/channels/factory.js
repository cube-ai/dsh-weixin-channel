import { createWeixinChannel } from './weixin.js'

/**
 * Only the personal WeChat platform is supported by this plugin.
 * The manager still passes a platform id; unknown ids are rejected.
 */
export function createChannelAdapter(id, config, log, stateDir, options) {
  if (id !== 'weixin') return undefined
  const adapter = createWeixinChannel({
    enabled: true,
    stateDir,
    botToken: config.botToken,
    onBotToken: options?.onWeixinBotToken,
    host: options?.host,
  }, log, stateDir)
  if (!adapter) return undefined
  return {
    ...adapter,
    id: options?.accountId ?? adapter.id,
    label: options?.accountLabel ?? adapter.label,
  }
}
