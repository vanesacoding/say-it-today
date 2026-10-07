import { useState } from 'react'
import type { Card, Rating, Settings } from '../types'
import { isDue } from '../utils/srs'
import { LearningCard } from '../components/LearningCard'
import { SpeechButton } from '../components/SpeechButton'

const filters = [{ id: 'favorite', label: '收藏' }, { id: 'due', label: '待复习' }, { id: 'learned', label: '学过' }, { id: 'wrong', label: '错题' }, { id: 'all', label: '全部' }] as const
export function MyCardsPage({ cards, settings, busy, onUpdate, onRate }: {
  cards: Card[]; settings: Settings; busy: boolean; onUpdate: (card: Card) => Promise<void>
  onRate: (card: Card, rating: Rating, correct: boolean) => Promise<void>
}) {
  const [filter, setFilter] = useState<string>('favorite')
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const card = cards.find((item) => item.id === practiceId)
  const shown = cards.filter((item) => filter === 'favorite' ? item.favorite : filter === 'due' ? isDue(item) : filter === 'learned' ? item.status !== 'new' : filter === 'wrong' ? item.wrongCount > 0 : true)
  if (card) return <main className="page"><button className="study-back" onClick={() => setPracticeId(null)}>‹ 返回我的表达</button><h1>再练一句</h1><LearningCard key={card.id} card={card} settings={settings} busy={busy} onFavorite={() => onUpdate({ ...card, favorite: !card.favorite })} onRate={async (rating, correct) => { await onRate(card, rating, correct); setPracticeId(null) }} /></main>
  return <main className="page"><header className="section-header"><div><span className="eyebrow">YOUR ENGLISH</span><h1>我的表达</h1><p>收藏、回看，再练一次。</p></div></header><div className="filter-row" aria-label="表达筛选">{filters.map((item) => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><div className="sentence-list">{shown.length ? shown.map((item) => <article key={item.id}><small>{item.theme ?? item.expression}</small><p>{item.cn}</p><b>{item.sentence}</b><SpeechButton text={item.sentence} locale={settings.accent} /><div className="inline-actions"><button disabled={busy} onClick={() => void onUpdate({ ...item, favorite: !item.favorite }).catch(() => {})}>{item.favorite ? '取消收藏' : '收藏'}</button><button onClick={() => setPracticeId(item.id)}>再练一句</button></div>{item.nextReviewAt && <small>下次复习：{new Date(item.nextReviewAt).toLocaleDateString('zh-CN')}</small>}</article>) : <section className="empty-state compact"><p>{filter === 'due' ? '今天暂无到期复习。' : filter === 'favorite' ? '遇到想留住的表达，点一下爱心。' : '这里还没有句子。'}</p></section>}</div></main>
}
