# 球迷含金量检测 ⚽ — 世界杯球星认脸测试 H5

匠人学院世界杯营销 H5：看球星照片选中文名，10 题出分 + 称号 + 朋友圈分享图。**独立 repo、独立托管，与 jiangren.com.au 主站基础设施完全隔离**——流量再大也冲不垮主站。

> 产品 PRD（单一真相）：主 repo `jr-academy-ai/docs/prd/WORLDCUP_FAN_QUIZ_PRD.md`（挂 Chorus 看板）。视觉规范：本 repo [`DESIGN.md`](./DESIGN.md)。

## 架构（为"流量出事"而设计）

```
用户（微信内 H5 / 浏览器）
   │
   ▼
静态托管 CDN（GitHub Pages / S3+CloudFront 二选一）
   │  纯静态文件：HTML + JS + 题库 JSON + WebP 图片
   ▼
无后端、无数据库、无登录 —— 没有可以被打挂的东西
```

- **纯静态 SPA**：Vite + React + TypeScript + styled-components + framer-motion（禁 MUI/antd，沿用主站规范）。抽题、计分、称号、canvas 分享图全在浏览器本地完成。
- **托管**：构建产物是一坨静态文件，扔哪个 CDN 都行。MVP 走 GitHub Pages（免费 + 全球 CDN，jr-ebooks 同款链路）；如要自定义域名，DNS 加一条 `quiz.jiangren.com.au` CNAME 即可——只动 DNS，不碰主站 EC2/Nginx 任何配置。
- **「打败 xx% 的人」**：MVP 用预埋分布曲线（正态 μ≈5.5）估算，零后端。P1 如要真实分位，加一个独立 Cloudflare Worker + KV 计数器，依然不碰主站。
- **品牌资产 vendored**：`styles/jr-tokens.css` + `public/brand/` 从 `jr-academy-brand` v4.2 拷贝快照（SoT 仍在 brand repo，更新时重新拷贝）。

## 目录

```
data/roster.mjs        球星主名单 source of truth（256 人，全部为 2026 世界杯 26 人大名单在册球员）
data/players.json      生成物：题库（中文名/国家/难度/era + 图片 license/attribution 四件套）
public/players/        球星照片（Wikipedia/Wikimedia Commons，全部 CC/公有领域）
public/brand/          JR logo（jr-box.svg / logo-zh-full.svg / logo-zh-white.png）
styles/jr-tokens.css   品牌 token 快照（--jr-*）
scripts/fetch-players.mjs    增量抓取（node scripts/fetch-players.mjs [--shard k/n]）
scripts/process-images.mjs   （待建）裁 1:1 头像 + 压 WebP ≤100KB
src/                   （待建）Vite SPA
```

## 题库数据

- **256 人，只收 2026 世界杯最终 26 人大名单在册球员**（对照 Wikipedia 2026 FIFA World Cup squads 逐队核对，2026-06-12），覆盖 38 个参赛国（强队 9-13 人、小队收当家球星；其余 10 个首晋小国无华人认知度球员，未收）。
- 没晋级的不收（意大利/波兰/丹麦/尼日利亚……）、晋级但落选的不收（格列兹曼/福登/苏亚雷斯/三笘薰……）、退役传奇不收。
- 难度 1-3（现存 8/44/204）：1 = 不看球也认识（出 3 题），2 = 看球的认识（4 题），3 = 真球迷才认识（3 题）。
- 每条记录带 `license` / `artist` / `commonsPage`，结果页底部「图片来源」折叠页展示 attribution（CC 合规要求）。

## 玩法补一句

干扰项 = 近音梗（内马尔→马内尔）+ 真实球员名混合；注意题库里真有「马内」（塞内加尔），跟「内马尔」是天然的官方梗，出题时优先利用真名互为干扰项。

## 开发

```bash
node scripts/fetch-players.mjs          # 增量抓新加的球员（roster 里加人后跑）
npm run dev                              # （待建）本地开发
npm run build                            # （待建）构建静态产物 → dist/
```

## 合规红线（动手前必读）

1. 图片只用 Commons CC/公有领域，attribution 不可删。
2. 不暗示球员代言：分享图上球星照片与品牌广告区不同框。
3. 不用 FIFA / World Cup 官方 logo、奖杯、吉祥物图形，文案泛指「世界杯」。
4. 谐音梗不玩侮辱/国籍/种族梗。
