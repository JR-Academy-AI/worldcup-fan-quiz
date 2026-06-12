// 抓取球星照片 + 元数据（来源：Wikipedia / Wikimedia Commons，CC 授权可溯源）
// 用法：node scripts/fetch-players.mjs [--shard k/n]
// 已存在于 data/players.json 的球员自动跳过（增量抓取）
// 产出：public/players/*.jpg + data/players.shard-{k}.json

import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROSTER } from '../data/roster.mjs';

const UA = 'JRAcademyWorldCupQuiz/1.0 (https://jiangren.com.au; marketing quiz asset fetcher)';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = path.join(ROOT, 'public/players');
const DATA_DIR = path.join(ROOT, 'data');

// 纯 ASCII slug：重音字符在不同服务器/CDN 上不可靠，一律转写
const toSlug = (wiki) =>
  wiki.replace(/[(),']/g, '').replace(/_+/g, '-')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replaceAll('ø', 'o').replaceAll('Ø', 'o').replaceAll('ı', 'i').replaceAll('đ', 'd')
    .replaceAll('Đ', 'd').replaceAll('ł', 'l').replaceAll('ß', 'ss').replaceAll('æ', 'ae')
    .toLowerCase().replace(/[^a-z0-9-]/g, '');

// 已下载的跳过
let existingIds = new Set();
const existingPath = path.join(DATA_DIR, 'players.json');
if (existsSync(existingPath)) {
  const existing = JSON.parse(await readFile(existingPath, 'utf8'));
  existingIds = new Set(existing.players.map((p) => p.id));
}

const PENDING = ROSTER.filter((p) => !existingIds.has(toSlug(p.wiki)));

// 分片参数：--shard 0/5 → 只抓 index % 5 === 0
const shardSpec = process.argv[process.argv.indexOf('--shard') + 1];
let TARGETS = PENDING;
let shardKey = 'all';
if (process.argv.includes('--shard') && /^\d+\/\d+$/.test(shardSpec ?? '')) {
  const [k, n] = shardSpec.split('/').map(Number);
  TARGETS = PENDING.filter((_, i) => i % n === k);
  shardKey = `shard-${k}`;
}
console.log(`roster=${ROSTER.length} existing=${existingIds.size} pending=${PENDING.length} this-shard=${TARGETS.length}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// 拉 Commons 文件的 license + 作者，营销使用必须保留 attribution
async function getImageMeta(fileTitle) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=' +
    encodeURIComponent(fileTitle);
  const data = await getJson(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  const meta = info?.extmetadata ?? {};
  const strip = (html) => (html ?? '').replace(/<[^>]+>/g, '').trim();
  return {
    license: strip(meta.LicenseShortName?.value) || 'unknown',
    artist: strip(meta.Artist?.value) || 'unknown',
    descriptionUrl: info?.descriptionurl ?? null,
  };
}

const results = [];
const failures = [];

for (const p of TARGETS) {
  try {
    const summary = await getJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.wiki)}`
    );
    const img = summary.originalimage?.source ?? summary.thumbnail?.source;
    if (!img) throw new Error('no image on wiki page');

    const looksThumbed = /\/thumb\//.test(img);
    const fileName = looksThumbed
      ? decodeURIComponent(img.split('/').filter(Boolean).slice(-2, -1)[0])
      : decodeURIComponent(img.split('/').pop());
    let meta = { license: 'unknown', artist: 'unknown', descriptionUrl: null };
    try {
      meta = await getImageMeta(`File:${fileName}`);
    } catch {
      // license 查询失败不阻塞下载，标记 unknown 后人工补
    }

    const imgRes = await fetch(img, { headers: { 'User-Agent': UA } });
    if (!imgRes.ok) throw new Error(`image download ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ext = path.extname(new URL(img).pathname).toLowerCase() || '.jpg';
    const slug = toSlug(p.wiki);
    const fileOut = `${slug}${ext}`;
    await writeFile(path.join(OUT_DIR, fileOut), buf);

    results.push({
      id: slug,
      nameZh: p.zh,
      nameEn: p.en,
      country: p.country,
      difficulty: p.difficulty,
      era: p.era,
      image: `players/${fileOut}`,
      bytes: buf.length,
      source: `https://en.wikipedia.org/wiki/${p.wiki}`,
      imageSource: img,
      license: meta.license,
      artist: meta.artist,
      commonsPage: meta.descriptionUrl,
    });
    console.log(`✅ ${p.zh} (${p.en}) — ${meta.license} — ${(buf.length / 1024).toFixed(0)}KB`);
  } catch (err) {
    failures.push({ player: p.en, wiki: p.wiki, error: String(err.message ?? err) });
    console.log(`❌ ${p.en} [${p.wiki}]: ${err.message}`);
  }
  await sleep(250);
}

await writeFile(
  path.join(DATA_DIR, `players.${shardKey}.json`),
  JSON.stringify({ generatedFrom: 'Wikipedia/Wikimedia Commons', count: results.length, players: results }, null, 2)
);
console.log(`\nDone: ${results.length} ok, ${failures.length} failed`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
