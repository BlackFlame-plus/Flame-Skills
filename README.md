# Front Skills

面向 Claude Code 的前端工作流 Skill 插件市场，结构对齐 Claude Code 官方插件仓库/市场规范。

安装后 Skill 会以插件命名空间暴露：

- `/front-skills:seo-framework`
- `/front-skills:apifox-api-methods`
- `/front-skills:figma-ui-workflow`

## 仓库结构

```text
front-skills/
  ├── .claude-plugin/
  │   └── marketplace.json              # 市场目录，用户添加 marketplace 后从这里发现插件
  └── plugins/
      └── front-skills/
          ├── .claude-plugin/
          │   └── plugin.json           # 插件元数据
          └── skills/
              ├── seo-framework/
              │   └── SKILL.md
              ├── apifox-api-methods/
              │   └── SKILL.md
              └── figma-ui-workflow/
                  └── SKILL.md
```

## 安装方式

### 方式一：从 GitLab 市场安装

先添加市场：

```text
/plugin marketplace add https://gitlab.jctrans.net.cn/liuzhengri/front-skills.git
```

再安装插件：

```text
/plugin install front-skills@front-skills-market
```

安装后执行：

```text
/reload-plugins
```

然后即可使用：

```text
/front-skills:seo-framework
/front-skills:apifox-api-methods
/front-skills:figma-ui-workflow
```

### 方式二：本地开发测试

在本仓库根目录运行 Claude Code：

```bash
claude --plugin-dir ./plugins/front-skills
```

进入 Claude Code 后测试：

```text
/front-skills:seo-framework
```

### 方式三：本地市场测试

如果还没推送到 GitLab，可以从本地路径添加市场：

```text
/plugin marketplace add D:/jcCode/AI_project/front-skills
/plugin install front-skills@front-skills-market
```

## 已包含 Skills

| Skill | 用途 |
| --- | --- |
| `seo-framework` | SEO metadata、可爬链接、H1、NuxtImg、alt、分页、canonical、结构化数据等 SEO 逻辑实现/审查。 |
| `apifox-api-methods` | 从 Apifox MCP 的接口定义生成前端 API 方法、TypeScript 类型、mock 数据。 |
| `figma-ui-workflow` | Figma 设计稿获取、UI 实现、视觉验证、Playwright 自查工作流。 |

## 添加新的 Skill

1. 在 `plugins/front-skills/skills/<skill-name>/SKILL.md` 新增 Skill。
1. 确保 `SKILL.md` 包含 `description` frontmatter。
1. 修改 `plugins/front-skills/.claude-plugin/plugin.json` 的 `version`。
1. 如果需要控制市场版本，也修改 `.claude-plugin/marketplace.json` 中插件条目的 `version`。
1. 本地用 `claude --plugin-dir ./plugins/front-skills` 验证。

## 发布更新

推送到 GitLab 后，已添加该 marketplace 的用户可以执行：

```text
/plugin marketplace update front-skills-market
/plugin update front-skills@front-skills-market
/reload-plugins
```

## 说明

- 这是 Claude Code 插件/市场结构，不再是网页形式的“插件市场”。
- Skill 作为插件安装后会自动带命名空间，避免和其他插件或项目本地 Skill 冲突。
- 相比直接复制 `.claude/skills`，这种结构更适合团队共享、版本管理和统一安装。
