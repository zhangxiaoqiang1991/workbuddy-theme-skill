---
name: workbuddy-theme-skill
description: |
  为腾讯 WorkBuddy 生成、应用、验证、导出和恢复可逆的定制皮肤。用户提到 WorkBuddy 皮肤、主题、美化、暗色模式、界面配色、参考图换肤、用 Codex 修改 WorkBuddy，或要求恢复原生界面时使用。Apply, create, verify, package, and restore reversible WorkBuddy themes through CodeDrobe Core.
---

# WorkBuddy Theme Skill

通过 CodeDrobe Core 在本机 CDP 连接中注入声明式 CSS。保留官方 WorkBuddy 安装包、账号、任务和用户数据。

## ① 安装方式 + 支持工具

安装：

```bash
npx skills add zhangxiaoqiang1991/workbuddy-theme-skill --global
```

要求 Node.js 22.4 或更高版本。主题目标仅为腾讯 WorkBuddy。推荐从 Codex 调用本 Skill，也可由兼容 Agent Skills 目录规范的工具调用。

## ② 底层逻辑

> 把皮肤做成可验证、可恢复的数据包，不修改 WorkBuddy 本体。

调用固定版本 `@codedrobe/core@0.2.0`，通过绑定到 `127.0.0.1` 的 Chromium DevTools Protocol 注入 `.codedrobe-theme`。主题只包含 CSS、配置和可选的本地图片，不执行主题 JavaScript。

## ③ 具体怎么做

### Phase 1：判断任务

- 用户要直接换肤：默认使用 `focus-night`，除非用户指定其他主题。
- 用户给出颜色、情绪或参考图：先读取 `references/theme-contract.md`，再创建新主题。
- 用户要检查当前主题：运行 `probe` 或 `verify`。
- 用户要恢复：立即运行 `restore`，不要改动其他 WorkBuddy 设置。

### Phase 2：检查环境

```bash
node scripts/workbuddy-theme.mjs doctor
```

如果 WorkBuddy 已在其他 CDP 端口运行，读取进程参数中的端口，并在后续命令中传入 `--port <port> --no-launch`。如果 WorkBuddy 正在运行但没有 CDP，停止并请求用户明确授权后，才使用 `--restart-existing`。

### Phase 3：应用成品主题

```bash
node scripts/workbuddy-theme.mjs list
node scripts/workbuddy-theme.mjs apply focus-night
```

当前内置：

- `focus-night`：低干扰深色专注主题。
- `warm-paper`：暖纸张与墨色主题。
- `cyber-lobster`：珊瑚红与青色的赛博主题。

需要持续覆盖页面重载时才增加 `--watch`。该命令会保持前台运行。

### Phase 4：创建定制主题

1. 复制最接近的 `themes/<id>/` 目录。
2. 使用小写 kebab-case 主题 ID。
3. 只编辑 `theme.json` 和 `workbuddy.css`。
4. 将所有 CSS 选择器限制在 `html.codedrobe-host-workbuddy` 下。
5. 每次视觉变化都增加主题版本。
6. 执行打包和检查：

```bash
node scripts/workbuddy-theme.mjs pack <id>
node scripts/workbuddy-theme.mjs inspect <id>
```

如果需要配图，只使用用户提供或已确认授权的本地图片。不要上传私人参考图到未获批准的服务。

### Phase 5：验证并截图

```bash
node scripts/workbuddy-theme.mjs verify focus-night --screenshot /absolute/workbuddy-theme.png
```

检查侧边栏、主工作区、输入框、任务页和产物页。将主题缺失、横向溢出或必要 DOM 地标缺失视为失败。静态打包成功不等于视觉验证成功。

### Phase 6：恢复原生界面

```bash
node scripts/workbuddy-theme.mjs restore
```

测试性质的临时注入在检查完成后恢复。用户明确要求保留主题时才保持当前注入。

## ④ 注意事项

- 不修改、替换、重签名或接管 WorkBuddy 的 `app.asar` 和安装目录。
- 不在用户未授权时关闭或重启正在运行的 WorkBuddy。
- 不隐藏导航、按钮、输入框、任务列表和产物入口。
- 装饰层必须使用 `pointer-events: none`。
- 不在 CSS 中使用外部 `url(...)`、`@import`、远程字体、追踪像素或脚本。
- 把主题包当作不可信输入，打包后必须执行 `inspect`。
- macOS WorkBuddy 5.2.6 已验证。Windows 仅作为实验性入口，实机验证前不要宣称正式支持。
- CodeDrobe 默认端口为 `9336`。使用非默认端口时，在应用、验证和恢复命令中保持一致。

## ⑤ 案例展示

用户说：

> 把 WorkBuddy 改成深色专注风格，保留所有按钮，完成后给我截图。

执行：

```bash
node scripts/workbuddy-theme.mjs apply focus-night
node scripts/workbuddy-theme.mjs verify focus-night --screenshot /absolute/focus-night.png
```

用户说：

> 参考这张品牌图做一套 WorkBuddy 主题，但不要改官方安装包。

先读取 `references/theme-contract.md`，从现有主题复制并调整配色，打包、应用、截图验证，再根据截图迭代。

## 反馈 & 帮助迭代

欢迎在 [Issues](https://github.com/zhangxiaoqiang1991/workbuddy-theme-skill/issues) 页面提交反馈，或直接联系作者。

## 关于我

**大厂转型人强哥**（全网同名）

河北邯郸人，曾武汉求学，现居北京。曾就职腾讯、字节跳动。目前负责 AI + 内容增长、产品运营。关注以下三方面的机会，欢迎交流 / 围观朋友圈：

- **AI 内容运营**：从战略、策略到执行的内容增长
- **AI 培训 / 布道**：帮团队真正用好 AI，不只是上个课
- **AI 内部提效**：搭建工具流，把 AI 落地到业务流程里

**联系方式与链接：**

- 微信：`qianggegood123`（有对应付费社群和咨询服务，若感兴趣私聊即可）
- 小红书：[强哥 @andyxqzhang](https://www.xiaohongshu.com/user/profile/617395d8000000001f0362a3)
- Twitter：[@andyxqzhang001](https://x.com/andyxqzhang001)

---

## 语言

- 用户用中文就用中文回复，用英文就用英文回复。
- 先给结论，再说明验证结果和仍待确认的兼容性。
