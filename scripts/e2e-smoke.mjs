// E2E 冒烟：手机视口跑完整 10 题，逐题验证图片 naturalWidth>0，截图各关键界面
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
page.on('requestfailed', (r) => failed.push(`FAIL ${r.url()} ${r.failure()?.errorText}`));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/01-home.png' });

await page.click('.btn-primary');
let imgReport = [];
for (let i = 0; i < 10; i++) {
  await page.waitForSelector('.photo-card img', { timeout: 8000 });
  // 等图片真实加载
  const ok = await page.waitForFunction(
    () => { const img = document.querySelector('.photo-card img'); return img && img.complete && img.naturalWidth > 0; },
    { timeout: 8000 }
  ).then(() => true).catch(() => false);
  const info = await page.evaluate(() => {
    const img = document.querySelector('.photo-card img');
    return { src: img?.getAttribute('src'), w: img?.naturalWidth ?? 0 };
  });
  imgReport.push(`Q${i + 1}: ${ok ? '✅' : '❌'} ${info.w}px ${info.src}`);
  if (i === 1) await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/02-quiz.png' });
  // 选第一个选项
  await page.click('.options .option');
  if (i === 1) { await new Promise(r => setTimeout(r, 400)); await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/03-feedback.png' }); }
  // 等翻题/结束
  await new Promise((r) => setTimeout(r, 1900));
}
await page.waitForSelector('.hero-card', { timeout: 8000 });
await new Promise((r) => setTimeout(r, 1300));
await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/04-result.png' });
await page.evaluate(() => document.querySelector('.brand-card')?.scrollIntoView());
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/05-brand.png' });
// 生成战报
await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector(".actions .btn-primary")?.click(); });
await page.click('.actions .btn-primary').catch(() => {});
await page.waitForSelector('.poster-box img', { timeout: 8000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/claude-b/.claude/jobs/85fefdb9/tmp/06-poster.png' });

console.log(imgReport.join('\n'));
console.log('HTTP failures:', failed.length ? failed.join('\n') : 'none');
await browser.close();
