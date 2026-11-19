# DSH微信频道技术实现说明

> 本文面向需要了解插件内部机制、排障或二次开发的读者。安装、添加频道等日常操作请见 [README.md](../README.md)。

## 1. 定位与边界

「DSH微信频道」把个人微信机器人接入本机 DeepSeek Harness。插件只支持个人微信，不包含企业微信或其他 IM 通道，也不依赖云端中转：微信消息由本机 Host 通过腾讯 iLink Bot 长轮询接收（`ilinkai.weixin.qq.com`），再交给 DSH 的 Agent 处理。

一个**微信频道**对应：

- 一次微信扫码登录得到的机器人登录态（`botToken`）；
- 一条本机长轮询连接；
- 一组本地配置：模型、工作区、权限、Agent 预设、私聊准入、发送方式和命令权限。

因为个人微信一个用户只能创建一个 AI 机器人，插件在设计上**只允许存在一个微信频道**：

- 首次安装后主界面中央显示「添加微信频道」；
- 已有频道后不再提供添加入口，右上角显示「设置」；
- 只有删除现有频道后才能再次添加。

## 2. 包结构与加载

| 部分 | 文件 | 作用 |
|---|---|---|
| Cordis bundle patch | `cordis.patch.yml` | 向 profile 插入 Host 插件行 `weixin-channel` |
| Host 入口 | `src/index.js` | 注册 Config、初始化状态目录和日志、创建 `ChannelManager` |
| Host 核心 | `src/manager.js` | 频道生命周期、单频道约束、状态、凭据、HTTP API、扫码、诊断 |
| 消息引擎 | `src/engine/*` | 会话路由、消息合并、Agent 调用、审批/提问、命令、投递 |
| 微信通道 | `src/channels/weixin.js` | iLink 长轮询、媒体加解密、typing、诊断 |
| 微信扫码 | `src/channels/qr/weixin.js` | 获取登录二维码、轮询扫码状态 |
| Client 入口 | `client.js` | 注册侧边栏菜单项、主面板、会话行图标和 composer |
| 本地化 | `locale/*.json` | 中文/英文插件元数据 |

`package.json` 中：

- `dsh.bundle.patch` 指向 `cordis.patch.yml`；
- `dsh.client.platform` 为 `web`；
- `dsh.client.inject` 注入 locale、slots 和 UI primitives。

Host Config：

| 配置 | 默认值 | 作用 |
|---|---|---|
| `stateDir` | 空（使用 `$DSH_HOME/dsh-weixin-channel`） | 状态目录和日志目录 |
| `cwd` | `process.cwd()` | 默认工作区 |
| `provider` | 空 | 新频道的默认模型提供商 |
| `model` | 空 | 新频道的默认模型 |
| `agentPreset` | `standard` | 默认 Agent 预设 |
| `mergeTimeoutSecs` | `5` | 连续消息合并等待时间 |

Host 启动顺序：

```text
apply()
  → 解析 Config（stateDir/cwd/provider/model/agentPreset/mergeTimeoutSecs）
  → 创建状态目录和 gateway.log
  → new ChannelManager(...)
  → manager.registerApi(ctx)
  → manager.initEnabled()          # 启动已启用的频道
  → manager.attachMappedSessions() # 恢复已有 dwc: 会话
```

`src/index.js` 的 `ctx.effect` 在卸载时调用 `disposeApi()`，停止 API、扫码、频道连接和消息引擎。

## 3. Host 架构

```text
src/index.js
  └─ ChannelManager
       ├─ channels.json / allowlist / pending
       ├─ CredentialVault（ctx.credentials 或 secrets.json 回退）
       ├─ PairingHub（微信扫码）
       └─ WeixinChannelAdapter（iLink 长轮询）
       └─ ImEngine
            ├─ SessionRouter（dwc: 会话）
            ├─ SessionMerger / ReplyStreamHub
            ├─ ApprovalBroker / QuestionBroker
            ├─ ChatCommands / CommandPermissions
            ├─ DeferredDelivery
            └─ FileDelivery / ImageInput
```

### 3.1 ChannelManager

负责：

