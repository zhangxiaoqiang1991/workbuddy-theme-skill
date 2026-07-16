# WorkBuddy 主题契约

创建或修改主题时读取本文件。运行时固定使用 `@codedrobe/core@0.2.0` 和 `.codedrobe-theme` schema 1。

## 目录与清单

每套主题放在 `themes/<id>/`：

```text
themes/<id>/
├── theme.json
└── workbuddy.css
```

清单最小结构：

```json
{
  "schemaVersion": 1,
  "id": "theme-id",
  "displayName": "Theme Name",
  "version": "1.0.0",
  "targets": {
    "workbuddy": {
      "css": "workbuddy.css",
      "verification": {
        "required": [
          { "name": "workbuddy-shell", "any": [".teams-container", "#root"] }
        ]
      }
    }
  }
}
```

## 稳定地标

WorkBuddy 5.2.6 macOS 已验证以下地标：

- 根节点：`#root > .teams-container`、`.teams-container`、`#root`
- 侧边栏：`.conversation-sidebar`、`.conversation-list`
- 工作区：`.teams-main-content`、`.main-content`、`.chat-container`
- 输入框：`[role='textbox'][contenteditable='true']`、`.wb-home-composer [contenteditable='true']`

优先使用这些地标。把页面功能特有的选择器放进主题清单的 `verification`，不要塞进通用运行时。

## CSS 约束

1. 将每个选择器限制在 `html.codedrobe-host-workbuddy` 下。
2. 使用少量主题变量控制背景、面板、边框、文字、弱文字和强调色。
3. 保留真实控件。不要使用整窗截图覆盖原生界面。
4. 装饰伪元素使用 `pointer-events: none`，并放在真实控件下方。
5. 不使用 `@import`、远程 `url(...)`、远程字体或可执行内容。
6. 不依赖中文或英文文案属性选择器。
7. 不依赖 `:nth-child`、深层 `>` 链或构建产物生成的哈希类名。
8. 不在主题包中写入账号、任务、路径、API Key 和用户数据。
9. 公开明星氛围主题只表达原创色彩与舞台氛围，不使用真实姓名、肖像、声纹、粉丝标识或隐性指向性素材。
10. 公开二次元主题必须是原创审美，不使用现成动漫名称、角色、Logo、截图或官方素材。

## 配图

如需配图，在 `theme.json` 顶层增加：

```json
{
  "art": "art.webp"
}
```

打包后图片会成为 `--codedrobe-art`。在 CSS 中使用：

```css
html.codedrobe-host-workbuddy .teams-main-content {
  background-image: linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), var(--codedrobe-art);
}
```

只使用本地且授权明确的 PNG、JPEG、WebP 或 GIF。公开发布前确认素材许可。用户的私人参考图或个人定制素材默认不纳入公开包。

## 版本与验证

- 每次可见变化都增加 `version`。
- 打包：`node scripts/workbuddy-theme.mjs pack <id>`。
- 检查：`node scripts/workbuddy-theme.mjs inspect <id>`。
- 应用：`node scripts/workbuddy-theme.mjs apply <id>`。
- 验证：`node scripts/workbuddy-theme.mjs verify <id> --screenshot /absolute/theme.png`。
- 恢复：`node scripts/workbuddy-theme.mjs restore`。

如果 WorkBuddy 已使用其他调试端口，在每条运行时命令中传入同一个 `--port`。如果当前进程未启用 CDP，不得静默重启。
