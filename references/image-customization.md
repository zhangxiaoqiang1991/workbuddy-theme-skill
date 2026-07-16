# 上传图片定制 Skin

用户上传明星照片、舞台照、二次元图片或其他参考图时读取本文件。

## 1. 默认模式

- 将上传图片作为本地视觉参考，不上传到搜索引擎，不执行反向搜图。
- 不通过人脸推断或确认人物身份。如需与某位明星的公开风格关联，使用用户提供的姓名、作品名或其他文字线索。
- 将含真人照片的 Skin 创建到 `local-themes/`，打包到 `local-dist/`。两个目录均被 Git 忽略。
- 只有用户要求分享或公开时，才进行素材权利确认。无法确认时去除照片，只保留原创配色和抽象氛围。

## 2. 生成视觉要素卡

先在内部整理一张要素卡，再写 CSS：

```text
明暗基调：dark / light
主色：3 个 HEX
辅助色：2 个 HEX
光线：聚光 / 霓虹 / 柔光 / 逆光 / 扁平
材质：金属 / 丝绒 / 玻璃 / 纸张 / 像素等
抽象母题：2–4 个，不使用肖像或 Logo 代替 UI
界面强调：侧边栏 / 卡片 / 输入框 / 按钮
可读性：正文、弱文字和边框的对比方案
避免：人物身份推断、未授权第三方图片、粉丝标识、官方 Logo
```

只提取完成 Skin 所需的视觉信息，不推断年龄、种族、健康、性取向等敏感属性。

## 3. 联网研究

1. 有人物姓名或作品线索时，搜索官方工作室、官方活动页、品牌发布页等公开来源。
2. 没有身份线索时，根据要素卡搜索通用舞台、配色、灯光或界面设计参考，不尝试“找到图中的人”。
3. 使用 2–4 个可追溯来源，只吸收风格事实和设计线索；不默认下载搜索结果中的图片。
4. 在最终回复中附上来源链接。联网不可用时，明确标记并继续完成图片风格提取，不伪造研究结果。

## 4. 选择基础 Skin

| 上传图特征 | 基础 Skin |
|---|---|
| 紫青霓虹、舞台聚光 | `stage-aurora` |
| 酒红、玫瑰、香槟金 | `rose-glam` |
| 银白、冰蓝、淡紫 | `silver-idol` |
| 粉白、柔光、治愈 | `sakura-dream` |
| 机械、金属、橙青强对比 | `mecha-core` |
| 深蓝、星光、魔法感 | `magical-night` |
| 天空蓝、明黄、像素感 | `pixel-campus` |
| 其他深色 | `focus-night` |
| 其他浅色 | `warm-paper` |

## 5. 创建与配图

创建私有 Skin：

```bash
node scripts/workbuddy-skin.mjs scaffold <new-id> \
  --from <base-id> \
  --name "<display name>" \
  --art "/absolute/path/to/uploaded-image.jpg"
```

不需要将照片放入 Skin 时省略 `--art`。需要使用照片时，在工作区背景中叠加深浅蒙版，保证文字可读：

```css
html.codedrobe-host-workbuddy .teams-main-content {
  background-image:
    linear-gradient(rgba(10, 12, 22, 0.52), rgba(10, 12, 22, 0.74)),
    var(--codedrobe-art) !important;
  background-position: center !important;
  background-size: cover !important;
}
```

根据构图调整 `background-position`，避免主体被输入框或面板遮挡。不用整张截图覆盖功能 UI。

## 6. 验证

```bash
node scripts/workbuddy-skin.mjs pack <new-id>
node scripts/workbuddy-skin.mjs inspect <new-id>
node scripts/workbuddy-skin.mjs apply <new-id>
node scripts/workbuddy-skin.mjs verify <new-id> --screenshot /absolute/skin.png
```

检查主体位置、人脸是否被输入框遮挡、文字对比度、功能入口和横向溢出。验证失败或用户不要保留时执行 `restore`。