- 加载、迁移和原子写入 `channels.json`；
- 维护频道启用状态、接收状态和运行中的 adapter；
- 保存/解析凭据引用，不把登录令牌写进普通状态文件；
- 扫码配对、连接、重连、诊断、移除；
- 提供管理 API；
- 将微信消息交给 `ImEngine`，把 Agent 回复送回微信；
- 维护 `dwc:` 会话映射，并挂载到对应工作区。

单频道约束在 `connectNow()` 中强制：如果已存在任意微信频道，且本次扫码得到的不是同一个频道身份，返回：

```text
已有微信频道，请先删除现有频道后再添加
```

同一微信用户重复扫码会命中相同 `accountId`，因此可以安全地刷新登录态。

### 3.2 PairingHub

扫码登录入口：

1. `POST /ilink/bot/get_bot_qrcode?bot_type=3` 获取二维码 ID 与内容；
2. Host 用 `qrcode` 在本地生成二维码图片（不调用第三方二维码服务）；
3. 轮询 `get_qrcode_status`，支持 `waiting` / `scanned` / `confirmed` / `expired`；
4. 确认后取得 `bot_token`、`ilink_user_id`、`baseurl`；
5. 保存凭据并创建频道，随后启动 adapter。

### 3.3 WeixinChannelAdapter

基于腾讯官方 iLink Bot 协议的长轮询适配器：

- `getupdates` 长轮询收消息，游标保存在 `wechat-state.json`；
- 文本、图片、语音、文件、视频解析；
- CDN 媒体使用 AES-128-ECB 加解密；
- `context_token` 回复，同一聊天出站串行；
- `getconfig` → `sendtyping` 的「正在输入」状态；
- 登录态失效（`ret=-14`）时清除令牌并要求重新扫码；
- 暴露连接状态和诊断信息。

### 3.4 ImEngine

与具体 IM 平台解耦的消息/会话层，负责：

- 将微信聊天映射为 DSH 会话；
- 消息去重、合并、分流；
- 调用 DSH Agent；
- 审批、提问、选择按钮和命令处理；
- 流式回复、分片、失败重试和延迟投递；
- 私聊准入；
- 文件和图片输入输出；
- 会话标题、历史恢复和工作区挂载。

Host 通过 `ctx` 使用这些宿主服务：

```text
webServer, credentials, agents, agentPresets,
agentDefaultModel, llm, permissionPresets
```

`connection`、`sessionPersistence`、`workspaceRegistry`、`userQuestions` 等通过 `ctx.get(...)` 按需读取；宿主缺少对应服务时会降级，而不是让插件启动失败。

## 4. 状态、凭据与会话

### 4.1 状态目录

默认：

```text
$DSH_HOME/dsh-weixin-channel
```

未设置 `DSH_HOME` 时通常是 `~/.dsh/dsh-weixin-channel`。可通过 Host Config 的 `stateDir` 覆盖。

| 文件 | 内容 |
|---|---|
| `channels.json` | 频道配置、允许列表、待批准请求、默认设置 |
| `sessions.json` | `dwc:` 会话映射 |
| `seen.json` | 消息去重记录 |
| `deferred-delivery.json` | 发送失败后的延迟投递状态 |
| `gateway.log` | 插件运行日志（滚动文件） |
| `secrets.json` | 仅当 Host 没有 credentials 服务时的本地凭据回退文件 |
| `accounts/<channelId>/wechat-state.json` | 登录用户、`context_token`、轮询游标、服务端 base URL |
| `accounts/<channelId>/wechat-login.txt` | 最近一次登录二维码 URL（仅排障用） |
| `accounts/<channelId>/media/` | 入站媒体落盘 |

### 4.2 channels.json

当前结构版本为 2，核心字段如下：

