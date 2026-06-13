import type { Tier } from './humor';
import type { Answered } from './quiz';

type PosterQr = {
  name: string;
  path: string;
};

const W = 941;
const H = 1672;
const QR_OPTIONS: PosterQr[] = [
  { name: 'Angela', path: './worldcup-assets/qr/angela.png' },
  { name: 'Amelia', path: './worldcup-assets/qr/amelia.png' },
  { name: 'Rain', path: './worldcup-assets/qr/rain.png' },
];

// canvas 生成朋友圈分享图。用设计稿作为底图，只绘制动态分数、点评、人设和随机二维码。
export async function makePoster(gold: number, tier: Tier, beaten: number, answers: Answered[]): Promise<string> {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持生成战报');

  const template = await loadImage('./worldcup-assets/result-poster-template.png?v=2');
  const qr = randomQr();
  const qrImg = await loadImage(qr.path);
  const correct = answers.filter((a) => a.correct).length;
  const topRank = 100 - beaten;

  ctx.drawImage(template, 0, 0, W, H);

  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 6;
  fitText(ctx, tier.name, 650, 407, 330, 31, '#FFF3D0');
  ctx.shadowBlur = 0;
  drawShieldBadge(ctx, tier.name);

  ctx.shadowColor = 'rgba(107,46,0,.35)';
  ctx.shadowBlur = 8;
  setFont(ctx, 160, 900);
  ctx.fillStyle = '#F58A16';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(gold), 695, 612);
  ctx.shadowBlur = 0;

  fitText(ctx, '球迷含金量', 622, 703, 260, 34, '#FFFFFF');
  drawWrapped(ctx, `“${tier.line}”`, 250, 776, 565, 38, 2, 31, '#082447', 900);

  ctx.save();
  ctx.fillStyle = '#061A30';
  ctx.fillRect(220, 886, 342, 122);
  ctx.restore();
  fitText(ctx, 'TOP', 279, 960, 80, 31, '#F5D178');
  fitText(ctx, `${topRank}%`, 420, 958, 230, 76, '#F6C76C');
  drawMixedLine(ctx, [
    { text: '打败了全国 ', color: '#FFFFFF', size: 29 },
    { text: `${beaten}%`, color: '#FF8D29', size: 31 },
    { text: ' 的球迷', color: '#FFFFFF', size: 29 },
  ], 532, 927);
  drawWrapped(ctx, percentileLine(beaten), 532, 958, 292, 30, 2, 23, '#E9EDF4', 800);

  fitText(ctx, `${correct}/${answers.length}`, 181, 1114, 116, 31, '#FFFFFF');
  fitText(ctx, difficultyLabel(gold), 374, 1114, 130, 27, '#FFFFFF');
  fitText(ctx, '随机生成', 567, 1114, 136, 26, '#FFFFFF');
  fitText(ctx, '难题加权', 759, 1114, 128, 27, '#FFFFFF');

  personaCards(gold, correct, answers.length).forEach((card, i) => {
    const left = [190, 425, 720][i];
    const center = [213, 470, 718][i];
    fitText(ctx, card.title, left + 52, 1248, 120, 23, '#10243D');
    fitText(ctx, card.subtitle, left + 52, 1281, 126, 18, '#4A5360');
    drawStars(ctx, card.stars, center, 1321);
  });

  drawQrCode(ctx, qrImg);

  return c.toDataURL('image/png');
}

function randomQr(): PosterQr {
  return QR_OPTIONS[Math.floor(Math.random() * QR_OPTIONS.length)];
}

function difficultyLabel(gold: number): string {
  if (gold >= 86) return '轻松局';
  if (gold >= 56) return '中等偏上';
  if (gold >= 26) return '难题加码';
  return '地狱开局';
}

function percentileLine(beaten: number): string {
  if (beaten <= 15) return `剩下 ${100 - beaten}% 里，估计有一半是手滑点对的。`;
  if (beaten <= 45) return '中游偏下，建议少发言、多点头。';
  if (beaten <= 75) return '可以发表进球点评了，不会翻车。';
  if (beaten <= 92) return '朋友圈需要你，凌晨三点那种需要。';
  return '这含金量，解说席给你留个位置。';
}

function personaCards(gold: number, correct: number, total: number) {
  const ratio = total === 0 ? 0 : correct / total;
  return [
    {
      title: gold >= 86 ? '金牌首发' : gold >= 56 ? '稳健主力' : '气氛担当',
      subtitle: gold >= 86 ? '看球不眨眼' : gold >= 56 ? '懂球能开麦' : '进球就欢呼',
      stars: gold >= 86 ? 4 : gold >= 56 ? 3 : 2,
    },
    {
      title: ratio >= 0.7 ? '带球突破' : '重在参与',
      subtitle: `${correct} 题命中`,
      stars: ratio >= 0.7 ? 4 : ratio >= 0.4 ? 3 : 2,
    },
    {
      title: gold === 100 ? '球王转世' : '快乐第一名',
      subtitle: gold === 100 ? '满分封神' : '不服再来',
      stars: gold === 100 ? 4 : 3,
    },
  ];
}

function drawShieldBadge(ctx: CanvasRenderingContext2D, tierName: string) {
  const parts = tierName.split(' · ');
  const titleLines = parts.length > 1 ? parts : [tierName];

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 8;
  fitText(ctx, '球迷段位', 236, 436, 150, 24, '#F7D38A', 'center', 900);
  ctx.shadowBlur = 4;

  if (titleLines.length === 1) {
    fitText(ctx, titleLines[0], 236, 498, 168, 32, '#FFF7D6', 'center', 900);
  } else {
    fitText(ctx, titleLines[0], 236, 488, 168, 31, '#FFF7D6', 'center', 900);
    fitText(ctx, titleLines.slice(1).join(' · '), 236, 532, 176, 27, '#FFF7D6', 'center', 900);
  }

  ctx.fillStyle = 'rgba(247,211,138,.86)';
  ctx.fillRect(172, 560, 128, 2);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 800) {
  ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
  color: string,
  align: CanvasTextAlign = 'center',
  weight = 900,
) {
  let size = initialSize;
  do {
    setFont(ctx, size, weight);
    if (ctx.measureText(text).width <= maxWidth || size <= 16) break;
    size -= 2;
  } while (size > 16);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const chars = Array.from(text.replace(/\s+/g, ' ').trim());
  const lines: string[] = [];
  let line = '';

  for (const ch of chars) {
    const next = `${line}${ch}`;
    if (ctx.measureText(next).width <= maxWidth || line === '') {
      line = next;
      continue;
    }
    lines.push(line);
    line = ch;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && chars.join('').length > lines.join('').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  }
  return lines;
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  size: number,
  color: string,
  weight = 800,
) {
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  wrapLines(ctx, text, maxWidth, maxLines).forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
}

function drawMixedLine(
  ctx: CanvasRenderingContext2D,
  parts: { text: string; color: string; size?: number; weight?: number }[],
  x: number,
  y: number,
) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let cursor = x;
  parts.forEach((part) => {
    setFont(ctx, part.size ?? 28, part.weight ?? 900);
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, cursor, y);
    cursor += ctx.measureText(part.text).width;
  });
}

function drawStars(ctx: CanvasRenderingContext2D, stars: number, x: number, y: number) {
  setFont(ctx, 26, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const start = x - 38;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i < stars ? '#F2A51A' : '#E8D2A5';
    ctx.fillText('★', start + i * 25, y);
  }
}

function drawQrCode(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const x = 718;
  const y = 1411;
  const size = 156;
  const pad = 5;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}
