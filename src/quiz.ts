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

// 含金量权重：3×6 + 4×10 + 3×14 = 100
export const WEIGHT: Record<number, number> = { 1: 6, 2: 10, 3: 14 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 近音梗：打乱中文名字序（内马尔 → 马内尔）；带 · 的只打乱最后一段
function scrambleName(zh: string): string | null {
  const parts = zh.split('·');
  const last = parts[parts.length - 1];
  if (last.length < 2) return null;
  for (let i = 0; i < 12; i++) {
    const s = shuffle(last.split('')).join('');
    if (s !== last) {
      parts[parts.length - 1] = s;
      return parts.join('·');
    }
  }
  return null;
}

export function buildQuiz(): Question[] {
  const byDiff = (d: number) => shuffle(PLAYERS.filter((p) => p.difficulty === d));
  const picks = [...byDiff(1).slice(0, 3), ...byDiff(2).slice(0, 4), ...byDiff(3).slice(0, 3)];

  return shuffle(picks).map((p) => {
    // 干扰项：1 个近音梗 + 真实球员名补足（同国优先，梗更足）
    const pool = shuffle(PLAYERS.filter((x) => x.id !== p.id && x.nameZh !== p.nameZh));
    const sameCountry = pool.filter((x) => x.country === p.country);
    const others = pool.filter((x) => x.country !== p.country);
    const realNames = [...sameCountry.slice(0, 1), ...others].map((x) => x.nameZh);

    const opts = new Set<string>([p.nameZh]);
    const scrambled = scrambleName(p.nameZh);
    if (scrambled) opts.add(scrambled);
    for (const name of realNames) {
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
