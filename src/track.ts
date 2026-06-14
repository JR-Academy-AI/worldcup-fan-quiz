// 匿名埋点：fire-and-forget 上报到 jr-academy 后端，失败静默不影响游戏。
// 事件名与后端 src/modules/worldcup-quiz/constants.ts 一一对应，改一侧需同步另一侧。

const API_BASE = 'https://api.jiangren.com.au'; // jr-academy 后端 prod（无 /api/v1 前缀）
const ENDPOINT = `${API_BASE}/worldcup-quiz/events`;

export type QuizEvent = 'page_view' | 'quiz_start' | 'quiz_complete' | 'share_click';

// 每个浏览器一个稳定 sessionId，做漏斗去重（uuid v4，localStorage 持久）
function sessionId(): string {
  const KEY = 'wcq_sid';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}

// 来源渠道：utm_source 优先，否则取 referrer 主机名
function source(): string | null {
  const utm = new URLSearchParams(location.search).get('utm_source');
  if (utm) return utm.slice(0, 64);
  if (document.referrer) {
    try {
      return new URL(document.referrer).hostname.slice(0, 64);
    } catch {
      // referrer 不是合法 URL，忽略
    }
  }
  return null;
}

export function track(eventName: QuizEvent, payload: Record<string, unknown> = {}): void {
  const body = JSON.stringify({
    sessionId: sessionId(),
    eventName,
    payload: { source: source(), locale: 'zh', ...payload },
  });
  // 🚨 用 text/plain（CORS 安全列表类型）而非 application/json：跨域 application/json 会触发
  // OPTIONS 预检，而 sendBeacon 发预检请求在微信内置浏览器（iOS WKWebView / 安卓 X5）里极不可靠、
  // 经常静默丢失 → PV 被系统性少算。text/plain 是「简单请求」不预检，微信里也能稳送。
  // 后端 /worldcup-quiz/events 路由已配置把 text/plain 当 JSON 解析。
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    } else {
      void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body, keepalive: true });
    }
  } catch {
    // 打点失败静默，绝不影响游戏
  }
}
