# 球迷含金量检测 — 设计风格规范

> 基于 jr-academy-brand v4.2 token（唯一视觉 SoT，本 repo vendored 快照 `styles/jr-tokens.css`），世界杯氛围 = 既有 token 的受控组合，**不新造任何 hex**。所有色值/圆角/字号引用 `--jr-*` 变量。

## 1. 整体气质

**「品牌底盘 + 球场氛围」**：暖白底匠人风为骨架，绿色（`--jr-green`，品牌 Success 色兼任"草坪绿"）只做氛围点缀——记分、正确反馈、球场元素。娱乐感来自**文案、emoji、动效**，不来自乱加颜色。一眼看上去先是"匠人学院出品"，再是"世界杯小游戏"。

## 2. 配色规则

| 角色 | Token | 用法 |
|------|-------|------|
| 页面底 | `--jr-surface-canvas` | 全局背景，暖白 |
| 卡片/题卡 | `--jr-surface-panel` + `--jr-border-warm` 1px 边 | 题目卡、选项卡、结果卡 |
| 主 CTA | `--jr-black`（`--jr-button-primary-bg`） | 「开始鉴定」「生成战报」——黑底白字，唯一主按钮 |
| 草坪绿 | `--jr-green` / 浅底 `--jr-wash-green` | 答对反馈 ✅、进度点、得分数字、球场装饰线 |
| 红 | `--jr-red` / 浅底 `--jr-wash-red` | 答错反馈 ❌、题号编号、「假球迷」称号强调——**绝不做大块背景或按钮** |
| 黄 | `--jr-yellow` / `--jr-wash-yellow` | 成就/称号徽章（「球王转世」皇冠位） |
| 紫 | `--jr-purple` / chip 套装 `--jr-chip-ai-*` | 只用于品牌区「AI 一晚做出这个测试」的 AI tag |
| 正文 | `--jr-neutral-900` / 次级 `--jr-neutral-600` | 文字两档，不再加灰阶 |

**禁**：冷灰蓝底（#F7F8FC 类）、紫/蓝当 CTA、红色大面积铺底、任何写死 hex。

## 3. 字体与字号

全站 `--jr-font-sans`（Inter + 思源黑体）。

| 场景 | 规格 |
|------|------|
| 首页大标题「假球迷鉴定器」 | `--jr-fs-h1` 32px Bold + emoji ⚽ |
| 题干「这位是谁？」/ 结果称号 | `--jr-fs-h2` 24px Bold；分享图上的称号可放大到 40px（图内不受网页字阶约束） |
| 选项文字（中文名） | `--jr-fs-h3` 18px Semibold——选项是核心交互，必须比正文大 |
| 正文/反馈文案 | `--jr-fs-body-1` 14px |
| 题号 / 来源署名 | `--jr-fs-caption` 12px |
| 得分数字（结果页） | `--jr-font-mono` 大号，绿色，营造"计分牌"感 |

## 4. 关键界面

### 首页
- 居中竖排：⚽ emoji 大图标 → H1「球迷含金量检测」→ 挑衅文案一句（"测测你的球迷含金量还剩多少"，`--jr-neutral-600`）→ 黑色主 CTA「开始检测」→ 底部小字「已有 xxxx 人接受检测」
- 顶部细条草坪绿装饰线（4px `--jr-green`），全页唯一大胆的绿。

### 答题页
- 顶部：进度条 10 格（已答=绿点，当前=黑点，未答=`--jr-neutral-300`）+ 红色题号 `Q3`（红只在这）。
- 球星照片：1:1 裁切，`--jr-radius-lg` 16px 大圆角面板，`--jr-shadow-panel`。
- 4 个选项：竖排按钮卡，`--jr-surface-panel` + `--jr-border-warm` 边 + `--jr-radius-sm` 8px，文字 18px 居中。
- 反馈态：答对 → 选项变 `--jr-wash-green` 底 + `--jr-green` 边 + ✅；答错 → 所选项 `--jr-wash-red` + ❌，正确项同时亮绿。停留 800ms 自动下一题。

### 结果页
- 上半：称号徽章（`--jr-wash-yellow` 圆形底 + emoji）→ 称号 H2 → **含金量大数字 `72%`**（mono 绿，按难度加权：难题答对加得多）→「打败了全国 xx% 的球迷」。
- 中部：错题回顾横滑小卡（错的脸 + 正确中文名）。
- 品牌区（与题目区明确分隔，见 PRD 合规要求）：`jr-box.svg` logo + 「学 AI 来匠人」+ AI chip「🤖 这个测试是 AI 一晚上做的」+ 黑色 CTA「我也想学 →」。
- 主 CTA：「生成我的球迷战报」（黑），次按钮「再测一次」（白底黑边 ghost）。

### 分享图（canvas 海报，9:16 适配朋友圈）
- 结构从上到下：称号 emoji + 大字称号 → 得分计分牌 → 3 张本局球星小头像拼条 → 「你也来测：扫码鉴定真假球迷」+ 二维码 → 底部品牌条（`logo-zh-full.svg` + jiangren.com.au）。
- 底色 `--jr-surface-canvas`，品牌条 `--jr-black` 底白字。**球星头像与品牌条之间留 ≥ 32px 空隙，不同框**（肖像权红线）。

## 5. 组件与圆角

- 大面板/照片卡 16px（`--jr-radius-lg`）；按钮/选项/输入 8px（`--jr-radius-sm`）；徽章圆形 `--jr-radius-full`。
- 阴影只用 `--jr-shadow-panel` / `--jr-shadow-md`，**禁** neo-brutalism 黑粗边 offset 阴影。
- Icon 一律 lucide 风格内联 SVG，24px / stroke 2（`--jr-icon-*`）。

## 6. 动效（framer-motion）

| 场景 | 动效 |
|------|------|
| 翻题 | 卡片水平滑出/滑入，`--jr-dur-base` 200ms `--jr-ease-standard` |
| 答对 | 选项卡 spring 微弹（`--jr-ease-spring`）+ 绿点进度 +1 |
| 答错 | 选项卡水平 shake 一次（120ms），不放音效 |
| 结果揭晓 | 称号徽章 scale 0.6→1 spring 入场，得分数字滚动跳到终值 |
| 彩蛋 | 满分时绿+黄 confetti 一次（纯 CSS/canvas，不引重库） |

## 7. Logo 红线（照抄 brand 规范）

- 只用 `public/brand/` 下的三件（从 jr-academy-brand 拷贝的快照）：页面品牌区用 `jr-box.svg`，分享图品牌条用 `logo-zh-full.svg`（深色条上用 `logo-zh-white.png`）。
- ❌ 拉伸/变形/加 glow ❌ 红底放红 logo ❌ 从旧页面复制 logo 路径。

## 8. 移动优先

- 设计基准 `--jr-w-mobile` 375px，单列流式；微信内打开为主场景。
- 选项按钮高度 ≥ 52px（拇指热区），主 CTA 距底部安全区 ≥ 24px。
- 桌面端只做居中 480px 容器 + 两侧留白，不做桌面专属布局。
