// 一次性重建：题库收敛为「2026 世界杯实际参赛球员」
// 依据：3 个核对 agent 对照 Wikipedia 2026_FIFA_World_Cup_squads 的结果（2026-06-12）
// 动作：1) 剔除未晋级国家 / 落选球员 / 全部传奇  2) 并入各队大名单里我们缺的球星
//       3) 重新生成 data/roster.mjs  4) 清洗 data/players.json + 删除被剔除球员的图片

import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROSTER } from '../data/roster.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const toSlug = (wiki) => wiki.replace(/[(),']/g, '').replace(/_+/g, '-').toLowerCase();

// —— 未晋级国家（2026-03 附加赛后确认）——
const NOT_QUALIFIED = new Set(['意大利','丹麦','波兰','乌克兰','塞尔维亚','匈牙利','斯洛文尼亚','格鲁吉亚','尼日利亚','喀麦隆','中国']);

// —— 晋级了但没进最终 26 人大名单 ——
const OUT_OF_SQUAD = new Set([
  'Antoine Griezmann','Eduardo Camavinga','Randal Kolo Muani','Olivier Giroud',
  'Phil Foden','Mason Mount','Cole Palmer','Kyle Walker','Trent Alexander-Arnold','Jack Grealish','Raheem Sterling',
  'Álvaro Morata','Dani Carvajal',
  'João Palhinha',
  'Serge Gnabry','Marc-André ter Stegen','İlkay Gündoğan','Niclas Füllkrug',
  'Xavi Simons','Matthijs de Ligt',
  'Dejan Kulusevski',
  'Yann Sommer','Xherdan Shaqiri',
  'Ángel Di María','Alejandro Garnacho',
  'Rodrygo','Antony','Gabriel Jesus','Richarlison','Éder Militão',
  'Luis Suárez',
  'Jhon Durán',
  'Hirving Lozano',
  'Kaoru Mitoma','Takumi Minamino',
  'Mitchell Duke','Martin Boyle',
  'Sardar Azmoun',
  'Hakim Ziyech','Youssef En-Nesyri',
  'Mohammed Kudus',
  'Sébastien Haller',
  'Ismaël Bennacer',
]);

