import { useEffect, useMemo, useRef, useState } from 'react';
import { buildQuiz, goldScore, percentBeaten, type Answered, type Question } from './quiz';
import { percentileQuip, rightQuip, tierOf, wrongQuip } from './humor';
import { makePoster } from './share';

type Stage = 'home' | 'quiz' | 'result';

export default function App() {
  const [stage, setStage] = useState<Stage>('home');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answered[]>([]);

  const start = () => {
    setQuiz(buildQuiz());
    setAnswers([]);
    setStage('quiz');
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
          <span>2026 世界杯特别企划</span>
          <b>2 分钟</b>
        </div>
        <div className="home-ball">⚽</div>
        <p className="home-kicker">World Cup Fan Check</p>
        <h1 className="home-title">
          球迷<span className="gold-text">含金量</span>检测
        </h1>
        <p className="home-sub">
          15 张球星脸，测出你看的是球，还是热闹。
          <br />
          看球二十年？先过了这关再说。
        </p>
        <div className="tier-teaser">
          <span>🥉 纯黄铜</span>
          <span>🍺 电镀金</span>
          <span>💍 24K</span>
          <span>👑 球王</span>
        </div>
        <button className="btn-primary btn-big" onClick={onStart}>
          开始检测 →
        </button>
        <div className="home-stats" aria-label="测试说明">
          <span>
            <b>38</b>
            支球队
          </span>
          <span>
            <b>256</b>
            名球员
          </span>
          <span>
            <b>15</b>
            题随机
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

function Quiz({ quiz, onDone }: { quiz: Question[]; onDone: (ans: Answered[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const q = quiz[idx];

  // 预加载下一题图片，翻题零等待
  useEffect(() => {
    const next = quiz[idx + 1];
    if (next) {
      const img = new Image();
      img.src = next.player.image;
    }
  }, [idx, quiz]);

  const pick = (opt: string) => {
    if (picked) return;
    const a: Answered = { question: q, picked: opt, correct: opt === q.player.nameZh };
    setPicked(opt);
    setQuip(a.correct ? rightQuip(a) : wrongQuip(a));
    const next = [...answers, a];
    setAnswers(next);
    timer.current = window.setTimeout(() => {
      setPicked(null);
      setQuip(null);
      if (idx + 1 >= quiz.length) onDone(next);
      else setIdx(idx + 1);
    }, a.correct ? 900 : 1700);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="screen">
      <div className="progress">
        <span className="q-num">Q{idx + 1}</span>
        <div className="dots">
          {quiz.map((_, i) => (
            <i key={i} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
          ))}
        </div>
        <span className="q-total">/{quiz.length}</span>
      </div>
      <div className="quiz-card">
        <div className="photo-frame" key={q.player.id}>
          <div className="photo-card">
            <img src={q.player.image} alt="这位球星是谁？" draggable={false} />
          </div>
          <span className="photo-tag">⚽ 2026 世界杯在册球员</span>
        </div>
        <h2 className="q-title">这位是谁？</h2>
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
  const [shown, setShown] = useState(0);
  const [poster, setPoster] = useState<string | null>(null);

  // 微信里直接转发链接时，分享卡标题 = 当前 document.title → 变成晒成绩
  useEffect(() => {
    document.title = `我是${tier.name}，打败了全国 ${beaten}% 的球迷 ⚽`;
    // iOS 微信不随 SPA 更新 title 的经典 hack：挂一个瞬时 iframe 强制刷新
    if (/MicroMessenger/i.test(navigator.userAgent) && /iP(hone|ad|od)/i.test(navigator.userAgent)) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = './brand/jr-box.svg';
      iframe.onload = () => window.setTimeout(() => iframe.remove(), 0);
      document.body.appendChild(iframe);
    }
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [tier.name, beaten]);

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
        <div className="result-header">
          <p className="result-kicker">检测结果</p>
          <span>本局战报</span>
        </div>
        <div className="medal-ring">
          <span>{tier.emoji}</span>
        </div>
        <h2 className="tier-name">{tier.name}</h2>
        <div className="gold-num gold-text">
          {shown}
          <span>%</span>
        </div>
        <p className="gold-label">⚜️ 球迷含金量 ⚜️</p>
        <p className="tier-line">“{tier.line}”</p>
        <div className="beaten-box">
          <p className="beaten">
            打败了全国 <b>{beaten}%</b> 的球迷
          </p>
          <p className="beaten-quip">{percentileQuip(beaten)}</p>
        </div>
        <p className="score-detail">
          答对 {answers.length - wrongCount}/{answers.length} · 难题加权计分
        </p>
        <div className="result-metrics" aria-label="本次答题数据">
          <span>
            <b>{answers.length - wrongCount}</b>
            答对
          </span>
          <span>
            <b>{wrongCount}</b>
            错题
          </span>
          <span>
            <b>{shown}%</b>
            含金量
          </span>
        </div>
      </div>

      <div className="actions">
        <button className="btn-primary btn-big" onClick={async () => setPoster(await makePoster(gold, tier, beaten))}>
          📸 生成我的含金量战报
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
