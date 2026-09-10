# Obsidian Knowledge

本插件提供一套受治理的 Obsidian 知识库操作入口：

- Skill 负责指导 AI 遵循 Inbox、提炼、晋升和归档流程。
- MCP 服务负责强制目录、Properties、内容哈希和禁止覆盖规则。
- Obsidian Local REST API 负责连接正在运行的 Obsidian Vault。

当前版本 `0.4.2`，已登记到本仓库插件市场 `flame-skills`。

## 前置条件

1. 安装并启用 Obsidian 的 **Local REST API** 社区插件。
2. 保持 Obsidian 打开，并加载目标 Vault。
3. 在 Local REST API 设置中确认 URL 和 API Key。
4. 安装 Node.js 20 或更高版本。

## 双端配置（勿混用占位符）

| 客户端 | Manifest | MCP 配置 | 密钥占位符 |
| --- | --- | --- | --- |
| Claude Code | `.claude-plugin/plugin.json` | `.mcp.json` | `${user_config.*}` |
| Cursor | `.cursor-plugin/plugin.json` | `mcp.json`（已 pin） | `${OBSIDIAN_API_*}`（`variables`） |

两套文件并存；Cursor 通过 `mcpServers: "./mcp.json"` 钉死，避免误加载 Claude 的 `.mcp.json`。

## Claude Code 本地加载

在本仓库根目录执行：

```powershell
claude --plugin-dir ./plugins/obsidian-knowledge
```

首次启用时填写：

- API URL：默认 `https://127.0.0.1:27124`
- API Key：Local REST API 生成的密钥
- Allow self-signed TLS：本机默认启用

API Key 通过插件的敏感 `userConfig` 保存，不写入仓库。

## Cursor 接入

### 推荐：插件 + variables

1. 安装 / 更新 `obsidian-knowledge`（Flame-Skills / Cursor marketplace）。
2. 打开 **Customize → Plugins → obsidian-knowledge → Configure**（或 Dashboard → Plugins → Configure）。
3. 填写：
   - `OBSIDIAN_API_URL`（默认 `https://127.0.0.1:27124`）
   - `OBSIDIAN_API_KEY`
   - `OBSIDIAN_ALLOW_INSECURE_TLS`（本机自签证书建议 `true`）
4. Reload MCP。确认 Plugin 进程环境里已是真实值，而不是 `${user_config.*}` 或未替换的 `${OBSIDIAN_API_KEY}`。

若同时存在 User 级 `~/.cursor/mcp.json` 与 Plugin 级 MCP，建议只保留一套，避免双份工具。

### 备选：用户级 mcp.json

不走插件 variables 时，可在 `~/.cursor/mcp.json` 启动
`mcp/obsidian-knowledge-mcp/dist/index.js`，并用环境变量或 `${env:NAME}` 提供：

- `OBSIDIAN_API_URL`
- `OBSIDIAN_API_KEY`
- `OBSIDIAN_ALLOW_INSECURE_TLS`

不要把 API Key 写入可提交的项目配置。

## 数据保护

- 不提供通用覆盖、删除、附件上传或 Obsidian 命令工具。
- 新采集只写入 `01_Inbox`。
- AI 内容只写入 `40_Output/AI-Drafts`。
- 晋升和归档前必须校验 Properties，并使用最新内容哈希。
- 移动时先创建并验证目标，最后才把源文件移入回收站。
- 最后一步失败时保留两份文件，并要求人工处理。

## 会话知识自动评判

`conversation-knowledge-triage` Skill 在形成有意义的里程碑和会话结束时评判
对话。达到阈值的结论、决策、待办、偏好和项目更新会按原子条目先写入
`40_Output/AI-Drafts`；非冲突候选会自动晋升（`reviewed: true` +
`auto_promoted: true`）。冲突类仍须人工复核。
