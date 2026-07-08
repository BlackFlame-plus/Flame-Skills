---
name: apifox-api-methods
description: Apifox 接口转前端代码工具。当用户提到 Apifox/apifox/接口文档/接口定义/API文档/接口管理/接口对接/对接接口/写接口/调接口/接口方法/api方法/生成接口/新增接口/接口入参/接口出参/请求参数/响应字段/返回值类型/TS类型/TypeScript类型/接口类型/接口mock/mock数据/接口ID/接口地址/apiId/projectId，或贴出 Apifox 链接（https://app.apifox.com/ 或 https://apifox.com/ 开头，含 project/数字/apis/api-数字 或 /link/project/数字/apis/api-数字），或说"帮我对接一下xxx接口"、"把这个Apifox接口转成代码"、"根据Apifox生成请求方法"、"生成接口TS类型"、"写个mock"等任何涉及 Apifox 接口数据转前端代码的场景时必须触发。即使用户没明确说"用skill"也要触发。即便只有 1% 的可能相关也要调用本 skill，不可用通用代码生成替代。
---

# Apifox API Methods

## 0. ⛔ MCP 前置检查 · AI 自动配置（强制卡点 · 零例外）

> 🚨🚨🚨 **本节是硬性强制规则，任何要调用 apifox-new-mcp 工具的场景都必须先过这一关。**
>
> - ⛔ **禁止**在 apifox-new-mcp 不可用时用 `WebFetch` / `httpx` / `curl` / Playwright 等任何方式绕过 MCP 直接调 Apifox Open API
> - ⛔ **禁止**告诉用户"MCP 没配，我先用 HTTP 抓一下凑合"
> - ⛔ **禁止**让用户自己手动编辑配置文件——**AI 必须主动索要 API Key 并替用户完成配置**
> - ⛔ 用户的真实诉求是"把 MCP 配好"，不是"换个方法凑合"

### 检测方式

在执行任何 Apifox 操作前，先判断 `mcp__apifox-new-mcp__*` 工具是否可用：

- ✅ 工具可用（能看到 `mcp__apifox-new-mcp__listAccessibleProjects`、`mcp__apifox-new-mcp__getHttpEndpoint` 等）→ 直接进入第 1 节正常流程
- ❌ 工具不可用 / 调用返回"找不到 MCP"/连接错误 → **必须**触发下方"AI 自动配置流程"，禁止继续业务流程

### ⛔ AI 自动配置流程（禁止让用户手动写配置）

**第 1 步：向用户索要 Apifox Personal Access Token**

直接把下面这段话发给用户（一字不改，不要加多余解释）：

```
🔧 检测到 Apifox MCP 还未配置，我来帮你自动配好，需要你提供一下 Apifox 的 API Key：

1. 打开 Apifox 网页版/客户端，登录后点击左下角头像 →「个人账号设置」→「API 访问令牌」（或直接访问 https://app.apifox.com/user/openapi ）
2. 点击「新建令牌」，名字随便填（比如"Claude Code"），复制生成的 Token（以 afxp_ 开头的字符串）
3. 把 Token 直接粘贴发给我就行，我来自动写入配置文件，你不需要动任何文件。
```

**第 2 步：收到 Token 后，AI 直接写入用户级配置**

1. 用 Read 工具读取用户级配置文件：
   - Windows：`C:\Users\<用户名>\.claude.json`（用 `~/.claude.json` 即可，工具会自动解析）
   - Mac/Linux：`~/.claude.json`
2. 解析 JSON，在 `mcpServers` 字段下加入/更新 `apifox-new-mcp` 条目：

```json
{
  "mcpServers": {
    "apifox-new-mcp": {
      "type": "http",
      "url": "https://api.apifox.com/mcp",
      "headers": {
        "Authorization": "Bearer <用户粘贴的afxp_开头Token>",
        "X-Apifox-Api-Version": "2025-09-01"
      }
    }
  }
}
```

   注意：
   - `mcpServers` 字段不存在就新建
   - 已存在其它 MCP server（如 apifox-new-mcp 之外的条目）必须保留，不能覆盖
   - 如果已经有 `apifox-new-mcp` 旧条目，用新的覆盖
   - JSON 必须合法，写入前用 Node/Python 做一次 `JSON.parse` 校验防止写坏
3. 写入完成后告诉用户：

```
✅ 已自动把 Apifox MCP 配置写入 <配置文件路径>。
请重启 Claude Code（关闭窗口重新打开）让 MCP 生效，然后回来告诉我"重启好了"我再继续。
```

**第 3 步：等待用户重启确认**

- ⛔ 用户说"重启好了"之前，**禁止**继续走后续 Apifox 业务流程
- ⛔ 禁止用户没重启就开始试调用——第一次一定会失败，浪费一次往返

### Token 过期/401 场景

如果 MCP 可调用但返回 401 Unauthorized / Token 失效：
1. 告诉用户 Token 已过期
2. 按上述第 1-2 步重新索要新 Token 并覆盖写入原文件
3. 提示重启 Claude Code

---

## Goal

Turn one or more Apifox HTTP endpoint definitions into repository-ready frontend API methods, TypeScript request/response types when applicable, concise comments, and mock data that matches the endpoint schema.

## Required inputs

**Auto-extraction FIRST:** Before any other action, parse the user's message to extract IDs automatically:

1. **From Apifox links:** Extract `projectId` and `apiId` from URLs like:
   - `https://app.apifox.com/link/project/996642/apis/api-477949336`
   - Regex: `project/(\d+)` → projectId, `api-(\d+)` → apiId

2. **From text patterns:** Extract `apiId` from lines like:
   - `接口ID：477949336` or `接口ID: 477949336`
   - Regex: `接口ID[：:]\s*(\d+)`

