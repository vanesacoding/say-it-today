import { useMemo, useState } from 'react'
import type { Card, Rating, Settings } from '../types'
import { isDue } from '../utils/srs'
import { LearningCard } from '../components/LearningCard'
import { ProgressBar } from '../components/ProgressBar'

function makeQueue(cards: Card[], settings: Settings) {
  const due = cards.filter((card) => isDue(card)).slice(0, settings.reviewPerDay)
  const yesterdayWrong = cards.filter((card) => card.wrongCount > 0 && card.status === 'learning' && !due.some((item) => item.id === card.id))
  const review = [...due, ...yesterdayWrong].slice(0, settings.reviewPerDay)
  const fresh = cards.filter((card) => card.status === 'new').slice(0, settings.newPerDay)
  return [...review, ...fresh]
}

export function TodayPage({ cards, settings, onUpdate }: { cards: Card[]; settings: Settings; onUpdate: (card: Card, rating?: Rating) => void }) {
  const initialQueue = useMemo(() => makeQueue(cards, settings), []) // today's set stays stable while answering
  const [queue, setQueue] = useState(initialQueue)
  const [started, setStarted] = useState(false)
  const total = initialQueue.length
  const card = queue[0]
  const completed = total - queue.length
  const next = (rating: Rating) => { onUpdate(card, rating); setQueue((items) => items.slice(1)) }
  const toggleFavorite = () => {
    const updated = { ...card, favorite: !card.favorite }
    onUpdate(updated)
    setQueue((items) => [updated, ...items.slice(1)])
  }

  if (!started && card) {
    const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
    return <main className="page today-home">
      <header className="home-top"><div><p>{date}</p><h1>今天，轻松学一点</h1></div><div className="home-avatar">XY</div></header>
      <section className="home-goal">
        <span className="eyebrow">TODAY'S THEME</span><h2>{card.theme ?? '今日英语'}</h2>
        <p>认识一个人，从更自然的形容词开始。</p><div className="home-stamp">今日<br />未完成</div>
        <div className="home-segments" aria-label={`已完成 ${completed}，共 ${total} 句`}>{Array.from({ length: Math.max(total, 5) }, (_, index) => <i className={index < completed ? 'done' : ''} key={index} />)}</div>
      </section>
      <div className="home-section-title"><h2>接着学</h2><span>还剩 {queue.length} 句</span></div>
      <article className="home-next">
        {card.image && <img src={card.image} alt={card.cn} />}
        <div><small>下一个表达</small><h2>{card.expression}</h2><p>{card.cn.replace('他/她有点', '').replace('。', '')}的 · 今日新表达</p><div><span className="state-pill learned">新词</span><span className="state-pill new">容易混淆</span></div></div>
      </article>
      <article className="home-review"><div><b>待复习 · {settings.reviewPerDay} 句</b><p>先复习，再学新表达</p></div><span>约 3 分钟</span></article>
      <button className="home-start" onClick={() => setStarted(true)}>开始今日学习</button>
    </main>
  }

  return <main className="page today-page">
    <button className="study-back" onClick={() => setStarted(false)}>‹ 返回今日目标</button>
    <header className="today-header"><div><span className="eyebrow">TODAY'S THEME</span><h1>{card?.theme ?? '今日英语'}</h1></div><p>还剩 <b>{queue.length}</b> 句</p></header>
    <ProgressBar value={completed} max={total} />
    {card ? <LearningCard card={card} locale={settings.accent} showChinese={settings.showChinese} autoPlay={settings.autoPlay}
      onFavorite={toggleFavorite} onRate={next} /> : <section className="empty-state"><span>✓</span><h2>今天完成了</h2><p>这些句子已经排进下一次复习。</p></section>}
  </main>
}
