// E2E 冒烟（手机视口）：跑完整 15 题，逐题验证图片加载 + 干扰项不是「字序打乱」，
// 结果页验证签名弹窗可输入、跳过、改名，百分位在 1-99，最后生成战报。
import puppeteer from 'puppeteer-core';

const SHOT = '/tmp/claude-b/.claude/jobs/85fefdb9/tmp';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

// 埋点 beacon 指向 prod api，其 CORS 白名单只含 quiz.jiangren.com.au/github.io，
// 本地 localhost 源必然被挡——这是设计内的跨域失败，不计入测试失败。
const ignore = (u) => u.includes('/worldcup-quiz/events');
const failed = [];
page.on('response', (r) => { if (r.status() >= 400 && !ignore(r.url())) failed.push(`${r.status()} ${r.url()}`); });
page.on('requestfailed', (r) => { if (!ignore(r.url())) failed.push(`FAIL ${r.url()} ${r.failure()?.errorText}`); });

const assert = [];
const ok = (cond, msg) => assert.push(`${cond ? '✅' : '❌'} ${msg}`);
// 把名字归一化成「字符多重集」用于判断是否为纯乱序（忽略 · 和拉丁字母如 C罗 的 C）
const bag = (s) => [...s.replace(/[·\sA-Za-z]/g, '')].sort().join('');

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${SHOT}/01-home.png` });

await page.click('.btn-primary');
const imgReport = [];
let anagramHits = 0;
for (let i = 0; i < 15; i++) {
  await page.waitForSelector('.photo-card img', { timeout: 8000 });
  const imgOk = await page.waitForFunction(
    () => { const img = document.querySelector('.photo-card img'); return img && img.complete && img.naturalWidth > 0; },
    { timeout: 8000 }
  ).then(() => true).catch(() => false);
  const opts = await page.$$eval('.options .opt-name', (els) => els.map((e) => e.textContent.trim()));
  await page.click('.options .option'); // 选第一个，触发判定后能读到 .right = 正确答案
  await page.waitForSelector('.option.right .opt-name', { timeout: 4000 });
  const correct = await page.$eval('.option.right .opt-name', (e) => e.textContent.trim());
  // 干扰项里若有任何一个是正确答案的纯字序打乱（字符多重集相同但本身不同）→ 旧 bug 复活
  const reorderTrap = opts.some((o) => o !== correct && bag(o).length > 1 && bag(o) === bag(correct));
  if (reorderTrap) anagramHits++;
  imgReport.push(`Q${i + 1}: 图${imgOk ? '✅' : '❌'} ${correct} | 选项[${opts.join(' / ')}]${reorderTrap ? ' ⚠️乱序陷阱' : ''}`);
  if (i === 1) { await page.screenshot({ path: `${SHOT}/02-quiz.png` }); }
  await new Promise((r) => setTimeout(r, 1900)); // 等翻题/结束
}

// —— 结果页：签名弹窗 ——
await page.waitForSelector('.name-modal', { timeout: 8000 });
await page.screenshot({ path: `${SHOT}/03-name-modal.png` });
const TEST_NAME = '测试侠';
await page.type('.name-modal input', TEST_NAME, { delay: 20 });
const typed = await page.$eval('.name-modal input', (e) => e.value);
ok(typed === TEST_NAME, `弹窗输入框可输入名字（读回="${typed}"）`);
await page.click('.name-modal .btn-primary'); // 确认看战绩
await new Promise((r) => setTimeout(r, 400));
const modalGone = await page.$('.name-modal');
ok(!modalGone, '确认后弹窗关闭，进入结果页');

await page.waitForSelector('.hero-card', { timeout: 8000 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${SHOT}/04-result.png` });

// 百分位 1-99
const beaten = await page.$eval('.beaten b', (e) => parseInt(e.textContent, 10));
ok(beaten >= 1 && beaten <= 99, `打败全国百分位在 1-99（实际=${beaten}%）`);
// 含金量 + 称号存在
const goldShown = await page.$eval('.gold-num', (e) => e.textContent.replace(/\s/g, ''));
ok(/%$/.test(goldShown), `含金量数字渲染（=${goldShown}）`);

// 改名入口显示了刚输入的名字
const reopen = await page.$eval('.name-reopen', (e) => e.textContent);
ok(reopen.includes(TEST_NAME), `结果页「改名」入口显示署名（含"${TEST_NAME}"）`);

// 分享标题（document.title）= 带名字的裂变文案
const title = await page.title();
ok(title.includes(TEST_NAME) && title.includes('⚽'), `分享标题带名字+战绩文案（title="${title}"）`);

// 改名 → 重新弹窗 → 跳过
await page.click('.name-reopen');
await page.waitForSelector('.name-modal .name-skip', { timeout: 4000 });
await page.click('.name-modal .name-skip');
await new Promise((r) => setTimeout(r, 300));
ok(!(await page.$('.name-modal')), '「跳过」按钮可关闭弹窗');

// 生成战报海报
await page.evaluate(() => { window.scrollTo(0, 0); });
await page.click('.actions .btn-primary').catch(() => {});
const posterOk = await page.waitForSelector('.poster-box img', { timeout: 8000 }).then(() => true).catch(() => false);
ok(posterOk, '生成战报海报弹层');
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${SHOT}/05-poster.png` });

console.log('—— 逐题 ——');
console.log(imgReport.join('\n'));
console.log('\n—— 断言 ——');
console.log(assert.join('\n'));
ok(anagramHits === 0, `15 题无「正确答案字序打乱」干扰项（命中=${anagramHits}）`);
console.log(assert[assert.length - 1]);
console.log('\nHTTP failures:', failed.length ? failed.join('\n') : 'none');

const passed = assert.every((a) => a.startsWith('✅')) && !failed.length && imgReport.every((r) => r.includes('图✅'));
console.log('\n=== ' + (passed ? '全部通过 ✅' : '有失败 ❌') + ' ===');
await browser.close();
process.exit(passed ? 0 : 1);
