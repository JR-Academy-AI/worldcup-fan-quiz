import type { Answered } from './quiz';

export interface Tier {
  emoji: string;
  name: string;
  line: string;
  shareLine: string;
}

// 含金量 = 材质梗。低分称号比高分更有分享欲。
export function tierOf(gold: number, allWrong: boolean): Tier {
  if (allWrong)
    return {
      emoji: '🃏',
      name: '反向球王',
      line: '十题全错也是种天赋——概率上比全对还难。买彩票记得反着买。',
      shareLine: '我测出了史诗级稀有称号：反向球王',
    };
  if (gold <= 25)
    return {
      emoji: '🥉',
      name: '纯黄铜球迷',
      line: '镀金都算不上。你看的不是球，是热闹。',
      shareLine: `我的球迷含金量只有 ${gold}%，是纯黄铜的`,
    };
  if (gold <= 55)
    return {
      emoji: '🍺',
      name: '电镀金 · 酒吧气氛组',
      line: '进球了跟着喊，回放都认不出是谁进的。',
      shareLine: `球迷含金量 ${gold}%，电镀金，掉漆那种`,
    };
  if (gold <= 85)
    return {
      emoji: '📺',
      name: '18K · 资深沙发教练',
      line: '已经有资格在群里喷教练排兵布阵了。',
      shareLine: `球迷含金量 ${gold}%，18K，可以喷教练了`,
    };
  if (gold < 100)
    return {
      emoji: '💍',
      name: '24K 纯金球迷',
      line: '你的青春大概都献给凌晨三点的闹钟了。',
      shareLine: `球迷含金量 ${gold}%，24K 纯金认证`,
    };
  return {
    emoji: '👑',
    name: '球王转世',
    line: '满分。建议直接去解说席上班，顺便把工资条发我看看。',
    shareLine: '球迷含金量 100%，球王转世，不接受反驳',
  };
}

// —— 分享标题文案池（裂变核心）——
// 同一个成绩，每次随机选一条，朋友圈里多人分享不重样、保持新鲜感。
// 名字实时插入；模板挑中一次后固定（输名字时不会跳变）。
export interface ShareCtx {
  name: string;
  gold: number;
  beaten: number;
  tier: Tier;
  allWrong: boolean;
}

const SHARE_TEMPLATES: Array<(c: ShareCtx) => string> = [
  ({ name, gold, beaten }) => `${name}：球迷含金量 ${gold}%，打败了全国 ${beaten}% 的人，不服来战 ⚽`,
  ({ name, tier, beaten }) => `${name}：${tier.shareLine}，打败了全国 ${beaten}% 的球迷 ⚽`,
  ({ name, gold }) => `谁还不是个老球迷？${name} 含金量 ${gold}%，群里有人敢比吗 ⚽`,
  ({ name, gold }) => `我测了下，${name} 的球迷含金量 ${gold}%……你敢猜你自己几分？⚽`,
  ({ name, gold, beaten }) => `全国前 ${Math.max(1, 100 - beaten)}%！${name} 含金量 ${gold}%，不信你超得过 ⚽`,
  ({ name, gold, beaten }) => `世界杯认脸挑战：${name} 含金量 ${gold}%，打败 ${beaten}% 的人，敢测吗 ⚽`,
  ({ name, gold }) => `就这？${name} 球迷含金量才 ${gold}%，肯定有人比我高，来打脸 ⚽`,
  ({ name, gold, beaten }) => `${name} 的球迷含金量是 ${gold}%，打败了全国 ${beaten}% 的球迷，你呢？⚽`,
  ({ name, tier, gold }) => `${tier.emoji} ${name} 喜提「${tier.name}」称号，含金量 ${gold}%，来抢称号 ⚽`,
  ({ name, beaten }) => `朋友圈球迷天花板？${name} 打败了全国 ${beaten}% 的人，等你来超 ⚽`,
];

export const SHARE_TEMPLATE_COUNT = SHARE_TEMPLATES.length;

export function shareTitleOf(c: ShareCtx, idx: number): string {
  if (c.allWrong) return `史诗级稀有！${c.name} 全程零正确，反向球王认证 🃏 这运气你比得过？⚽`;
  return SHARE_TEMPLATES[((idx % SHARE_TEMPLATES.length) + SHARE_TEMPLATES.length) % SHARE_TEMPLATES.length](c);
}

// 毒舌错题点评：认错的越简单，嘲讽越狠；认错冷门题反向安慰
const WRONG_D1 = [
  (n: string) => `${n}你都不认识？他可能是本届出镜率最高的人。`,
  (n: string) => `把${n}认错，建议截图发群里让朋友们鉴赏一下。`,
  (n: string) => `${n}：「我换了个发型而已，没换脸。」`,
];
const WRONG_D2 = [
  (n: string) => `看球的都认识${n}，你大概只看比分。`,
  (n: string) => `${n}表示：我在你们群头像里出现过。`,
  (n: string) => `这位是${n}。半个球迷该认识，你是四分之一个。`,
];
const WRONG_D3 = [
  (n: string) => `认不出${n}不丢人，认出来的都是上班摸鱼看球的。`,
  (n: string) => `${n}本来就低调，这题算它偷袭。`,
  (n: string) => `没事，${n}的队友可能都认不全队里的人。`,
];

export function wrongQuip(a: Answered): string {
  const n = a.question.player.nameZh;
  const pool = a.question.player.difficulty === 1 ? WRONG_D1 : a.question.player.difficulty === 2 ? WRONG_D2 : WRONG_D3;
  return pool[Math.floor(Math.random() * pool.length)](n);
}

// 超时专属吐槽（比答错更扎心：你不是不会，是反应慢）
const TIMEOUT_QUIPS = [
  (n: string) => `5 秒都不够想？${n}站你面前你也认不出。`,
  (n: string) => `时间到。${n}已经跑完一个反击了，你还在想。`,
  (n: string) => `犹豫就是不认识。这位是${n}。`,
];

export function timeoutQuip(a: Answered): string {
  const n = a.question.player.nameZh;
  return TIMEOUT_QUIPS[Math.floor(Math.random() * TIMEOUT_QUIPS.length)](n);
}

const RIGHT_D3 = [
  '可以啊，这都认识，工资没少买球衣吧。',
  '冷门题都接得住，是真看球的。',
  '这题答对的人不超过两成，你是其中之一。',
];
export function rightQuip(a: Answered): string | null {
  if (a.question.player.difficulty === 3) {
    return RIGHT_D3[Math.floor(Math.random() * RIGHT_D3.length)];
  }
  return null;
}

// 百分位注脚
export function percentileQuip(beaten: number): string {
  if (beaten <= 15) return `剩下 ${100 - beaten}% 里，估计有一半是手滑点对的。`;
  if (beaten <= 45) return '中游偏下，世界杯期间建议少发言、多点头。';
  if (beaten <= 75) return '可以在朋友圈发表进球点评了，不会翻车。';
  if (beaten <= 92) return '你的朋友圈需要你，凌晨三点那种需要。';
  return '这含金量，解说席给你留个位置。';
}
