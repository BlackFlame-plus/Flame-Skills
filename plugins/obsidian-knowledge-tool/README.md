# Obsidian Knowledge Tool

本插件提供一套受治理的 Obsidian 知识库操作入口：

- Skill 负责指导 AI 遵循 Inbox、提炼、晋升和归档流程。
- MCP 服务负责强制目录、Properties、内容哈希和禁止覆盖规则。
- Obsidian Local REST API 负责连接正在运行的 Obsidian Vault。

当前版本 `0.2.0`，已登记到本仓库插件市场 `flame-skills`。

## 前置条件

1. 安装并启用 Obsidian 的 **Local REST API** 社区插件。
2. 保持 Obsidian 打开，并加载目标 Vault。
3. 在 Local REST API 设置中确认 URL 和 API Key。
4. 安装 Node.js 20 或更高版本。

## 本地加载

在本仓库根目录执行：

```powershell
claude --plugin-dir ./plugins/obsidian-knowledge-tool
```

首次启用时填写：

- API URL：默认 `https://127.0.0.1:27124`
- API Key：Local REST API 生成的密钥
- Allow self-signed TLS：本机默认启用

API Key 通过插件的敏感 `userConfig` 保存，不写入仓库。

## Cursor 手动接入

Cursor 若不通过插件加载，可在自己的 `mcp.json` 中启动
`mcp/obsidian-knowledge-mcp/dist/index.js`，并通过本机环境变量提供：

- `OBSIDIAN_API_URL`
- `OBSIDIAN_API_KEY`
- `OBSIDIAN_ALLOW_INSECURE_TLS`

不要把 API Key 写入项目内可提交的配置。

## 数据保护

- 不提供通用覆盖、删除、附件上传或 Obsidian 命令工具。
- 新采集只写入 `01_Inbox`。
- AI 内容只写入 `40_Output/AI-Drafts`。
- 晋升和归档前必须校验 Properties，并使用最新内容哈希。
- 移动时先创建并验证目标，最后才把源文件移入回收站。
- 最后一步失败时保留两份文件，并要求人工处理。

## 会话知识自动评判

`conversation-knowledge-triage` Skill 在形成有意义的里程碑和会话结束时评判
对话。达到阈值的结论、决策、待办、偏好和项目更新会按原子条目自动保存到
`40_Output/AI-Drafts`。

该行为需要客户端主动调用 Skill 或遵循 Vault 的 `AGENTS.md`。Skill 本身不能
读取所有 AI 工具的私有历史记录，也不能保证不支持规则或 Hook 的客户端触发。
自动保存的内容保持 `reviewed: false`，必须人工复核后才能晋升。

