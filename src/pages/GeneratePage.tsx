import { useState } from 'react'
import { scenes } from '../data/scenes'
import { generateCards } from '../services/ai'
import type { Card, Settings } from '../types'

export function GeneratePage({ settings, initialScene, onSave }: { settings: Settings; initialScene?: string; onSave: (cards: Card[]) => void }) {
  const [mode, setMode] = useState<'single' | 'scene'>(initialScene ? 'scene' : 'single')
  const [text, setText] = useState('')
  const [scene, setScene] = useState(initialScene ?? 'airport')
  const [count, setCount] = useState(10)
  const [cards, setCards] = useState<Card[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const generate = async () => {
    if (mode === 'single' && !text.trim()) return setMessage('先写一句你今天想说的话。')
    setLoading(true); setMessage('')
    try { setCards(await generateCards(mode === 'single' ? { text } : { scene, count, goal: settings.goal })) }
    catch (error) { setMessage(error instanceof Error ? error.message : '生成失败，请稍后再试。') }
    finally { setLoading(false) }
  }
  const save = () => { onSave(cards); setMessage(`已把 ${cards.length} 句加入你的英语。`); setCards([]) }
  return <main className="page"><header className="section-header"><div><span className="eyebrow">MAKE IT YOURS</span><h1>今天你想说什么？</h1></div></header><div className="segmented"><button className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>一句话</button><button className={mode === 'scene' ? 'active' : ''} onClick={() => setMode('scene')}>按场景批量生成</button></div>{mode === 'single' ? <label className="field"><span>中文</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="例如：我今天加班，可能会晚点到。" rows={5} /></label> : <div className="form-grid"><label className="field"><span>场景</span><select value={scene} onChange={(event) => setScene(event.target.value)}>{scenes.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select></label><label className="field"><span>数量</span><select value={count} onChange={(event) => setCount(Number(event.target.value))}><option>5</option><option>10</option></select></label></div>}<button className="primary wide" disabled={loading} onClick={generate}>{loading ? '正在整理成学习卡…' : '帮我变成学习卡'}</button>{message && <p className="notice">{message}</p>}{cards.length > 0 && <section className="generated"><div className="generated-title"><h2>生成结果</h2><span>{cards.length} 句</span></div>{cards.map((card) => <article key={card.id}><small>{card.cn}</small><h3>{card.sentence}</h3><p><b>{card.expression}</b> · {card.explanation}</p></article>)}<button className="primary wide" onClick={save}>加入我的英语</button></section>}<p className="privacy-note">AI 只在你点击生成时联网。已有卡片和学习记录保存在这台设备。</p></main>
}
