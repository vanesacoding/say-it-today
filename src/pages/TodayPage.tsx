import { useMemo, useState } from 'react'
import type { Card, Rating, Settings } from '../types'
import { isDue } from '../utils/srs'
import { LearningCard } from '../components/LearningCard'
import { ProgressBar } from '../components/ProgressBar'

export const DAILY_CARD_LIMIT = 8

export function makeQueue(cards: Card[]) {
  const target = cards.filter((card) => card.tags.some((tag) => tag === '商务英语' || tag === '日常进阶'))
  const due = target.filter((card) => isDue(card))
  const fresh = target.filter((card) => card.status === 'new')
  const business = fresh.filter((card) => card.tags.includes('商务英语'))
  const daily = fresh.filter((card) => card.tags.includes('日常进阶'))
  const mixed = Array.from({ length: Math.max(business.length, daily.length) }, (_, index) => [business[index], daily[index]]).flat().filter(Boolean) as Card[]
  const ordered = [...due, ...mixed.filter((card) => !due.some((item) => item.id === card.id))]
  return ordered.slice(0, DAILY_CARD_LIMIT)
}

export function TodayPage({ cards, settings, onUpdate }: { cards: Card[]; settings: Settings; onUpdate: (card: Card, rating?: Rating) => void }) {
  const initialQueue = useMemo(() => makeQueue(cards), []) // today's set stays stable while answering
  const [queue, setQueue] = useState(initialQueue)
  const [started, setStarted] = useState(false)
  const total = initialQueue.length
  const businessCount = initialQueue.filter((item) => item.tags.includes('商务英语')).length
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
      <header className="home-top"><div><p>{date}</p><h1>今天，只学 5 分钟</h1></div><div className="home-avatar">6.5</div></header>
      <section className="home-goal">
        <span className="eyebrow">TODAY'S 5 MINUTES</span><h2>商务沟通 · 日常进阶</h2>
        <p>适合雅思 6.5：少背基础词，多练自然、得体的表达。</p><div className="home-stamp">今日<br />未完成</div>
        <div className="home-segments" aria-label={`已完成 ${completed}，共 ${total} 句`}>{Array.from({ length: total }, (_, index) => <i className={index < completed ? 'done' : ''} key={index} />)}</div>
      </section>
      <div className="home-section-title"><h2>接着学</h2><span>还剩 {queue.length} 句</span></div>
      <article className="home-next">
        {card.image && <img src={card.image} alt={card.cn} />}
        <div><small>下一个表达</small><h2>{card.expression}</h2><p>{card.cn.replace('他/她有点', '').replace('。', '')}的 · 今日新表达</p><div><span className="state-pill learned">新词</span><span className="state-pill new">容易混淆</span></div></div>
      </article>
      <article className="home-review"><div><b>今日输入 · {total} 句</b><p>商务 {businessCount} 句 + 日常进阶 {total - businessCount} 句</p></div><span>约 5 分钟</span></article>
      <button className="home-start" onClick={() => setStarted(true)}>开始 5 分钟</button>
    </main>
  }

  return <main className="page today-page">
    <button className="study-back" onClick={() => setStarted(false)}>‹ 返回今日目标</button>
    <header className="today-header"><div><span className="eyebrow">TODAY'S 5 MINUTES</span><h1>{card?.theme ?? '商务与日常进阶'}</h1></div><p>还剩 <b>{queue.length}</b> 句</p></header>
    <ProgressBar value={completed} max={total} />
    {card ? <LearningCard card={card} locale={settings.accent} showChinese={settings.showChinese} autoPlay={settings.autoPlay}
      onFavorite={toggleFavorite} onRate={next} /> : <section className="empty-state"><span>✓</span><h2>今天完成了</h2><p>这些句子已经排进下一次复习。</p></section>}
  </main>
}
