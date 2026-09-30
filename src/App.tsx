import { useEffect, useState } from 'react'
import { TodayPage } from './pages/TodayPage'
import { getCards, getSettings, initDb, saveCard } from './db'
import { defaultSettings, type Card, type Rating, type Settings } from './types'
import { scheduleCard } from './utils/srs'
import { seedCards } from './data/seedCards'

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => { setCards(await getCards()); setSettings(await getSettings()) }
  useEffect(() => {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    Promise.race([initDb().then(reload), timeout]).then(() => setReady(true)).catch(() => {
      setCards(seedCards)
      setError('本地存储暂时不可用，本次可以继续学习，但进度可能无法保存。')
      setReady(true)
    })
  }, [])

  const updateCard = async (card: Card, rating?: Rating) => {
    const updated = rating ? scheduleCard(card, rating) : card
    setCards((items) => items.map((item) => item.id === updated.id ? updated : item))
    try { await saveCard(updated) } catch { setError('这次进度没有保存成功，请重试。') }
  }
  if (!ready) return <div className="app-shell loading">正在准备你的英语…</div>
  return <div className="app-shell">
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <TodayPage cards={cards} settings={settings} onUpdate={updateCard} />
  </div>
}
