---
name: figma-ui-workflow
description: Use first for any Figma retrieval or acquisition work, and when implementing, modifying, reviewing, or verifying UI from Figma. Trigger for Figma nodes, design screenshots, get_design_context, get_metadata, get_screenshot, truncated design context, visual matching, 1:1 restoration, project-style translation, Playwright visual checks, or UI verification/completion claims.
---

# Figma UI Workflow

## Figma Skill Routing

For any Figma retrieval/acquisition task (including reading design context, metadata, screenshots, variables, libraries, Code Connect mappings, or any other Figma MCP “get/search/list/read” style operation), invoke this `figma-ui-workflow` skill first, then route the concrete Figma work through the official Figma skills below.

Do not call Figma MCP tools directly from this project skill. Route Figma work through the official Figma skills with the `Skill` tool, then follow the loaded Figma skill’s instructions for any MCP calls it requires.

| Situation | Skill to invoke |
| --- | --- |
| Read or inspect an existing Figma design/node | `figma:figma-use` |
| Generate or translate an app page/layout into Figma | `figma:figma-generate-design` |
| Create or update a Figma component/library | `figma:figma-generate-library` |
| Map Figma components to code components | `figma:figma-code-connect` |
| Verify rendered UI behavior or claims | `verify` |
| Browser-render or screenshot a local/static web page | `document-skills:webapp-testing` |

When dispatching a subagent, instruct it to invoke the relevant Figma skill first and use that skill’s workflow to obtain design context and screenshots. For browser visual checks, invoke the relevant verification/testing skill first and follow its workflow instead of hand-rolling an ad hoc browser script. If any required skill is unavailable, stop the task, tell the user which skill is missing, provide the plugin/source address to install it, and wait for the user to install it before continuing. Do not proceed without the required design context or visual verification path.

## Overview

Figma skill output is design evidence, not final code. Always collect structured context and visual reference before implementation, then translate the design into the target project’s conventions. Visual verification is a hard acceptance gate: completion cannot be claimed until the rendered UI has been opened, compared against the Figma screenshot, and meets the agreed similarity threshold at every required scope. Default threshold: at least 90% visual similarity (`diffRatio <= 10%`) unless the user explicitly sets another threshold. Apply the threshold to the whole page, each meaningful module/section/component, and each relevant dynamic interaction state.

## Required flow

1. Confirm the exact Figma node and target project page.
2. Dispatch a subagent to invoke the relevant Figma skill first so bulky design context stays out of the main session.
3. In the subagent, follow the loaded Figma skill’s workflow to fetch structured context for the precise node.
4. If context is too large, incomplete, or truncated, the subagent follows the Figma skill’s narrowing workflow to identify needed child nodes and fetch only those child-node contexts.
5. The subagent follows the Figma skill’s screenshot guidance to capture the node or variant being implemented.
6. The subagent returns a concise implementation brief: relevant structure, measurements, colors, typography, assets, behavior notes, screenshot reference, and any unresolved blockers.
7. Start implementation only after the subagent has obtained non-truncated structured context for the relevant node or child nodes and a screenshot.
8. Translate Figma skill output into target project conventions: framework structure, existing components, styling patterns already used nearby, text/content handling conventions, and data display helpers already established in the codebase. Split the UI into meaningful modules/sections/components so each can be implemented and verified independently.
9. Invoke the verification/testing skill, run the page locally, capture the actual browser render, and compare it against the Figma screenshot before claiming completion. This is mandatory visual verification, not an optional best effort. Unless the user gives a different target, visual similarity must be at least 90% (`diffRatio <= 10%`) for the whole page, every meaningful module/section/component, and every relevant dynamic interaction state.
10. Store temporary verification artifacts in a cache/temp folder and remove them after verification. Store design-export assets that are part of the final implementation in the target project’s established image/static asset location.

## Missing required skills

- Required skills for this workflow include the relevant `figma:*` skill, `verify`, and `document-skills:webapp-testing` when browser visual verification is needed.
- If a required skill is not available in the Skill tool list, do not substitute a manual process or silently continue.
- Tell the user exactly which skill is missing and ask them to install or enable the plugin that provides it.
- Provide the plugin/source address when known:
  - Figma skills: Claude Code plugin marketplace package `figma` / official Figma MCP integration that provides `figma:*` skills.
  - `verify`: Claude Code plugin marketplace package `oh-my-claudecode` (skill: `verify`).
  - `document-skills:webapp-testing`: Claude Code plugin marketplace package `document-skills` (skill: `document-skills:webapp-testing`).
- Stop the current task after giving the installation guidance. Continue only after the user confirms the missing skill/plugin has been installed or enabled.

## Module and interaction verification

- Treat the page-level screenshot as only one verification scope. Also define meaningful modules/sections/components from the design and verify each module independently.
- For each module, capture or crop both the Figma reference and the browser render for that module, then measure similarity against the threshold. Default: each module must reach at least 90% similarity (`diffRatio <= 10%`) unless the user explicitly sets another threshold.
- Include dynamic interaction states in the verification plan: hover, active, focus, selected, expanded/collapsed, open/closed dialogs, loading, empty, error, disabled, responsive breakpoints, and any state shown or implied by the design.
- For each relevant interaction state, drive the UI in the browser, capture that state, compare it with the corresponding Figma variant/reference, and require the same similarity threshold.
- Do not let a high whole-page score hide a failing module or interaction state. If any required module/state fails the threshold, visual verification is incomplete.

## Artifact and asset hygiene

