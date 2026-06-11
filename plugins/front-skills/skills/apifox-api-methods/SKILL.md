---
name: apifox-api-methods
description: Use when the user wants to generate or update frontend API request methods from Apifox MCP by projectId and one or more interface names/paths/IDs. Trigger for Apifox, projectId, 接口转方法, 生成接口方法, API 方法, mock 数据, TypeScript 入参/出参类型, or converting Apifox endpoint definitions into project request functions. This skill should be used even if the user only gives a projectId plus endpoint keywords and does not explicitly say "skill".
---

# Apifox API Methods

## Goal

Turn one or more Apifox HTTP endpoint definitions into repository-ready frontend API methods, TypeScript request/response types when applicable, concise comments, and mock data that matches the endpoint schema.

## Required inputs

Collect or infer these before editing code:

1. Apifox `projectId`.
2. Target endpoint identifiers: one or more interface IDs, paths, names, or keywords.
3. Target code location, or enough context to infer the existing API module.
4. Whether the target file is TypeScript or JavaScript.
5. Mock data destination if the project has an existing mock convention.

If the user provides only `projectId` and vague endpoint names, use Apifox structure/search tools first and ask only when multiple plausible endpoints remain.

## Apifox retrieval flow

Use a subagent for Apifox discovery and endpoint-detail collection whenever the request names a folder/module, multiple endpoints, vague keywords, or any target that requires more than one Apifox lookup. The main agent should keep codebase integration and final decisions; the subagent should return structured endpoint facts only.

1. Prefer local `.apifox/{projectId}_*.settings.json` cache when present and fresh; otherwise have the subagent call `getProjectSummary` for structure IDs.
2. Have the subagent locate endpoints with `getStructureInfo` when the user gives folder/module context, or broader endpoint listing when they only provide keywords.
3. Have the subagent read each selected endpoint with `readEntityDetails` or `getHttpEndpoint` so it reports method, path, parameters, request body, response schema, examples, and descriptions.
4. Require the subagent report to include endpoint ID/name, method/path, request fields with locations and required flags, response shape, examples, missing schema notes, and any ambiguity.
5. Do not invent endpoint IDs, paths, parameters, schemas, or examples. If Apifox data is missing, mark the missing part and use the minimal safe placeholder only after telling the user.
6. If multiple endpoints are requested, retrieve them as a batch in the subagent and keep each method/type/mock traceable to its source endpoint.

Use the main agent directly only for a single fully specified endpoint ID when one `getHttpEndpoint` or `readEntityDetails` call is enough.

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
