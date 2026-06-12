// 生成微信分享缩略图 share-thumb.png（500×500）——用品牌 token 渲染后截图
import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${path.join(ROOT, 'styles/jr-tokens.css')}">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 500px; height: 500px; overflow: hidden; }
  .thumb {
    width: 500px; height: 500px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    font-family: var(--jr-font-sans);
    background:
      radial-gradient(360px 220px at 50% -60px, var(--jr-wash-green), transparent 75%),
      radial-gradient(300px 260px at 100% 100%, var(--jr-wash-yellow), transparent 70%),
      var(--jr-surface-canvas);
    border-top: 10px solid var(--jr-green);
    position: relative;
  }
  .ball { font-size: 120px; line-height: 1; filter: drop-shadow(0 14px 16px rgba(13,15,18,0.2)); }
  h1 { font-size: 54px; font-weight: 800; color: var(--jr-black); letter-spacing: 2px; }
  h1 b {
    background: linear-gradient(160deg, var(--jr-yellow) 20%, color-mix(in srgb, var(--jr-yellow), var(--jr-red) 45%));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .sub { font-size: 24px; color: var(--jr-neutral-600); font-weight: 500; }
  .brand { position: absolute; bottom: 26px; display: flex; align-items: center; gap: 10px; }
  .brand img.box { width: 34px; height: 34px; }
  .brand img.tag { height: 22px; }
</style></head><body>
<div class="thumb">
  <div class="ball">⚽</div>
  <h1>球迷<b>含金量</b>检测</h1>
  <div class="sub">你是纯金球迷，还是纯黄铜？</div>
  <div class="brand">
    <img class="box" src="file://${path.join(ROOT, 'public/brand/jr-box.svg')}">
    <img class="tag" src="file://${path.join(ROOT, 'public/brand/tagline-xueai-laijiangren.png')}">
  </div>
</div></body></html>`;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: path.join(ROOT, 'public/share-thumb.png'), clip: { x: 0, y: 0, width: 500, height: 500 } });
await browser.close();
console.log('✅ public/share-thumb.png');