- Temporary artifacts include comparison screenshots, render screenshots, diff images, cropped test strips, intermediate downloaded screenshots, module-level crops, interaction-state captures, and one-off analysis files. Put these in a cache/temp folder, not beside source files, and delete them before reporting completion unless the user explicitly asks to keep them.
- Final design assets include real implementation assets exported from the design, such as icons, logos, decorative images, QR images, background images, or component slice assets intentionally used by the delivered UI. Store these in the target project’s existing image/static asset path and reference them according to project conventions.
- Do not mix temporary verification files with final implementation assets.
- Do not leave expired Figma MCP asset URLs in final code. Download required final assets into the project asset location; keep short-lived URLs only in temporary cache artifacts.
- If the project has no obvious asset location, inspect nearby code/assets and choose the established convention before writing files. If still unclear, ask the user.

## Quick reference

| Situation | Action |
| --- | --- |
| Figma context is large or truncated | Dispatch a subagent; it uses `get_metadata`, then fetches smaller child-node contexts |
| Screenshot differs from context | Treat screenshot as visual truth and context as structure/token evidence |
| Generated output uses a different framework or styling system | Translate behavior and layout into the target project’s framework and style conventions |
| Existing component matches design | Reuse it instead of recreating controls |
| UI text/content is added | Follow the target project’s text/content conventions |
| Dynamic data is shown | Use established project helpers/patterns instead of ad hoc display logic |
| UI work is done | Invoke `verify` and `document-skills:webapp-testing`, open the rendered page in browser, compare whole-page, module-level, and interaction-state renders with Figma references, meet the similarity threshold at every required scope, and clean temporary verification artifacts before claiming completion |
| A page contains multiple sections/components | Split verification by meaningful modules; each module must meet the threshold independently |
| The UI has hover/focus/open/selected/loading/error/responsive states | Drive each relevant state in browser and verify it against its Figma reference or variant |
| Comparison/render/diff files are created | Put them in a cache/temp folder and delete them after verification unless the user asks to keep them |
| Design slice/export assets are needed by final code | Store them in the target project’s established image/static asset location, not in the cache folder |

## Guardrails

- Do not implement from screenshot-only, partial, incomplete, or truncated design context, even if the user asks for speed.
- If Figma context cannot be narrowed successfully, stop and report the blocker instead of approximating.
- Do not treat MCP-generated code as repository-ready code.
- Do not skip browser visual verification for UI changes.
- Do not bypass the verification/testing skills with an ad hoc browser script. If a required skill is unavailable, stop and instruct the user to install/enable it. If a loaded skill is explicitly insufficient for a narrow step, explain why before using the smallest direct fallback.
- Do not mark UI/Figma work complete after only file existence, HTML parsing, build success, static DOM checks, or code review; these are not visual verification.
- Do not claim visual completion if measured similarity is below the threshold. Default threshold is 90% similarity (`diffRatio <= 10%`) at whole-page, module, and interaction-state scopes.
- Do not average away failures: a whole-page pass does not compensate for a failed module or dynamic state.
- If browser rendering cannot be opened, compared with the Figma screenshot, or measured against the threshold for every required module/state, report the blocker and state that visual verification is incomplete.
- Do not leave temporary comparison/render/diff/cache artifacts in source or asset directories after completion.
- Do not store final design-export assets in temporary cache folders; move intentional implementation assets into the target project’s established asset location.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| “Context is long, I’ll infer the rest.” | Stop and use metadata to narrow the node scope. |
| “The screenshot is enough.” | Get design context for spacing, hierarchy, assets, and text. |
| “The generated code/classes can be pasted directly.” | Match nearby project style and existing components first. |
| “Looks close in code review.” | Launch the page and compare actual browser rendering through the verification/testing skill workflow. |
| “The file exists / HTML parses / build passes, so it is verified.” | These are structural checks only. Visual verification requires browser rendering plus comparison against the Figma screenshot. |
| “The page looks close, so it is complete.” | Measure similarity at whole-page, module, and interaction-state scopes. Unless the user sets another threshold, require at least 90% similarity (`diffRatio <= 10%`) for each required scope. |
| “The whole page passed, so every part is fine.” | Whole-page similarity can hide local defects. Verify meaningful modules and interaction states independently. |
| “The text/content is temporary.” | Text/content still follows the target project’s conventions. |
| “I’ll leave comparison screenshots/diffs next to the source for convenience.” | Temporary verification artifacts belong in cache/temp storage and should be removed after verification. |
| “Design slices can stay in the cache folder.” | Final implementation assets belong in the target project’s established image/static asset location. |

## Completion checklist

Before reporting completion, every item below must be true:

1. Exact node context was fetched.
2. Truncated context, if any, was replaced by metadata-guided child context.
3. Screenshot was fetched for the implemented node or variant.
4. Implementation follows the target project’s framework, styling, content, and data display conventions.
5. All required skills were available. If any required skill was missing, the task was stopped and the user was told which plugin/source to install before continuing.
6. The relevant verification/testing skill was invoked and followed.
7. Page was opened locally in a browser.
8. The actual browser render was captured and compared with the Figma screenshot for layout, spacing, color, typography, content, and visible assets.
9. The UI was split into meaningful modules/sections/components, and each required module was captured and compared independently.
10. Relevant dynamic interaction states were driven in the browser, captured, and compared with their Figma references or variants.
11. Similarity was measured and met the threshold at every required scope: default at least 90% similarity (`diffRatio <= 10%`) for whole page, each module, and each interaction state unless the user explicitly set another threshold.
12. Any mismatch found during visual comparison was either fixed or explicitly reported.
13. Temporary verification artifacts were stored in cache/temp storage and cleaned up, unless the user explicitly asked to keep them.
14. Final design-export assets used by the implementation were stored in the target project’s established image/static asset location.

If items 5-14 are not complete, say “visual verification is incomplete” and do not claim the UI/Figma work is complete.
