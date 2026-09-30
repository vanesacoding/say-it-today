import { useMemo, useState } from 'react'
import type { Card } from '../types'
import { sceneName } from '../data/scenes'

type Filter = 'favorite' | 'wrong' | 'ai' | 'mastered' | 'confused'
const filters: { id: Filter; label: string }[] = [{ id: 'favorite', label: '收藏' }, { id: 'wrong', label: '做错' }, { id: 'ai', label: 'AI 生成' }, { id: 'mastered', label: '已掌握' }, { id: 'confused', label: '易混表达' }]

export function MyCardsPage({ cards, onUpdate, onDelete }: { cards: Card[]; onUpdate: (card: Card) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('favorite')
  const shown = useMemo(() => cards.filter((card) => filter === 'favorite' ? card.favorite : filter === 'wrong' ? card.wrongCount > 0 : filter === 'ai' ? card.source === 'ai' : filter === 'mastered' ? card.status === 'mastered' : ['reach', 'arrive', 'get to'].some((term) => card.expression.includes(term) || card.sentence.toLowerCase().includes(term))), [cards, filter])
  return <main className="page"><header className="section-header"><div><span className="eyebrow">YOUR ENGLISH</span><h1>我的</h1><p>{cards.length} 句正在变成你的表达。</p></div></header><div className="filter-row">{filters.map((item) => <button className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><div className="sentence-list">{shown.length ? shown.map((card) => <article key={card.id}><small>{sceneName(card.scene)}</small><p>{card.cn}</p><b>{card.sentence}</b><div className="inline-actions"><button onClick={() => onUpdate({ ...card, favorite: !card.favorite })}>{card.favorite ? '取消收藏' : '收藏'}</button><button onClick={() => {
    const cn = prompt('修改中文', card.cn); const sentence = prompt('修改英文', card.sentence)
    if (cn && sentence) onUpdate({ ...card, cn, sentence, correctExample: sentence })
  }}>修改</button><button className="danger" onClick={() => confirm('删除这张卡片？') && onDelete(card.id)}>删除</button></div></article>) : <section className="empty-state compact"><p>这里还没有句子。</p></section>}</div></main>
}
