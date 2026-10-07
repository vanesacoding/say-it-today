import { useEffect, useState } from 'react'
import type { Card, Rating, Settings } from '../types'
import { sceneName } from '../data/scenes'
import { shuffleOptions } from '../utils/dailyPlan'
import { SpeechButton } from './SpeechButton'

export function LearningCard({ card, settings, busy, active = true, onFavorite, onRate }: {
  card: Card; settings: Settings; busy: boolean; active?: boolean
  onFavorite: () => Promise<void>; onRate: (rating: Rating, correct: boolean) => Promise<void>
}) {
  const [options] = useState(() => shuffleOptions(card.options))
  const [timed] = useState(Boolean(settings.timedChallenge))
  const [selected, setSelected] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(8)
  const [timedOut, setTimedOut] = useState(false)
  const [recalling, setRecalling] = useState(false)
  useEffect(() => {
    if (revealed || !timed || !active) return
    if (timeLeft === 0) { setTimedOut(true); setRevealed(true); return }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [revealed, timeLeft, timed, active])
  const rate = (rating: Rating) => { void onRate(rating, selected === card.answer).catch(() => {}) }
  return <article className="learning-card">
    <div className="card-meta"><span>{card.theme ?? sceneName(card.scene)}</span>{timed ? <div className="countdown" aria-label={`剩余 ${timeLeft} 秒`}>{revealed ? '✓' : timeLeft}</div> : <span className="untimed">慢慢想</span>}<button className="heart" disabled={busy} onClick={() => void onFavorite().catch(() => {})} aria-label={card.favorite ? '取消收藏' : '收藏'} aria-pressed={card.favorite}>{card.favorite ? '♥' : '♡'}</button></div>
    {!revealed && card.image && <img className="card-image" src={card.image} alt={card.cn} />}
    {settings.showChinese && <p className="cn">{card.cn}</p>}
    {!recalling && <>
      {!revealed && <h2>{card.question}</h2>}
      {!revealed && <div className="options">{options.map((option, index) => <button key={option} className={selected === option ? 'selected' : ''} aria-pressed={selected === option} onClick={() => setSelected(option)}><b>{String.fromCharCode(65 + index)}</b>{option}</button>)}</div>}
      {!revealed && <div className="question-actions"><button className="primary" disabled={!selected} onClick={() => setRevealed(true)}>提交答案</button><button className="text-button" onClick={() => setRevealed(true)}>暂时不会，看答案</button></div>}
      {revealed && <>
        <section className={`answer ${selected === card.answer ? 'correct' : 'wrong'}`} aria-live="polite"><small>{selected === card.answer ? '答对了' : timedOut ? '时间到 · 参考答案' : selected ? '这题选错了 · 参考答案' : '参考答案'}</small><h3>{card.sentence}</h3>{settings.showChinese && <p>{card.cn}</p>}<SpeechButton text={card.sentence} locale={settings.accent} /></section>
        <section className="explanation"><span className="eyebrow">一个知识点</span><h3>{card.expression}</h3>{card.phonetic && <p className="phonetic">{card.phonetic}</p>}<p>{card.explanation}</p>{card.wrongExample && <p className="muted"><em>易错写法：</em>{card.wrongExample}</p>}{card.alternatives[0] && <p className="alternative"><small>另一种说法</small>{card.alternatives[0]}</p>}</section>
      </>}
    </>}
    {revealed && <>
      <section className="recall-practice"><h3>{recalling ? '不看答案，自己说一遍' : '让这句真正变成你的表达'}</h3><p>{recalling ? card.cn : '听一句，再遮住答案，试着用英语说出来。不需要录音。'}</p><button className="secondary" onClick={() => setRecalling(!recalling)}>{recalling ? '显示答案，自己对照' : '遮住答案，自己说'}</button></section>
      <p className="rating-hint">按不看答案时的熟悉程度选择：</p><div className="review-buttons"><button disabled={busy} onClick={() => rate('again')}>不会<small>明天</small></button><button disabled={busy} onClick={() => rate('familiar')}>有点熟<small>3 天</small></button><button disabled={busy} className="known" onClick={() => rate('known')}>会了<small>{card.reviewInterval >= 7 ? card.reviewInterval >= 14 ? '30 天' : '14 天' : '7 天'}</small></button></div>{busy && <p role="status">正在保存…</p>}
    </>}
  </article>
}