```jsonc
{
  "version": 2,
  "channels": {
    "weixin_ab12cd34ef56": {
      "id": "weixin_ab12cd34ef56",
      "platform": "weixin",
      "name": "微信频道 1",
      "nameOrdinal": 1,
      "enabled": true,
      "receiveEnabled": true,
      "config": {
        "allowedUserId": "wxid_xxx",
        "baseUrl": "https://ilinkai.weixin.qq.com",
        "botTokenRef": "dwc_weixin_ab12cd34ef56_botToken"
      },
      "assistant": { "provider": "deepseek-official", "model": "deepseek-flash" },
      "agentPreset": "standard",
      "cwd": "/path/to/workspace",
      "permission": "workspace-write",
      "commandPermissions": {},
      "privateAccess": "approved",
      "sendMode": "queue",
      "lastCheckedAt": "2026-11-19T..."
    }
  },
  "allowlist": { "weixin_ab12cd34ef56": ["wxid_xxx"] },
  "pending": {},
  "assistant": {},
  "cwd": "/path/to/workspace",
  "permission": "workspace-write"
}
```

说明：

- `accountId` 由 `weixin + "\0" + allowedUserId` 的 SHA-256 前 12 位生成，格式为 `weixin_<hash>`；
- 扫码确认后 `allowedUserId` 会同时写入 `channels.json`、`wechat-state.json` 和允许列表；
- 若状态文件残留 `config.provisioning` 快照，加载时会自动删除并 flush；
- `lastCheckedAt` 只记录最近一次连接诊断时间，不保存诊断明细。

### 4.3 凭据

优先使用 DSH credentials 服务：

```text
dwc_<channelId>_botToken
```

`channels.json` 只保存 `botTokenRef`，不保存明文令牌。普通 `/channels` 响应只暴露 `hasToken`；插件不提供读取令牌的 API。

### 4.4 会话 ID 与映射

微信会话 ID 格式：

```text
dwc:<channelId>:<dm|group>:<13位以上时间戳>:<chatId>
```

例如：

```text
dwc:weixin_ab12cd34ef56:dm:1793773379160:wxid_xxx
```

- `dwc:` 与会话页签中的普通任务、`im:` 会话完全分开；
- `sessions.json` 的 key 是 `channelId:dm|group:chatId`；
- `SessionRouter` 只恢复 `dwc:` 前缀的会话；
- 插件把 `dwc:` 会话从「任务」列表排除，通过微信频道面板和会话行图标呈现。

## 5. 管理 API

基础路径：

```text
/api/dsh-weixin-channel
```

请求约束：

- 入口调用宿主 `connection.requestRejection(req)` 做登录/来源校验；宿主认证服务不可用时返回 503；
- 变更请求必须带：

```text
x-dsh-weixin-channel-client: 1
content-type: application/json
```

- 请求体上限 1 MB；超限返回 413；
- GET 不做变更标记校验；
- 响应格式统一为 `{ ok, ... }`，错误只返回安全文案，不返回凭据。

