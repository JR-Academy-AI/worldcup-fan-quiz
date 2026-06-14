import { useEffect, useMemo, useRef, useState } from 'react';
import { buildQuiz, goldScore, percentBeaten, PLAYERS, type Answered, type Question } from './quiz';
import { percentileQuip, rightQuip, shareTitleOf, SHARE_TEMPLATE_COUNT, tierOf, timeoutQuip, wrongQuip } from './humor';
import { makePoster } from './share';
import { track } from './track';

type Stage = 'home' | 'quiz' | 'result';

export default function App() {
  const [stage, setStage] = useState<Stage>('home');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answered[]>([]);

  // 微信分享缩略图随机换成球星脸（只用难度 1 的国民级面孔，保证缩略图一眼认出）+ 落地页埋点
  useEffect(() => {
    const stars = PLAYERS.filter((p) => p.difficulty === 1);
    const star = stars[Math.floor(Math.random() * stars.length)];
    const img = document.getElementById('share-thumb-img') as HTMLImageElement | null;
    if (img && star) img.src = star.image;
    track('page_view');
  }, []);

  const start = () => {
    setQuiz(buildQuiz());
    setAnswers([]);
    setStage('quiz');
    track('quiz_start');
  };

  return (
    <div className="app">
      {stage === 'home' && <Home onStart={start} />}
      {stage === 'quiz' && (
        <Quiz
          quiz={quiz}
          onDone={(ans) => {
            setAnswers(ans);
            setStage('result');
          }}
        />
      )}
      {stage === 'result' && <Result answers={answers} onRetry={start} />}
    </div>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen home">
      <div className="pitch-deco" aria-hidden />
      <div className="home-panel">
        <div className="home-topline">
          <span className="home-pill">🏆 2026 世界杯特别企划</span>
          <b className="home-pill">⏱ 2 分钟完成</b>
        </div>
        <div className="home-hero-art" aria-hidden>
          <div className="home-stadium-glow" />
          <img src="./worldcup-assets/ball-badge.png" alt="" className="home-ball-img" />
          <img src="./worldcup-assets/crown.png" alt="" className="home-crown-img" />
        </div>
        <p className="home-kicker">World Cup Fan Check</p>
        <h1 className="home-title">
          <span>测测你的</span>
          <strong>
            球迷<span className="gold-text">含金量</span>
          </strong>
        </h1>
        <p className="home-sub">
          15 张球星脸，一眼识破你的球迷段位。
          <br />
          真球迷，先过这关。
        </p>
        <div className="tier-ribbon">你的球迷段位</div>
        <div className="tier-teaser">
          <span>
            <img src="./worldcup-assets/bronze-medal.png" alt="" />
            纯黄铜
          </span>
          <span>
            <img src="./worldcup-assets/beer.png" alt="" />
            电镀金
          </span>
          <span>
            <i>💍</i>
            24K
          </span>
          <span>
            <img src="./worldcup-assets/crown.png" alt="" />
            球王
          </span>
        </div>
        <button className="btn-primary btn-big" onClick={onStart}>
          立即测含金量 →
        </button>
        <div className="home-stats" aria-label="测试说明">
          <span>
            <img src="./worldcup-assets/ball-badge.png" alt="" />
            <b>256</b>
            名球员题库
          </span>
          <span>
            <img src="./worldcup-assets/checklist.png" alt="" />
            <b>15</b>
            道随机题
          </span>
          <span>
            <img src="./worldcup-assets/ai-badge.png" alt="" />
            <b>AI</b>
            生成吐槽
          </span>
        </div>
      </div>
      <p className="home-hint">每次出题都不同 · 答错会被无情吐槽</p>
      <p className="home-brand">
        <img src="./brand/jr-box.svg" alt="匠人学院" className="home-brand-box" />
        <img src="./brand/tagline-xueai-laijiangren.png" alt="学 AI 来匠人" className="home-brand-tagline" />
      </p>
    </div>
  );
}

const LETTERS = ['A', 'B', 'C', 'D'];
const COUNTDOWN_TENTHS = 50; // 每题 5 秒
const TIMEOUT_PICK = '⏰ 超时未答';

