---
name: workbuddy-skin-skill
description: |
  在腾讯 WorkBuddy 内生成、应用、验证、导出和恢复可逆的定制 Skin。当用户提到 WorkBuddy Skin、皮肤、美化、暗色模式、界面配色、上传图片换肤、明星图片定制、二次元风格、联网搜索灵感或恢复原生界面时使用。
agent_created: true
---

# WorkBuddy Skin Skill

在 WorkBuddy 内部运行本 Skill。通过 CodeDrobe Core 的本机 CDP 连接注入声明式 CSS，不修改 WorkBuddy 安装包、签名、账号、任务和用户数据。不要建议用户转到 Codex 安装或使用。

## 1. 判断任务

- 直接换肤：使用用户指定的内置 Skin；未指定时使用 `focus-night`。
- 上传图片或要求明星/二次元定制：读取 `references/image-customization.md` 和 `references/skin-contract.md`，完成图片分析、联网研究、生成、应用与截图验证，不只给建议。
- 检查 Skin：运行 `probe` 或 `verify`。
- 恢复：立即运行 `restore`，不改动其他 WorkBuddy 设置。

## 2. 检查环境

```bash
node scripts/workbuddy-skin.mjs doctor
```

如果 WorkBuddy 已使用其他 CDP 端口，从进程参数读取端口，并在后续命令传入 `--port <port> --no-launch`。如果 WorkBuddy 正在运行但没有开放 CDP，说明需要一次重启，获得用户授权后才使用 `--restart-existing`。

## 3. 使用内置 Skin

```bash
node scripts/workbuddy-skin.mjs list
node scripts/workbuddy-skin.mjs apply focus-night
```

内置 10 套：

- 基础：`focus-night`、`warm-paper`、`cyber-lobster`。
- 明星舞台氛围：`stage-aurora`、`rose-glam`、`silver-idol`。
- 原创二次元氛围：`sakura-dream`、`mecha-core`、`magical-night`、`pixel-campus`。

只在需要持续覆盖页面重载时增加 `--watch`。

## 4. 上传图片与联网定制

1. 在本地读取用户上传的图片，提取主色、光线、材质、抽象母题、构图和可读性线索。
2. 不根据人脸推断或确认人物身份。使用用户提供的姓名、作品名或文字线索搜索公开资料；没有身份线索时只搜索通用视觉风格。
3. 优先官方工作室、官方活动页和品牌发布页，保留 2–4 个来源链接。不上传私人参考图进行反向搜索，不默认下载搜索结果中的图片。
4. 选择最接近的内置 Skin，创建默认私有版：

```bash
node scripts/workbuddy-skin.mjs scaffold <new-id> \
  --from <base-id> \
  --name "<display name>" \
  --art "/absolute/path/to/uploaded-image.jpg"
```

5. 如果用户只要风格、不要照片背景，省略 `--art`。编辑 `local-themes/<id>/workbuddy.css`，使用 `var(--codedrobe-art)` 引用包内图片，叠加蒙版保证文字可读。
6. 将真人照片和私人定制包留在已被 Git 忽略的 `local-themes/` 和 `local-dist/`。用户要求公开分享时，先确认素材权利；无法确认时只发布原创配色版。

## 5. 打包、检查与验证

```bash
node scripts/workbuddy-skin.mjs pack <id>
node scripts/workbuddy-skin.mjs inspect <id>
node scripts/workbuddy-skin.mjs apply <id>
node scripts/workbuddy-skin.mjs verify <id> --screenshot /absolute/workbuddy-skin.png
```

检查侧边栏、主工作区、输入框、任务页和产物页。将必要 DOM 地标缺失、文字难读、主体被遮挡或横向溢出视为失败。静态打包成功不等于视觉验证成功。

## 6. 恢复

```bash
node scripts/workbuddy-skin.mjs restore
```

验证失败或用户要求恢复时立即执行。用户明确要保留 Skin 时才保持当前注入。

## 7. 安全与原创边界

- 不修改、替换、重签名或接管 WorkBuddy 的 `app.asar` 和安装目录。
- 不隐藏导航、按钮、输入框、任务列表和产物入口。装饰层使用 `pointer-events: none`。
- 不在 CSS 中使用外部 `url(...)`、`@import`、远程字体、追踪像素或脚本。打包后必须执行 `inspect`。
- 公开明星氛围 Skin 不使用真实肖像、声纹、粉丝标识或官方 Logo。公开二次元 Skin 不使用现成角色、截图或官方素材。
- macOS WorkBuddy 5.2.6 已验证。Windows 只标记为实验性支持。

## 致谢与上游边界

保留上游来源：底层 CDP 注入机制、WorkBuddy 适配器和 `.codedrobe-theme` 技术格式来自 [CodeDrobe Core](https://github.com/CodeDrobe/core)，原作者为 [Alone88（@anhao）](https://github.com/anhao)，上游使用 Apache-2.0 协议。

将本项目描述为 CodeDrobe 的 WorkBuddy Skin 场景扩展，不宣称重新发明其运行时。对外发布衍生版本时继续保留上游作者、仓库和许可证信息。

## 语言

- 用户用中文就用中文回复，用英文就用英文回复。
- 先给结论，再说明验证结果、联网来源和仍待确认的兼容性。
