# Front Skills

面向 Claude Code 的前端工作流 Skill 插件市场，结构对齐 Claude Code 官方插件仓库/市场规范。

当前市场包含 3 个独立插件类型：

- `seo-tool`：SEO 工作流插件
- `ui-or-prd-tool`：Figma / UI 实现与验证 + 蓝湖 PRD 需求获取插件
- `api-tool`：Apifox / API 方法生成插件

## 仓库结构

```text
front-skills/
  ├── .claude-plugin/
  │   └── marketplace.json              # 市场目录，用户添加 marketplace 后从这里发现插件
  └── plugins/
      ├── seo-tool/
      │   ├── .claude-plugin/plugin.json
      │   └── skills/seo-framework/SKILL.md
      ├── ui-or-prd-tool/
      │   ├── .claude-plugin/plugin.json
      │   └── skills/
      │       ├── figma-ui-workflow/SKILL.md
      │       └── lanhu-requirements/SKILL.md
      └── api-tool/
          ├── .claude-plugin/plugin.json
          └── skills/apifox-api-methods/SKILL.md
```

## 安装方式

### 方式一：从 GitHub 市场安装

先添加市场：

```text
/plugin marketplace add https://github.com/BlackFlame-plus/Flame-Skills.git
```

按需安装插件：

```text
/plugin install seo-tool@front-skills-market
/plugin install ui-or-prd-tool@front-skills-market
/plugin install api-tool@front-skills-market
```

安装后执行：

```text
/reload-plugins
```

然后即可使用：

```text
/seo-tool:seo-framework
/ui-or-prd-tool:figma-ui-workflow
/ui-or-prd-tool:lanhu-requirements
/api-tool:apifox-api-methods
```

### 方式二：本地开发测试

在本仓库根目录运行 Claude Code，可单独加载任意插件：

```bash
claude --plugin-dir ./plugins/seo-tool
claude --plugin-dir ./plugins/ui-or-prd-tool
claude --plugin-dir ./plugins/api-tool
```

也可以一次加载三个：

```bash
claude --plugin-dir ./plugins/seo-tool --plugin-dir ./plugins/ui-or-prd-tool --plugin-dir ./plugins/api-tool
```

进入 Claude Code 后测试：

```text
/seo-tool:seo-framework
/ui-or-prd-tool:figma-ui-workflow
/ui-or-prd-tool:lanhu-requirements
/api-tool:apifox-api-methods
```

### 方式三：本地市场测试

如果还没推送到 GitLab，可以从本地路径添加市场：

```text
/plugin marketplace add D:/jcCode/AI_project/front-skills
/plugin install seo-tool@front-skills-market
/plugin install ui-or-prd-tool@front-skills-market
/plugin install api-tool@front-skills-market
```

## 已包含插件

| Plugin | Skill | 用途 |
| --- | --- | --- |
| `seo-tool` | `seo-framework` | SEO metadata、可爬链接、H1、NuxtImg、alt、分页、canonical、结构化数据等 SEO 逻辑实现/审查。 |
| `ui-or-prd-tool` | `figma-ui-workflow` | Figma 设计稿获取、UI 实现、视觉验证、Playwright 自查工作流。 |
| `ui-or-prd-tool` | `lanhu-requirements` | 从蓝湖获取产品需求、设计说明或 Axure 原型，并整理为需求上下文。 |
| `api-tool` | `apifox-api-methods` | 从 Apifox MCP 的接口定义生成前端 API 方法、TypeScript 类型、mock 数据。 |

## 添加新的插件或 Skill

### 新增到已有插件

1. 在 `plugins/<plugin-name>/skills/<skill-name>/SKILL.md` 新增 Skill。
1. 确保 `SKILL.md` 包含 `description` frontmatter。
1. 修改 `plugins/<plugin-name>/.claude-plugin/plugin.json` 的 `version`。
1. 同步修改 `.claude-plugin/marketplace.json` 中对应插件条目的 `version`。
1. 本地用 `claude --plugin-dir ./plugins/<plugin-name>` 验证。

### 新增独立插件

1. 新建 `plugins/<plugin-name>/.claude-plugin/plugin.json`。
1. 新建 `plugins/<plugin-name>/skills/<skill-name>/SKILL.md`。
1. 在 `.claude-plugin/marketplace.json` 的 `plugins` 数组中新增插件条目。
1. 执行 `claude plugin validate ./plugins/<plugin-name>` 校验。

## 发布更新

推送到 GitLab 后，已添加该 marketplace 的用户可以执行：

```text
/plugin marketplace update front-skills-market
/plugin update seo-tool@front-skills-market
/plugin update ui-or-prd-tool@front-skills-market
/plugin update api-tool@front-skills-market
/reload-plugins
```

## 说明

- 这是 Claude Code 插件/市场结构，不是网页形式的“插件市场”。
- Skill 作为插件安装后会自动带命名空间，避免和其他插件或项目本地 Skill 冲突。
- `ui-or-prd-tool` 同时承载 UI 设计稿工作流和 PRD/蓝湖需求获取工作流。
- 拆成 `seo-tool`、`ui-or-prd-tool`、`api-tool` 后，用户可以按需安装，而不是一次安装全部前端 Skill。