function Quiz({ quiz, onDone }: { quiz: Question[]; onDone: (ans: Answered[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const [tenths, setTenths] = useState(COUNTDOWN_TENTHS);
  const timer = useRef<number | undefined>(undefined);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const q = quiz[idx];

  // 预加载下一题图片，翻题零等待
  useEffect(() => {
    const next = quiz[idx + 1];
    if (next) {
      const img = new Image();
      img.src = next.player.image;
    }
  }, [idx, quiz]);

  const settle = (a: Answered, holdMs: number) => {
    setPicked(a.picked);
    setQuip(a.correct ? rightQuip(a) : a.picked === TIMEOUT_PICK ? timeoutQuip(a) : wrongQuip(a));
    const next = [...answersRef.current, a];
    setAnswers(next);
    timer.current = window.setTimeout(() => {
      setPicked(null);
      setQuip(null);
      if (idx + 1 >= quiz.length) onDone(next);
      else setIdx(idx + 1);
    }, holdMs);
  };

  const pick = (opt: string) => {
    if (picked) return;
    const correct = opt === q.player.nameZh;
    settle({ question: q, picked: opt, correct }, correct ? 900 : 1700);
  };

  // 5 秒倒计时：每题重置，作答即停，归零按超时结算
  useEffect(() => {
    if (picked) return;
    setTenths(COUNTDOWN_TENTHS);
    const t = window.setInterval(() => {
      setTenths((n) => {
        if (n <= 1) {
          window.clearInterval(t);
          settle({ question: quiz[idx], picked: TIMEOUT_PICK, correct: false }, 1700);
          return 0;
        }
        return n - 1;
      });
    }, 100);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, picked]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const urgency = picked ? 'paused' : tenths <= 20 ? 'danger' : tenths <= 30 ? 'warn' : 'ok';

  return (
    <div className="screen">
      <div className="progress">
        <div className="progress-copy">
          <span className="q-num">Q{idx + 1}</span>
          <span className="q-total">/{quiz.length}</span>
        </div>
        <div className="progress-track" aria-label={`第 ${idx + 1} 题，共 ${quiz.length} 题`}>
          <span className="progress-fill" style={{ width: `${((idx + 1) / quiz.length) * 100}%` }} />
          <div className="dots">
            {quiz.map((_, i) => (
              <i key={i} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
            ))}
          </div>
        </div>
        <span className="progress-badge">{idx + 1}/{quiz.length}</span>
      </div>
      <div className="quiz-card">
        <div className="photo-frame" key={q.player.id}>
          <div className="photo-card">
            <img src={q.player.image} alt="这位球星是谁？" draggable={false} />
          </div>
          <span className="photo-tag">⚽ 2026 世界杯在册球员</span>
        </div>
        <h2 className="q-title">这位是谁？</h2>
        <div className={`countdown ${urgency}`} aria-label="倒计时">
          <span className="countdown-num">{picked ? '⏸' : `${Math.ceil(tenths / 10)}s`}</span>
          <span className="countdown-track">
            <i style={{ width: `${(tenths / COUNTDOWN_TENTHS) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className="options">
        {q.options.map((opt, i) => {
          let cls = 'option';
          if (picked) {
            if (opt === q.player.nameZh) cls += ' right';
            else if (opt === picked) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={opt} className={cls} onClick={() => pick(opt)}>
              <span className="opt-letter">{LETTERS[i]}</span>
              <span className="opt-name">{opt}</span>
              <span className="opt-mark">
                {picked && opt === q.player.nameZh && '✅'}
                {picked && opt === picked && opt !== q.player.nameZh && '❌'}
              </span>
            </button>
          );
        })}
      </div>
      <p className={`quip ${quip ? 'show' : ''}`}>{quip ?? ' '}</p>
    </div>
  );
}

const DEFAULT_TITLE = '球迷含金量检测 ⚽ — 测测你是纯金球迷还是纯黄铜';

function Result({ answers, onRetry }: { answers: Answered[]; onRetry: () => void }) {
  const gold = useMemo(() => goldScore(answers), [answers]);
  const wrongCount = answers.filter((a) => !a.correct).length;
  const tier = useMemo(() => tierOf(gold, wrongCount === answers.length), [gold, wrongCount, answers.length]);
  const beaten = percentBeaten(gold);
  const topRank = 100 - beaten;
  const [shown, setShown] = useState(0);
  const [poster, setPoster] = useState<string | null>(null);
  const [shareGuide, setShareGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('wcq_name') ?? '');
  const [nameModal, setNameModal] = useState(true); // 进结果页先弹窗签名（可跳过）
  const composingRef = useRef(false); // 中文 IME 组合中（拼音未上屏）标记

  const displayName = name.trim() || '本帝';
  const allWrong = wrongCount === answers.length;
  // 裂变文案：从文案池随机挑一条（进结果页固定，输名字时不跳变），多人分享不重样
  const [shareIdx] = useState(() => Math.floor(Math.random() * SHARE_TEMPLATE_COUNT));
  const shareTitle = shareTitleOf({ name: displayName, gold, beaten, tier, allWrong }, shareIdx);

  const onName = (v: string, composing = false) => {
    // 中文 IME 组合中（拼音还没上屏）：原样反映，不截断、不写库——否则拼音被 slice 截断，永远凑不出汉字
    if (composing) {
      setName(v);
      return;
    }
    const clean = v.slice(0, 8); // 限 8 字（按最终字数，不按拼音长度）：防刷屏 + 海报排版不崩
    setName(clean);
    localStorage.setItem('wcq_name', clean);
  };

  const share = async () => {
    track('share_click', { tier: tier.name, goldScore: gold });
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      setShareGuide(true); // 微信内：引导点右上角 ··· 菜单
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareTitle, url: location.href });
      } catch {
        // 用户取消系统分享面板，无需处理
      }
      return;
    }
    await navigator.clipboard?.writeText(`${shareTitle} ${location.href}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  // 微信里直接转发链接时，分享卡标题 = 当前 document.title → 变成「XX的战绩，不服来测」
  useEffect(() => {
    document.title = shareTitle;
    // iOS 微信不随 SPA 更新 title 的经典 hack：挂一个瞬时 iframe 强制刷新。
    // 🚨 只在签名弹窗关闭后跑——弹窗开着时每打一个字都会插 iframe，抢走输入框焦点、打断中文 IME
    //（表现为「一直 lost focus + 中文只剩拼音」）。
    if (!nameModal && /MicroMessenger/i.test(navigator.userAgent) && /iP(hone|ad|od)/i.test(navigator.userAgent)) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = './brand/jr-box.svg';
      iframe.onload = () => window.setTimeout(() => iframe.remove(), 0);
      document.body.appendChild(iframe);
    }
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [shareTitle, nameModal]);

  // 完成埋点：进结果页上报一次，带含金量 / 答对数 / 称号
  useEffect(() => {
    track('quiz_complete', { goldScore: gold, correctCount: answers.length - wrongCount, tier: tier.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 含金量数字滚动
  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.round(gold / 40));
    const t = window.setInterval(() => {
      n = Math.min(gold, n + step);
      setShown(n);
      if (n >= gold) window.clearInterval(t);
    }, 24);
    return () => window.clearInterval(t);
  }, [gold]);

  return (
    <div className="screen result">
      <div className="hero-card">
        <img src="./worldcup-assets/result-frame.png" alt="" className="result-frame-art" />
        <img src="./worldcup-assets/result-ribbon-beer.png" alt="" className="result-ribbon-art" />
        <div className="result-titlebar">
          <span>球迷含金量检测</span>
          <button className="share-fab" onClick={share} aria-label="分享战绩">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
            </svg>
            分享
          </button>
        </div>
        <h2 className="tier-name">{tier.name}</h2>
        <div className="gold-num gold-text">
          {shown}
          <span>%</span>
        </div>
        <p className="gold-label">⚽ 球迷含金量 ⚽</p>
        <p className="tier-line">“{tier.line}”</p>

        <div className="rank-panel">
          <div className="rank-badge">
            <img src="./worldcup-assets/result-rank-shield.png" alt="" />
            <span>TOP</span>
            <b>{topRank}%</b>
          </div>
          <div className="rank-copy">
            <p className="beaten">
              打败了全国 <b>{beaten}%</b> 的球迷
            </p>
            <p className="beaten-quip">{percentileQuip(beaten)}</p>
          </div>
        </div>

        <div className="result-metrics" aria-label="本次答题数据">
          <span>
            <b>🎯 答对 {answers.length - wrongCount}/{answers.length}</b>
          </span>
          <span>
            <b>⚖️ 难题加权计算</b>
          </span>
        </div>

        <section className="persona-card" aria-label="你的看球人设">
          <h3>你的看球人设</h3>
          <div className="persona-tags">
            <span>
              <img src="./worldcup-assets/result-football-fan.png" alt="" />
              进球就欢呼
            </span>
            <span>
              <img src="./worldcup-assets/result-cup.png" alt="" />
              重在参与
            </span>
          </div>
        </section>

        <section className="ai-verdict">
          <img src="./worldcup-assets/result-robot.png" alt="" />
          <div>
            <h3>AI 毒舌点评</h3>
            <p>兄弟，你的足球知识像薯片一样薄，但快乐是真的！</p>
          </div>
        </section>
      </div>

      <button className="name-reopen" onClick={() => setNameModal(true)}>
        ✍️ 分享署名：<b>{displayName}</b>
        <span>改名</span>
      </button>

      <div className="actions">
        <button
          className="btn-primary btn-big"
          onClick={async () => {
            track('share_click', { tier: tier.name, goldScore: gold, via: 'poster' });
            setPoster(await makePoster(gold, tier, beaten, answers, displayName));
          }}
        >
          <img src="./worldcup-assets/result-trophy.png" alt="" className="action-icon" />
          生成我的含金量战报
        </button>
        <button className="btn-ghost" onClick={onRetry}>
          🔄 再测一次（换一批题）
        </button>
      </div>

      <div className="brand-card">
        <img src="./brand/logo-zh-white.png" alt="匠人学院" className="brand-logo" />
        <p className="brand-ai">🤖 这个测试是 AI 一个晚上做出来的</p>
        <p className="brand-line">想学会让 AI 替你干活？</p>
        <a
          className="brand-cta"
          href="https://jiangren.com.au/?utm_source=worldcup-quiz&utm_medium=h5&utm_campaign=worldcup2026"
          target="_blank"
          rel="noreferrer"
        >
          <img src="./brand/tagline-xueai-laijiangren.png" alt="学 AI 来匠人" />
          <span>→</span>
        </a>
        <p className="brand-site">jiangren.com.au</p>
      </div>

      <details className="attribution">
        <summary>图片来源与署名（Wikipedia / Wikimedia Commons）</summary>
        <ul>
          {answers.map((a) => (
            <li key={a.question.player.id}>
              {a.question.player.nameZh} — {a.question.player.license}，作者 {a.question.player.artist}
              {a.question.player.commonsPage && (
                <>
                  {' '}
                  <a href={a.question.player.commonsPage} target="_blank" rel="noreferrer">
                    来源
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
        <p>本页面为球迷娱乐内容，与 FIFA 及任何球员无关联、无代言关系。</p>
      </details>

      {copied && <div className="copy-toast">✅ 战绩链接已复制，去粘贴给朋友吧</div>}

      {shareGuide && (
        <div className="share-guide" onClick={() => setShareGuide(false)}>
          <div className="share-guide-arrow">↗</div>
          <div className="share-guide-text">
            点右上角「···」
            <br />
            选择 <b>分享到朋友圈</b> 或 <b>发送给朋友</b>
          </div>
          <p className="share-guide-tip">分享卡片会自动带上你的战绩标题</p>
        </div>
      )}

      {nameModal && (
        <div className="name-mask">
          <div className="name-modal" onClick={(e) => e.stopPropagation()}>
            <span className="name-modal-emoji">✍️</span>
            <h3>留个名字再看战绩</h3>
            <p>
              分享出去就是「<b>{displayName}</b>的战绩」，
              <br />
              朋友更容易点开来跟你比
            </p>
            <input
              id="wcq-name"
              type="text"
              value={name}
              onChange={(e) => onName(e.target.value, composingRef.current)}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                onName(e.currentTarget.value, false);
              }}
              placeholder="输入你的名字 / 昵称"
              autoComplete="off"
              autoFocus
            />
            <button className="btn-primary btn-big" onClick={() => setNameModal(false)}>
              {name.trim() ? `就用「${displayName}」，看战绩 →` : '看我的战绩 →'}
            </button>
            <button className="name-skip" onClick={() => setNameModal(false)}>
              跳过，叫我「本帝」就行
            </button>
          </div>
        </div>
      )}

      {poster && (
        <div className="poster-mask" onClick={() => setPoster(null)}>
          <div className="poster-box" onClick={(e) => e.stopPropagation()}>
            <img src={poster} alt="长按保存分享图" />
            <p>长按图片保存 → 发朋友圈</p>
            <button className="btn-ghost" onClick={() => setPoster(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
