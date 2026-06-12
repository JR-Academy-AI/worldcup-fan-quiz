import type { Tier } from './humor';

// canvas 生成朋友圈分享图（720×1100，9:16 内安全）
// 合规：海报上不放球星照片，只放成绩 —— 球星肖像不与品牌广告同框
export async function makePoster(gold: number, tier: Tier, beaten: number): Promise<string> {
  const W = 720;
  const H = 1100;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // 暖白底 + 顶部草坪绿条
  ctx.fillStyle = '#FFFCF6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(0, 0, W, 10);

  const center = W / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#6B7280';
  ctx.font = '600 30px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('球迷含金量检测 ⚽', center, 96);

  ctx.font = '120px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText(tier.emoji, center, 260);

  ctx.fillStyle = '#0D0F12';
  ctx.font = '700 56px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText(tier.name, center, 360);

  // 含金量大数字
  ctx.fillStyle = '#22C55E';
  ctx.font = '800 150px "SF Mono", Menlo, -apple-system, sans-serif';
  ctx.fillText(`${gold}%`, center, 540);
  ctx.fillStyle = '#6B7280';
  ctx.font = '500 30px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('球迷含金量', center, 590);

  // 称号吐槽（自动换行）
  ctx.fillStyle = '#1F2937';
  ctx.font = '500 30px -apple-system, "PingFang SC", sans-serif';
  wrapText(ctx, `“${tier.line}”`, center, 670, 560, 46);

  // 打败 xx%
  ctx.fillStyle = '#0D0F12';
  ctx.font = '700 38px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText(`打败了全国 ${beaten}% 的球迷`, center, 810);

  // 挑衅 CTA
  ctx.fillStyle = '#B42318';
  ctx.font = '600 30px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('不服？搜「球迷含金量检测」来测', center, 880);

  // 底部品牌黑条（与上方内容留足间隔）
  ctx.fillStyle = '#0D0F12';
  ctx.fillRect(0, H - 130, W, 130);
  try {
    const logo = await loadImage('./brand/logo-zh-white.png');
    const lh = 56;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, center - lw / 2, H - 130 + 16, lw, lh);
  } catch {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 34px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText('匠人学院', center, H - 78);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '500 24px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('学 AI 来匠人 · jiangren.com.au', center, H - 32);

  return c.toDataURL('image/png');
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  let line = '';
  let yy = y;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineH;
    } else {
      line += ch;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
