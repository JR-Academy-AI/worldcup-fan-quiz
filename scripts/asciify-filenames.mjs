// 一次性：球员图片文件名 + id 全部转纯 ASCII（重音字符跨服务器/CDN 不可靠）
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replaceAll('ø','o').replaceAll('Ø','o').replaceAll('ı','i').replaceAll('đ','d')
  .replaceAll('Đ','d').replaceAll('ł','l').replaceAll('ß','ss').replaceAll('æ','ae')
  .toLowerCase().replace(/[^a-z0-9.-]/g, '');

const data = JSON.parse(await readFile(path.join(ROOT, 'data/players.json'), 'utf8'));
let renamed = 0;
for (const p of data.players) {
  const oldFile = path.join(ROOT, 'public', p.image);
  const base = path.basename(p.image);
  const newBase = ascii(base);
  if (newBase !== base) {
    await rename(oldFile, path.join(ROOT, 'public/players', newBase));
    p.image = `players/${newBase}`;
    renamed++;
  }
  p.id = ascii(p.id);
}
const ids = new Set();
const dups = data.players.filter((p) => (ids.has(p.id) ? true : (ids.add(p.id), false)));
const missing = data.players.filter((p) => !existsSync(path.join(ROOT, 'public', p.image)));
await writeFile(path.join(ROOT, 'data/players.json'), JSON.stringify(data, null, 2));
console.log(`renamed: ${renamed} | dup ids: ${dups.length} | missing: ${missing.length} | total: ${data.players.length}`);
