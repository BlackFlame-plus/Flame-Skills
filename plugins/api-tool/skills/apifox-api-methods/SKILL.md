---
name: apifox-api-methods
description: Use when the user wants to generate or update frontend API request methods from Apifox MCP. Trigger for: Apifox, projectId, 接口转方法, 生成接口方法, API 方法, mock 数据, TypeScript 入参/出参类型, Apifox links (https://app.apifox.com/link/project/.../apis/api-...), "接口ID：xxx" format, or any Apifox endpoint reference. Auto-extracts projectId and apiId from links/text. This skill should be used even if the user does not explicitly say "skill".
---

# Apifox API Methods

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
| Guessing an endpoint from a similar name | Search Apifox and confirm the exact endpoint. |
| Dropping required path/query params | Map all Apifox parameter locations explicitly. |
| Using `any` for convenience | Use schema-derived types; use `unknown` only for genuinely unknown shapes. |
| Creating a new request client | Reuse the project's existing API wrapper. |
| Mocking only the happy top-level fields | Include required nested fields and enum-compatible values. |
| Mixing admin and frontend hscode APIs | Confirm the target project and endpoint source before editing. |
| Letting the Apifox subagent decide code changes | Subagent collects endpoint facts; main agent maps them into repository code. |
