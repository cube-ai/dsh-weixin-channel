/** Weixin-only channel metadata. */
export const CHANNEL_ORDER = ['weixin'];

export const CHANNEL_META = {
    weixin: {
        id: 'weixin',
        label: '微信',
        description: '通过个人微信扫码登录后接收并回复用户消息',
        kind: 'qr',
        fields: [
            { key: 'botToken', label: '微信登录令牌', secret: true },
            { key: 'allowedUserId', label: '微信用户 ID' },
        ],
    },
};

export function listChannelMeta() {
    return CHANNEL_ORDER.map((id) => CHANNEL_META[id]);
}

export function supportsQr(id) {
    const kind = CHANNEL_META[id]?.kind;
    return kind === 'qr' || kind === 'qr-or-credentials';
}
