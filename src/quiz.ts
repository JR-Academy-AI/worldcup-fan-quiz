import data from '../data/players.json';

export interface Player {
  id: string;
  nameZh: string;
  nameEn: string;
  country: string;
  difficulty: number;
  image: string;
  license: string;
  artist: string;
  commonsPage: string | null;
  source: string;
}

export const PLAYERS = (data as { players: Player[] }).players;

export interface Question {
  player: Player;
  options: string[];
}

export interface Answered {
  question: Question;
  picked: string;
  correct: boolean;
}

// 含金量权重：5×4 + 5×6 + 5×10 = 100（难题占一半，满分必须通吃 5 道难题）
export const WEIGHT: Record<number, number> = { 1: 4, 2: 6, 3: 10 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 近音字替换表：同音 / 近音的「可信译名用字」。替换 1 个字 → 看起来像另一种官方译名
// （内马尔 → 内玛尔、姆巴佩 → 穆巴佩），而不是一眼能识破的「顺序打乱」。
const HOMOPHONE: Record<string, string> = {
  马: '玛', 玛: '马',
  西: '希', 希: '西',
  斯: '思',
  加: '嘉',
  莫: '默',
  内: '纳',
  罗: '洛',
  姆: '穆',
  里: '利',
  米: '密',
  佩: '培',
  迪: '蒂',
  尼: '妮',
  卡: '咖',
};

// 用近音字替换名字里的 1 个字，造一个「像真译名」的陷阱项；带 · 的只动最后一段
function homophoneVariant(zh: string): string | null {
  const parts = zh.split('·');
  const i = parts.length - 1;
  const seg = parts[i];
  const positions = [...seg].map((c, k) => (HOMOPHONE[c] ? k : -1)).filter((k) => k >= 0);
  if (!positions.length) return null;
  const pos = positions[Math.floor(Math.random() * positions.length)];
  parts[i] = seg.slice(0, pos) + HOMOPHONE[seg[pos]] + seg.slice(pos + 1);
  const variant = parts.join('·');
  return variant !== zh ? variant : null;
}

export function buildQuiz(): Question[] {
  const byDiff = (d: number) => shuffle(PLAYERS.filter((p) => p.difficulty === d));
  const picks = [...byDiff(1).slice(0, 5), ...byDiff(2).slice(0, 5), ...byDiff(3).slice(0, 5)];

  return shuffle(picks).map((p) => {
    // 干扰项设计（防 50% 瞎猜）：
    //   ① 1 个近音字陷阱（像另一种译名，casual 球迷最容易中招）
    //   ② 真实球员名补足，同国优先 —— 同国 4 个名字摆一起，无法靠「国籍/长相不对」排除，只能真认脸
    const pool = shuffle(PLAYERS.filter((x) => x.id !== p.id && x.nameZh !== p.nameZh));
    const sameCountry = pool.filter((x) => x.country === p.country).map((x) => x.nameZh);
    const others = pool.filter((x) => x.country !== p.country).map((x) => x.nameZh);

    const opts = new Set<string>([p.nameZh]);
    const variant = homophoneVariant(p.nameZh);
    if (variant && !sameCountry.includes(variant) && !others.includes(variant)) opts.add(variant);
    for (const name of [...sameCountry, ...others]) {
      if (opts.size >= 4) break;
      opts.add(name);
    }
    return { player: p, options: shuffle([...opts]) };
  });
}

export function goldScore(answers: Answered[]): number {
  return answers.reduce((sum, a) => sum + (a.correct ? WEIGHT[a.question.player.difficulty] : 0), 0);
}

// 预埋分布（MVP 无后端）：近似正态 μ=55 σ=22 的 CDF → 打败了多少人
export function percentBeaten(gold: number): number {
  const z = (gold - 55) / 22;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return Math.min(99, Math.max(1, Math.round(p * 100)));
}
