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
      <div className="home-ball">⚽</div>
      <h1>球迷含金量检测</h1>
      <p className="home-sub">
        10 张球星脸，测出你看的是球，还是热闹。
        <br />
        看球二十年？先过了这关再说。
      </p>
      <button className="btn-primary" onClick={onStart}>
        开始检测
      </button>
      <p className="home-hint">本届世界杯 38 队 256 名在册球员随机出题 · 全程 90 秒</p>
    </div>
  );
}

function Quiz({ quiz, onDone }: { quiz: Question[]; onDone: (ans: Answered[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const q = quiz[idx];

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
    }, a.correct ? 900 : 1600);
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
      </div>
      <div className="photo-card" key={q.player.id}>
        <img src={q.player.image} alt="这位球星是谁？" draggable={false} />
      </div>
      <h2 className="q-title">这位是谁？</h2>
      <div className="options">
        {q.options.map((opt) => {
          let cls = 'option';
          if (picked) {
            if (opt === q.player.nameZh) cls += ' right';
            else if (opt === picked) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={opt} className={cls} onClick={() => pick(opt)}>
              {opt}
              {picked && opt === q.player.nameZh && ' ✅'}
              {picked && opt === picked && opt !== q.player.nameZh && ' ❌'}
            </button>
          );
        })}
      </div>
      <p className={`quip ${quip ? 'show' : ''}`}>{quip ?? ' '}</p>
    </div>
  );
}

function Result({ answers, onRetry }: { answers: Answered[]; onRetry: () => void }) {
  const gold = useMemo(() => goldScore(answers), [answers]);
  const wrongs = answers.filter((a) => !a.correct);
  const tier = useMemo(() => tierOf(gold, wrongs.length === answers.length), [gold, wrongs.length, answers.length]);
  const beaten = percentBeaten(gold);
  const [shown, setShown] = useState(0);
  const [poster, setPoster] = useState<string | null>(null);

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
      <div className="tier-badge">{tier.emoji}</div>
      <h2 className="tier-name">{tier.name}</h2>
      <div className="gold-num">
        {shown}
        <span>%</span>
      </div>
      <p className="gold-label">球迷含金量</p>
      <p className="tier-line">“{tier.line}”</p>
      <p className="beaten">
        打败了全国 <b>{beaten}%</b> 的球迷
      </p>
      <p className="beaten-quip">{percentileQuip(beaten)}</p>

      {wrongs.length > 0 && (
        <div className="review">
          <h3>错题回顾（原来是他！）</h3>
          <div className="review-row">
            {wrongs.map((a) => (
              <div className="review-card" key={a.question.player.id}>
                <img src={a.question.player.image} alt={a.question.player.nameZh} loading="lazy" />
                <b>{a.question.player.nameZh}</b>
                <span>你选：{a.picked}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={async () => setPoster(await makePoster(gold, tier, beaten))}>
          生成我的含金量战报
        </button>
        <button className="btn-ghost" onClick={onRetry}>
          再测一次（换一批题）
        </button>
      </div>

      <div className="brand">
        <img src="./brand/jr-box.svg" alt="匠人学院" className="brand-logo" />
        <p className="brand-ai">🤖 这个测试是 AI 一个晚上做出来的</p>
        <p className="brand-line">想学会让 AI 替你干活？</p>
        <a className="btn-primary brand-cta" href="https://jiangren.com.au/?utm_source=worldcup-quiz&utm_medium=h5&utm_campaign=worldcup2026" target="_blank" rel="noreferrer">
          学 AI 来匠人 →
        </a>
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
