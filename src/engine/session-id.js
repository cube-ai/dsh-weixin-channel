/** Weixin channel session identity: separate from web tasks by id prefix. */
export const DWC_ORIGIN = 'dwc';
export const DWC_SESSION_PREFIX = 'dwc:';

export function sessionKeyOf(channel, kind, chatId) {
    return `${channel}:${kind}:${chatId}`;
}

let lastStamp = 0;

/** New sessions use a timestamped unique id; same-millisecond creates increment. */
export function createWeixinSessionId(channel, kind, chatId, now = Date.now()) {
    const stamp = now <= lastStamp ? lastStamp + 1 : now;
    lastStamp = stamp;
    return `${DWC_SESSION_PREFIX}${channel}:${kind}:${stamp}:${chatId}`;
}

export function isWeixinSessionId(sessionId) {
    return typeof sessionId === 'string' && sessionId.startsWith(DWC_SESSION_PREFIX);
}

const CHANNEL_IDS = ['weixin'];
const STAMP_RE = /^\d{13,}$/;

export function parseWeixinSessionId(sessionId) {
    if (!isWeixinSessionId(sessionId))
        return undefined;
    const rest = sessionId.slice(DWC_SESSION_PREFIX.length);
    const first = rest.indexOf(':');
    const second = rest.indexOf(':', first + 1);
    if (first <= 0 || second <= first)
        return undefined;
    const channel = rest.slice(0, first);
    const kind = rest.slice(first + 1, second);
    let chatId = rest.slice(second + 1);
    const third = chatId.indexOf(':');
    if (third > 0 && STAMP_RE.test(chatId.slice(0, third))) {
        chatId = chatId.slice(third + 1);
    }
    const platform = channel.split('_', 1)[0];
    const validInstance = CHANNEL_IDS.includes(platform) && /^[a-z0-9_-]+$/.test(channel);
    if (!validInstance || (kind !== 'dm' && kind !== 'group') || chatId === '')
        return undefined;
    return { channel, kind, chatId };
}

export function isWeixinOrigin(origin) {
    return origin === DWC_ORIGIN;
}

/** Task list visibility: exclude channel sessions and subagents. */
export function isTaskSession(input) {
    if (input.blank === true)
        return false;
    if (isWeixinOrigin(input.origin))
        return false;
    if (typeof input.id === 'string' && isWeixinSessionId(input.id))
        return false;
    if (input.origin === 'subagent')
        return false;
    return true;
}