主要路由：

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/channels` | 频道、会话分组、待批准请求和默认设置 |
| GET | `/assistant` | 默认模型/权限/预设/工作区和模型目录 |
| POST | `/assistant` | 保存默认设置 |
| POST | `/sessions/rename` | 重命名微信会话 |
| POST | `/sessions/remove` | 删除微信会话 |
| POST | `/sessions/cleanup-missing` | 清理已不存在的会话 |
| POST | `/sessions/ensure` | 确保会话已挂载 |
| GET | `/channels/weixin/qr/status` | 查询扫码状态 |
| POST | `/channels/weixin/qr/start` | 开始扫码 |
| POST | `/channels/weixin/qr/refresh` | 刷新二维码 |
| POST | `/channels/weixin/qr/cancel` | 取消扫码 |
| POST | `/channels/weixin/connect` | 使用登录凭据建立频道（界面走扫码，不直接使用） |
| POST | `/channels/weixin/receive` | 设置接收开关 |
| POST | `/channels/weixin/disconnect` | 断开连接 |
| POST | `/channels/weixin/remove` | 移除频道 |
| POST | `/channels/weixin/approve` | 批准私聊用户 |
| POST | `/channels/weixin/deny` | 拒绝私聊用户 |
| POST | `/accounts/:id/settings` | 保存频道级设置 |
| POST | `/accounts/:id/receive` | 设置频道接收开关 |
| POST | `/accounts/:id/reconnect` | 重连频道 |
| POST | `/accounts/:id/check` | 运行连接诊断 |
| POST | `/accounts/:id/remove` | 移除频道 |
| POST | `/accounts/:id/approve` | 批准频道用户 |
| POST | `/accounts/:id/deny` | 拒绝频道用户 |

界面主要使用 `/channels`、`/assistant`、二维码和 `/accounts/:id/*`。

## 6. 消息运行流程

### 6.1 添加频道

```text
用户填写频道名称和初始设置
  → POST /channels/weixin/qr/start
  → PairingHub 获取 iLink 登录二维码
  → 用户在手机微信扫码并确认
  → PairingHub 取得 bot_token / ilink_user_id / baseurl
  → 保存凭据到 credentials，写入频道配置和登录态
  → ChannelManager.connect() → startOne()
  → WeixinChannelAdapter 长轮询启动
  → 频道出现在主面板
```

### 6.2 入站消息

```text
iLink getupdates 长轮询
  → WeixinChannelAdapter 解析文本与媒体
  → ImEngine
      → 去重（seen.json）
      → 私聊准入
      → 斜杠命令或普通消息
      → SessionMerger / SessionRouter
      → DSH Agent
      → 流式回复 / 审批 / 提问 / 文件
  → WeixinChannelAdapter sendmessage
```

### 6.3 出站与失败处理

- 文本按微信消息大小限制分片（`maxMessageLength = 1200`）；
- 图片、视频、文件先加密上传 CDN，再以对应 item 发送；
- 处理中显示「正在输入」；
- 发送失败按分片退避重试；
- 明确拒收（429/503、`ret=-2`）进入 `deferred-delivery.json`，由后台恢复逻辑重试；
- 工具调用前的过渡文字不占用微信有限的回复窗口（`skipInterimText`）。

### 6.4 访问控制与命令

- 私聊准入支持 `approved` 和 `all`；
- 扫码登录用户会加入允许列表；
- 未批准用户在面板中显示，可批准/拒绝；
- 每个频道可配置命令权限（私聊/群聊、允许的命令）；
- 常用命令包括 `/status`、`/workspace`、`/new`、`/model` 等，具体以当前命令实现为准。

## 7. Client 结构与界面

`client.js` 通过 `window.__ModuleLoader__.load` 注册模块，模块 id 为：

```text
@cubeai/dsh-weixin-channel
```

### 7.1 左侧边栏菜单项

插件使用 DSH 公开的全局面板槽位：

- `sidebar.panellist` 注册 `id = weixin-channel`、`order = 30` 的菜单项；
- 菜单图标由插件绘制，标签来自 `locale`，与「DSH飞书客户端」「CubeAI应用中心」等条目平级；
- 不包装、不替换 `sidebar.workspaces`，也不使用私有 Registry 约定。

### 7.2 主面板

`main` 槽位以 `key = weixin-channel` 注册主面板：

- 没有微信频道时，主界面中央显示「添加微信频道」按钮；
- 已有频道时，右上角显示「设置」按钮；标题栏显示频道名称与连接状态；
- 频道页正文直接内嵌该频道的微信会话（官方 `conversation.content` 的 `embedded` 变体），消息、工具卡片、审批/提问和底部的微信只读输入条都在频道页内；
- 内嵌区顶部显示会话标题、更新时间和会话切换器（多会话时），正文为官方对话视图与底部微信只读输入条；
- 只有一个会话时不再显示会话列表；会话多于一个时，内嵌区顶部提供会话切换器；
- 频道设置弹窗：
  - 频道名称；
  - 微信绑定信息（微信用户 ID、登录状态）；
  - 工作区；
  - 模型和推理等级；
  - 权限；
  - Agent 预设；
  - 私聊准入；
  - 发送方式（排队/插话）；
  - 命令权限；
  - 连接诊断、重连、移除。
- 删除频道后，`channels.json`、登录态和会话映射会被清理，页面回到空状态，可以重新添加。

添加频道弹窗只保留扫码流程，包含频道名称和初始频道设置。

### 7.3 会话行图标与 Composer

- 主面板通过声明 session 作用域的 `weixin-channel.conversation` 子槽位，用 `SessionProvider` + `renderFactorySlot('conversation.content', { variant: 'embedded' })` 把官方会话嵌进频道页；`sessions.retain()` 的引用在切换/卸载时释放；
- 通过 `sidebar.session.row.leading` 槽位，为 `dwc:` 会话显示微信品牌小图标；
- 对 `dwc:` 会话注册 `conversation.composer`：
  - 如果会话存在待审批/待回答交互，让位给宿主自身的交互 composer；
  - 否则替换为微信只读提示栏：模型只读展示、不允许本地输入；
  - 运行中显示停止按钮，确认后调用会话级 `conversation.cancel()`。

### 7.4 国际化与样式

- 中文/英文词典内置在 client 中；
- 服务端错误通过 `server.*` 键映射，未知错误显示通用文案；
- 样式选择器统一使用 `.dwc-` 前缀；
- 颜色使用 DSH 主题 token（`--dsw-alias-*`）；
- 不覆盖宿主全局样式，不写 `body`/`#root` 规则。

## 8. 与其他插件的共存

| 项目 | dsh-im-connect | dsh-feishu-channels | 本插件 |
|---|---|---|---|
| 会话前缀 | `im:` | `dfc:` | `dwc:` |
| 侧栏入口 | 工作区页签 | 工作区页签 | 全局面板菜单项 |
| 面板 id | `channels` | `feishu` | `weixin-channel` |
| 状态目录 | 各自独立 | 各自独立 | 各自独立 |
| API 前缀 | 各自独立 | 各自独立 | 各自独立 |
| 凭据 | 各自独立 | 各自独立 | 各自独立 |

本插件与另外两个插件没有 npm 依赖，也不共享状态。全局面板槽位是公开 API，不需要识别或包装其他插件的实现。

## 9. 安全与隔离

- 管理 API 复用宿主登录/来源校验，不自行实现登录；
- 变更请求要求客户端标记头和 JSON content-type，降低跨站表单误操作风险；
- 登录令牌只通过 credentials 服务保存，列表只暴露 `hasToken`；
- 优先使用宿主 credentials 服务；
- `secrets.json` 回退文件权限为 0600；
- 二维码在 Host 本地生成，不调用第三方二维码服务；
- 微信 CDN 图片下载校验 HTTPS、主机名和大小上限，并禁止重定向；
- 插件不自带更新器，不修改其他插件的状态或代码。

## 10. 诊断与运维

### 10.1 日志

默认日志：

```text
$DSH_HOME/dsh-weixin-channel/gateway.log
```

日志包含启动、频道启动/停止、扫码、API 注册、消息投递和错误摘要。

### 10.2 连接诊断

`POST /accounts/:id/check` 会执行连接探测，返回：

- 当前频道状态；
- 是否已登录；
- 平台响应摘要；
- 诊断检查项。

未登录或令牌失效时返回 `auth` 失败。诊断结果只用于当前操作，不写入 `channels.json`。

### 10.3 重连与移除

- 重连：`POST /accounts/:id/reconnect`；
- 移除：`POST /accounts/:id/remove`，删除频道配置、登录态、会话映射和凭据引用；
- 卸载插件本身不会自动删除状态目录；若要彻底清除，需要手动删除状态目录和 `dwc:` 会话记录。

## 11. 已知限制

- 只支持个人微信，不包含企业微信或其他 IM 通道；
- 只允许一个微信频道；个人微信一个用户只能创建一个机器人；
- 登录协议使用腾讯官方 iLink Bot 接口，建议使用专用小号；
- 登录态失效后需要重新扫码（重新添加频道，或重新连接后在微信中确认）；
- 插件不负责刷新/更新自身版本；
- 宿主认证服务不可用时，管理 API 会返回 503，页面无法加载频道数据；
- 客户端页面依赖 DSH Web profile 的 slots、locale 和 UI primitives。

## 12. 验证

```bash
node scripts/check.js
node --test tests/*.test.mjs
```

测试覆盖 Host API、单频道约束、扫码/配对、微信协议工具、会话 ID、凭据、频道模型刷新和客户端注册与渲染。