3. **From method + path:** Recognize endpoint references like:
   - `POST /memberManage/edit` (treat as path keyword for search)

**Then collect remaining inputs:**

1. Apifox `projectId` (auto-extracted if possible; ask only if not found).
2. Target endpoint identifiers: one or more interface IDs, paths, names, or keywords (auto-extracted if possible).
3. Target code location, or enough context to infer the existing API module.
4. Whether the target file is TypeScript or JavaScript.
5. Mock data destination if the project has an existing mock convention.

If auto-extraction yields both `projectId` and a specific `apiId`, proceed directly to endpoint retrieval without further questions. If the user provides only `projectId` and vague endpoint names, use Apifox structure/search tools first and ask only when multiple plausible endpoints remain.

## Apifox retrieval flow — OPTIMIZED

**PREFERRED TOOL PATH (fast and reliable):**

1. **Single endpoint with known ID:** Use `getHttpEndpoint` directly with `projectId` + `httpApiId`
   - Returns complete structured data: method, path, parameters, request body, responses, etc.
   - Path pattern: `GET /api/v1/projects/{projectId}/http-apis/{httpApiId}`
   - This is the most reliable and direct method

2. **Need OAS 3.0 format:** Use `readEntityDetails` with `projectId` + `entityType="endpoint"` + `entityId`
   - Returns full OpenAPI 3.0 definition
   - Use when you need standard OAS format for code generators

3. **Search/lookup by name/path/keyword:** Use `getStructureInfo` with `projectId` + `entityType="endpoint"`
   - Returns endpoint list with IDs, names, paths
   - Use this when you don't know the exact endpoint ID

**Subagent usage rules:**

- Use a subagent for Apifox discovery only when: multiple endpoints, folder/module scope, or vague keywords
- Single known endpoint ID → main agent directly, no subagent needed
- Main agent handles codebase integration; subagent returns structured facts only

**Required subagent report format:**
- Endpoint ID/name and method/path
- Request fields with locations (path/query/body/header) and required flags
- Response shape with field types
- Examples if available
- Missing schema notes
- Ambiguity notes (multiple matching endpoints, etc.)

Never invent endpoint IDs, paths, parameters, or schemas. Use minimal safe placeholders only after notifying the user.

## Codebase integration flow

1. Inspect nearby API modules before writing so naming, request wrapper, export style, and directory structure match the project.
2. Reuse the project's existing request client instead of introducing a new HTTP library.
3. Name methods from the endpoint purpose using the project's convention. Avoid copying awkward Apifox titles directly when nearby files use clearer names.
4. Preserve existing module organization. Add to an existing file when the endpoint belongs there; create a new file only when no suitable module exists.
5. For fixed UI-facing labels, follow project i18n rules. API code comments may stay concise and technical.

## TypeScript output rules

When the target file or module is TypeScript:

1. Create request parameter types for path, query, header, and body data that callers must pass.
2. Create response types from Apifox response schemas. Prefer precise fields over `any`.
3. Use optional properties only when the schema or parameter required flag says optional.
4. Preserve literal unions/enums from Apifox when available.
5. Add a short comment above each exported method describing the endpoint purpose, not the implementation mechanics.
6. If Apifox schema is incomplete, use `unknown` for unknown nested payloads rather than pretending a shape is known.

## JavaScript output rules

When the target module is JavaScript:

1. Generate the request method using existing style.
2. Add concise JSDoc only when nearby files use JSDoc or when parameter shape would otherwise be unclear.
3. Do not create TypeScript-only type files unless the user asks to migrate or the project already colocates generated types.

## Mock data flow

1. Search for existing mock conventions before creating mock files.
2. Build mock data from Apifox examples first, then from response schema if examples are absent.
3. Include realistic values that match field types, enum values, required fields, and nested structures.
4. Keep mock data deterministic and small enough for tests/stories/dev use.
5. If adding mock handlers, match the project's route/path matching style and HTTP method.
6. Do not mock authentication secrets or real personal data.

## Quality checks

Before reporting completion:

1. Verify all requested endpoints were found and mapped.
2. Verify method paths include required path parameters correctly.
3. Verify query/body/header parameters match Apifox required/optional flags.
4. Verify TypeScript types compile conceptually and avoid accidental `any` unless the source truly lacks shape.
5. Verify mock data conforms to the response type/schema.
6. Run the lightest relevant check available, such as typecheck, lint, or the project's existing targeted test, when practical.

## Response format

When done, report:

- Apifox endpoints used: method + path + endpoint ID/name.
- Files changed.
- API methods/types/mocks added.
- Verification performed or why it could not be run.

## Common pitfalls

| Pitfall | Better approach |
| --- | --- |
| MCP 不可用时用 WebFetch/httpx/curl 直接调 Apifox API | ⛔ 绝对禁止！必须按第 0 节自动配置流程向用户索要 API Key 并写入 ~/.claude.json |
| 让用户自己手动编辑 .claude.json / mcp.json | ⛔ 绝对禁止！AI 必须用 Edit/Write 工具替用户完成写入 |
| Guessing an endpoint from a similar name | Search Apifox and confirm the exact endpoint. |
| Dropping required path/query params | Map all Apifox parameter locations explicitly. |
| Using `any` for convenience | Use schema-derived types; use `unknown` only for genuinely unknown shapes. |
| Creating a new request client | Reuse the project's existing API wrapper. |
| Mocking only the happy top-level fields | Include required nested fields and enum-compatible values. |
| Mixing admin and frontend hscode APIs | Confirm the target project and endpoint source before editing. |
| Letting the Apifox subagent decide code changes | Subagent collects endpoint facts; main agent maps them into repository code. |
