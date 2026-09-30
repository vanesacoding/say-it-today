import { useEffect, useState } from 'react'
import type { Card, Rating } from '../types'
import { sceneName } from '../data/scenes'
import { RepeatButton, SpeechButton } from './SpeechButton'

export function LearningCard({ card, locale, showChinese, autoPlay, onFavorite, onRate }: {
  card: Card; locale: string; showChinese: boolean; autoPlay: boolean
  onFavorite: () => void; onRate: (rating: Rating) => void
}) {
  const [selected, setSelected] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(8)
  useEffect(() => { setSelected(''); setRevealed(false); setTimeLeft(8) }, [card.id])
  useEffect(() => {
    if (revealed) return
    if (timeLeft === 0) return setRevealed(true)
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [revealed, timeLeft])
  useEffect(() => {
    if (autoPlay && revealed && 'speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(card.sentence); speech.lang = locale; speechSynthesis.speak(speech)
    }
  }, [autoPlay, card.sentence, locale, revealed])

  return <article className="learning-card">
    <div className="card-meta"><span>{card.theme ?? sceneName(card.scene)}</span><div className={`countdown ${timeLeft <= 3 ? 'urgent' : ''}`} aria-label={`剩余 ${timeLeft} 秒`}>{revealed ? '✓' : timeLeft}</div><button className="heart" onClick={onFavorite} aria-label={card.favorite ? '取消收藏' : '收藏'}>{card.favorite ? '♥' : '♡'}</button></div>
    {card.image && <img className="card-image" src={card.image} alt={card.cn} />}
    {showChinese && <p className="cn">{card.cn}</p>}
    <h2>{card.question}</h2>
    <div className="options">
      {card.options.map((option, index) => <button key={option} className={selected === option ? 'selected' : ''} disabled={revealed} onClick={() => setSelected(option)}>
        <b>{String.fromCharCode(65 + index)}</b>{option}
      </button>)}
    </div>
    {!revealed ? <button className="primary" disabled={!selected} onClick={() => setRevealed(true)}>提交答案</button> : <>
      <section className={`answer ${selected === card.answer ? 'correct' : 'wrong'}`}>
        <small>{selected === card.answer ? '答对了' : selected ? '正确答案' : '时间到 · 正确答案'}</small>
        <h3>{card.sentence}</h3>
        {showChinese && <p>{card.cn}</p>}
      </section>
      <section className="explanation">
        <span className="eyebrow">一个知识点</span>
        <h3>{card.expression}</h3><p>{card.explanation}</p>
        <p><em>✓</em> {card.correctExample}</p><p className="muted"><em>×</em> {card.wrongExample}</p>
        {card.alternatives[0] && <p className="alternative"><small>更自然的说法</small>{card.alternatives[0]}</p>}
      </section>
      <div className="speech-row"><SpeechButton text={card.sentence} locale={locale} /><RepeatButton text={card.sentence} locale={locale} /></div>
      <div className="review-buttons"><button onClick={() => onRate('again')}>不会<small>明天</small></button><button onClick={() => onRate('familiar')}>有点熟<small>3 天</small></button><button className="known" onClick={() => onRate('known')}>会了<small>{card.reviewInterval >= 7 ? card.reviewInterval >= 14 ? '30 天' : '14 天' : '7 天'}</small></button></div>
    </>}
  </article>
}