// —— 大名单在册、我们缺的球星（agent 核对结果）——
const ADDITIONS = [
  ['Michael_Olise','Michael Olise','奥利塞','法国',2],
  ['Désiré_Doué','Désiré Doué','杜埃','法国',2],
  ['Rayan_Cherki','Rayan Cherki','切尔基','法国',3],
  ['Eberechi_Eze','Eberechi Eze','埃泽','英格兰',3],
  ['Morgan_Rogers','Morgan Rogers','摩根·罗杰斯','英格兰',3],
  ['Elliot_Anderson_(footballer)','Elliot Anderson','埃利奥特·安德森','英格兰',3],
  ['Pau_Cubarsí','Pau Cubarsí','库巴西','西班牙',3],
  ['Martín_Zubimendi','Martín Zubimendi','苏比门迪','西班牙',3],
  ['Ferran_Torres','Ferran Torres','费兰·托雷斯','西班牙',2],
  ['João_Neves','João Neves','若昂·内维斯','葡萄牙',3],
  ['Nuno_Mendes_(footballer,_born_2002)','Nuno Mendes','努诺·门德斯','葡萄牙',3],
  ['Francisco_Conceição','Francisco Conceição','孔塞桑','葡萄牙',3],
  ['Nick_Woltemade','Nick Woltemade','沃尔特马德','德国',3],
  ['Jonathan_Tah','Jonathan Tah','乔纳森·塔','德国',3],
  ['Nico_Schlotterbeck','Nico Schlotterbeck','施洛特贝克','德国',3],
  ['Ryan_Gravenberch','Ryan Gravenberch','赫拉芬贝赫','荷兰',3],
  ['Micky_van_de_Ven','Micky van de Ven','范德文','荷兰',3],
  ['Bart_Verbruggen','Bart Verbruggen','弗布鲁根','荷兰',3],
  ['Charles_De_Ketelaere','Charles De Ketelaere','德凯特拉雷','比利时',3],
  ['Senne_Lammens','Senne Lammens','拉门斯','比利时',3],
  ['Dodi_Lukebakio','Dodi Lukébakio','卢克巴基奥','比利时',3],
  ['Petar_Sučić','Petar Sučić','苏契奇','克罗地亚',3],
  ['Martin_Baturina','Martin Baturina','巴图里纳','克罗地亚',3],
  ['Luka_Vušković','Luka Vušković','武什科维奇','克罗地亚',3],
  ['Antonio_Nusa','Antonio Nusa','努萨','挪威',3],
  ['Oscar_Bobb','Oscar Bobb','奥斯卡·鲍勃','挪威',3],
  ['Jørgen_Strand_Larsen','Jørgen Strand Larsen','斯特兰德·拉森','挪威',3],
  ['Viktor_Gyökeres','Viktor Gyökeres','哲凯赖什','瑞典',2],
  ['Anthony_Elanga','Anthony Elanga','埃兰加','瑞典',3],
  ['Victor_Lindelöf','Victor Lindelöf','林德勒夫','瑞典',3],
  ['Manuel_Akanji','Manuel Akanji','阿坎吉','瑞士',3],
  ['Gregor_Kobel','Gregor Kobel','科贝尔','瑞士',3],
  ['Dan_Ndoye','Dan Ndoye','恩多耶','瑞士',3],
  ['Konrad_Laimer','Konrad Laimer','莱默','奥地利',3],
  ['Kevin_Danso','Kevin Danso','丹索','奥地利',3],
  ['Kerem_Aktürkoğlu','Kerem Aktürkoğlu','阿克图尔科格鲁','土耳其',3],
  ['Ferdi_Kadıoğlu','Ferdi Kadıoğlu','卡迪奥卢','土耳其',3],
  ['Merih_Demiral','Merih Demiral','德米拉尔','土耳其',3],
  ['John_McGinn','John McGinn','麦金','苏格兰',3],
  ['Kieran_Tierney','Kieran Tierney','蒂尔尼','苏格兰',3],
  ['Ché_Adams','Ché Adams','切·亚当斯','苏格兰',3],
  ['Tomáš_Souček','Tomáš Souček','苏切克','捷克',3],
  ['Vladimír_Coufal','Vladimír Coufal','科法尔','捷克',3],
  ['Adam_Hložek','Adam Hložek','赫洛热克','捷克',3],
  ['Edin_Džeko','Edin Džeko','哲科','波黑',2],
  ['Sead_Kolašinac','Sead Kolašinac','科拉希纳茨','波黑',3],
  ['Nico_Paz','Nico Paz','尼科·帕斯','阿根廷',3],
  ['Thiago_Almada','Thiago Almada','阿尔马达','阿根廷',3],
  ['Lisandro_Martínez','Lisandro Martínez','利桑德罗·马丁内斯','阿根廷',3],
  ['Matheus_Cunha','Matheus Cunha','库尼亚','巴西',2],
  ['Gabriel_Martinelli','Gabriel Martinelli','马丁内利','巴西',2],
  ['Lucas_Paquetá','Lucas Paquetá','帕奎塔','巴西',3],
  ['Giorgian_de_Arrascaeta','Giorgian de Arrascaeta','德阿拉斯卡埃塔','乌拉圭',3],
  ['Fernando_Muslera','Fernando Muslera','穆斯莱拉','乌拉圭',3],
  ['Richard_Ríos','Richard Ríos','理查德·里奥斯','哥伦比亚',3],
  ['Jhon_Córdoba','Jhon Córdoba','科尔多瓦','哥伦比亚',3],
  ['David_Ospina','David Ospina','奥斯皮纳','哥伦比亚',2],
  ['Gilberto_Mora','Gilberto Mora','莫拉','墨西哥',3],
  ['Malik_Tillman','Malik Tillman','蒂尔曼','美国',3],
  ['Timothy_Weah','Tim Weah','蒂姆·维阿','美国',3],
  ['Antonee_Robinson','Antonee Robinson','安东尼·罗宾逊','美国',3],
  ['Cyle_Larin','Cyle Larin','拉林','加拿大',3],
  ['Maxime_Crépeau','Maxime Crépeau','克雷波','加拿大',3],
  ['Piero_Hincapié','Piero Hincapié','因卡皮耶','厄瓜多尔',3],
  ['Willian_Pacho','Willian Pacho','帕乔','厄瓜多尔',3],
  ['Enner_Valencia','Enner Valencia','埃内尔·瓦伦西亚','厄瓜多尔',2],
  ['Julio_Enciso','Julio Enciso','恩西索','巴拉圭',3],
  ['Antonio_Sanabria','Antonio Sanabria','萨纳夫里亚','巴拉圭',3],
  ['Gustavo_Gómez','Gustavo Gómez','古斯塔沃·戈麦斯','巴拉圭',3],
  ['Daizen_Maeda','Daizen Maeda','前田大然','日本',3],
  ['Yuto_Nagatomo','Yuto Nagatomo','长友佑都','日本',2],
  ['Ao_Tanaka','Ao Tanaka','田中碧','日本',3],
  ['Hwang_In-beom','Hwang In-beom','黄仁范','韩国',3],
  ['Lee_Jae-sung','Lee Jae-sung','李在城','韩国',3],
  ['Jens_Castrop','Jens Castrop','卡斯特罗普','韩国',3],
  ['Nestory_Irankunda','Nestory Irankunda','伊兰昆达','澳大利亚',3],
  ['Cristian_Volpato','Cristian Volpato','沃尔帕托','澳大利亚',3],
  ['Jordan_Bos','Jordan Bos','博斯','澳大利亚',3],
  ['Alireza_Jahanbakhsh','Alireza Jahanbakhsh','贾汉巴赫什','伊朗',3],
  ['Alireza_Beiranvand','Alireza Beiranvand','贝兰万德','伊朗',3],
  ['Mehdi_Ghayedi','Mehdi Ghayedi','加耶迪','伊朗',3],
  ['Firas_Al-Buraikan','Firas Al-Buraikan','布莱坎','沙特阿拉伯',3],
  ['Saleh_Al-Shehri','Saleh Al-Shehri','谢赫里','沙特阿拉伯',3],
  ['Mohamed_Kanno','Mohamed Kanno','坎诺','沙特阿拉伯',3],
  ['Eldor_Shomurodov','Eldor Shomurodov','绍穆罗多夫','乌兹别克斯坦',3],
  ['Abbosbek_Fayzullaev','Abbosbek Fayzullaev','法伊祖拉耶夫','乌兹别克斯坦',3],
  ['Jaloliddin_Masharipov','Jaloliddin Masharipov','马沙里波夫','乌兹别克斯坦',3],
  ['Liberato_Cacace','Liberato Cacace','卡卡切','新西兰',3],
  ['Marko_Stamenic','Marko Stamenic','斯塔梅尼奇','新西兰',3],
  ['Bilal_El_Khannouss','Bilal El Khannouss','哈努斯','摩洛哥',3],
  ['Noussair_Mazraoui','Noussair Mazraoui','马兹拉维','摩洛哥',3],
  ['Azzedine_Ounahi','Azzedine Ounahi','乌纳希','摩洛哥',3],
  ['Nicolas_Jackson','Nicolas Jackson','尼古拉斯·杰克逊','塞内加尔',2],
  ['Pape_Matar_Sarr','Pape Matar Sarr','帕普·马塔尔·萨尔','塞内加尔',3],
  ['Iliman_Ndiaye','Iliman Ndiaye','恩迪亚耶','塞内加尔',3],
  ['Trezeguet_(footballer)','Trezeguet','特雷泽盖','埃及',3],
  ['Emam_Ashour','Emam Ashour','阿舒尔','埃及',3],
  ['Mohamed_El-Shenawy','Mohamed El-Shenawy','谢纳维','埃及',3],
  ['Antoine_Semenyo','Antoine Semenyo','塞门约','加纳',3],
  ['Iñaki_Williams','Iñaki Williams','伊纳基·威廉姆斯','加纳',3],
  ['Jordan_Ayew','Jordan Ayew','乔丹·阿尤','加纳',3],
  ['Amad_Diallo','Amad Diallo','阿马德·迪亚洛','科特迪瓦',3],
  ['Nicolas_Pépé','Nicolas Pépé','佩佩','科特迪瓦',2],
  ['Evan_Ndicka','Evan Ndicka','恩迪卡','科特迪瓦',3],
  ['Mohamed_Amoura','Mohamed Amoura','阿穆拉','阿尔及利亚',3],
  ['Amine_Gouiri','Amine Gouiri','古伊里','阿尔及利亚',3],
  ['Aïssa_Mandi','Aïssa Mandi','曼迪','阿尔及利亚',3],
].map(([wiki, en, zh, country, difficulty]) => ({ wiki, en, zh, country, difficulty, era: 'current' }));

