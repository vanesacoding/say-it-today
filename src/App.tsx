import { useEffect, useState } from 'react'
import { BottomNav, type Page } from './components/BottomNav'
import { TodayPage } from './pages/TodayPage'
import { ScenesPage } from './pages/ScenesPage'
import { GeneratePage } from './pages/GeneratePage'
import { MyCardsPage } from './pages/MyCardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { clearProgress, deleteCard, exportData, getCards, getSettings, importData, initDb, saveCard, saveCards, saveSettings } from './db'
import { defaultSettings, type Card, type Rating, type Settings } from './types'
import { scheduleCard } from './utils/srs'
import { seedCards } from './data/seedCards'

export default function App() {
  const [page, setPage] = useState<Page>('today')
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [generateScene, setGenerateScene] = useState<string>()
  const [practiceScene, setPracticeScene] = useState<string>()

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
  const addCards = async (newCards: Card[]) => { await saveCards(newCards); setCards((items) => [...items, ...newCards]) }
  const removeCard = async (id: string) => { await deleteCard(id); setCards((items) => items.filter((card) => card.id !== id)) }
  const changeSettings = async (value: Settings) => { setSettings(value); await saveSettings(value) }

  const content = () => {
    if (page === 'today') return <TodayPage key={practiceScene ?? 'daily'} cards={practiceScene ? cards.filter((card) => card.scene === practiceScene) : cards} settings={settings} onUpdate={updateCard} />
    if (page === 'scenes') return <ScenesPage cards={cards} onPractice={(scene) => { setPracticeScene(scene); setPage('today') }} onGenerate={(scene) => { setGenerateScene(scene); setPage('generate') }} />
    if (page === 'generate') return <GeneratePage key={generateScene ?? 'single'} settings={settings} initialScene={generateScene} onSave={addCards} />
    if (page === 'mine') return <MyCardsPage cards={cards} onUpdate={updateCard} onDelete={removeCard} />
    return <SettingsPage settings={settings} onChange={changeSettings} onExport={async () => {
      const blob = new Blob([await exportData()], { type: 'application/json' })
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `say-it-today-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href)
    }} onImport={async (file) => { try { await importData(await file.text()); await reload(); alert('学习数据已导入。') } catch { alert('这个文件不是有效的学习数据。') } }} onClear={async () => { await clearProgress(); await reload() }} />
  }

  if (!ready) return <div className="app-shell loading">正在准备你的英语…</div>
  return <div className="app-shell">
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    {content()}
    <BottomNav page={page} onChange={(next) => { setPracticeScene(undefined); if (next !== 'generate') setGenerateScene(undefined); setPage(next) }} />
  </div>
}
