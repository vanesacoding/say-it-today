import { useState } from 'react'
import { scenes } from '../data/scenes'
import type { Card } from '../types'

export function ScenesPage({ cards, onPractice, onGenerate }: { cards: Card[]; onPractice: (scene: string) => void; onGenerate: (scene: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const scene = scenes.find((item) => item.id === selected)
  const sceneCards = cards.filter((card) => card.scene === selected)
  if (scene) return <main className="page"><button className="back" onClick={() => setSelected(null)}>‹ 所有场景</button><header className="section-header"><span className="scene-icon">{scene.icon}</span><div><h1>{scene.name}</h1><p>已有 {sceneCards.length} 句</p></div></header><div className="dual-actions"><button className="primary" onClick={() => onPractice(scene.id)}>开始学习</button><button className="secondary" onClick={() => onGenerate(scene.id)}>AI 生成 10 句</button></div><div className="sentence-list">{sceneCards.length ? sceneCards.map((card) => <article key={card.id}><p>{card.cn}</p><b>{card.sentence}</b><small>{card.expression}</small></article>) : <p className="notice">这个场景还没有句子，可以让 AI 先生成一批。</p>}</div></main>
  return <main className="page"><header className="section-header"><div><span className="eyebrow">从生活出发</span><h1>场景</h1><p>不分级，先学你今天用得上的。</p></div></header><div className="scene-grid">{scenes.map((item) => <button key={item.id} onClick={() => setSelected(item.id)}><span>{item.icon}</span><b>{item.name}</b><small>{cards.filter((card) => card.scene === item.id).length} 句</small></button>)}</div></main>
}