// —— 1. 过滤旧 roster ——
const kept = ROSTER.filter(
  (p) => p.era === 'current' && !NOT_QUALIFIED.has(p.country) && !OUT_OF_SQUAD.has(p.en)
);
const removed = ROSTER.filter((p) => !kept.includes(p));
const newRoster = [...kept, ...ADDITIONS];

// —— 2. 重新生成 roster.mjs（按国家分组）——
const byCountry = new Map();
for (const p of newRoster) {
  if (!byCountry.has(p.country)) byCountry.set(p.country, []);
  byCountry.get(p.country).push(p);
}
let out = `// 2026 世界杯参赛球星主名单（source of truth）— 只收最终 26 人大名单在册球员
// 依据 Wikipedia 2026_FIFA_World_Cup_squads 核对（2026-06-12，3 agent 交叉验证）
// wiki = 英文维基条目精确标题；zh = 题目展示用中文名
// difficulty: 1=不看球也认识 2=看球的认识 3=真球迷才认识

export const ROSTER = [
`;
for (const [country, players] of byCountry) {
  out += `  // ====== ${country} ======\n`;
  for (const p of players) {
    const wiki = p.wiki.includes("'") ? `"${p.wiki}"` : `'${p.wiki}'`;
    const en = p.en.includes("'") ? `"${p.en}"` : `'${p.en}'`;
    out += `  { wiki: ${wiki}, en: ${en}, zh: '${p.zh}', country: '${p.country}', difficulty: ${p.difficulty}, era: 'current' },\n`;
  }
}
out += '];\n';
await writeFile(path.join(ROOT, 'data/roster.mjs'), out);

// —— 3. 清洗 players.json + 删除被剔除球员的图片 ——
const keepIds = new Set(newRoster.map((p) => toSlug(p.wiki)));
const data = JSON.parse(await readFile(path.join(ROOT, 'data/players.json'), 'utf8'));
const keptPlayers = data.players.filter((p) => keepIds.has(p.id));
const removedPlayers = data.players.filter((p) => !keepIds.has(p.id));
for (const p of removedPlayers) {
  const f = path.join(ROOT, 'public', p.image);
  if (existsSync(f)) await unlink(f);
}
await writeFile(
  path.join(ROOT, 'data/players.json'),
  JSON.stringify({ generatedFrom: 'Wikipedia/Wikimedia Commons', generatedAt: '2026-06-12', count: keptPlayers.length, players: keptPlayers }, null, 2)
);

console.log(`roster: ${ROSTER.length} → ${newRoster.length} (removed ${removed.length}, added ${ADDITIONS.length})`);
console.log(`players.json: ${data.players.length} → ${keptPlayers.length} (deleted ${removedPlayers.length} images)`);
console.log(`pending download: ${newRoster.length - keptPlayers.length}`);
console.log('removed countries:', [...NOT_QUALIFIED].join(','));
