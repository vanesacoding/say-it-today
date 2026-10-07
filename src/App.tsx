import { useCallback, useEffect, useState } from 'react'
import { TodayPage } from './pages/TodayPage'
import { MyCardsPage } from './pages/MyCardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { getCards, getDailyPlan, getSettings, initDb, saveCard, saveDailyPractice, saveDailyReview, saveSettings } from './db'
import { defaultSettings, type Card, type DailyPlan, type Rating, type Settings } from './types'
import { scheduleCard } from './utils/srs'
import { localDateKey } from './utils/dailyPlan'

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [page, setPage] = useState<'today' | 'mine' | 'settings'>('today')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      await initDb()
      const [savedCards, savedSettings] = await Promise.all([getCards(), getSettings()])
      const savedPlan = await getDailyPlan(savedCards, savedSettings)
      setCards(savedCards); setSettings(savedSettings); setPlan(savedPlan); setError(''); setReady(true)
    } catch { setError('本地学习数据暂时无法读取，请重试。'); setReady(true) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const checkDate = () => { if (plan && plan.date !== localDateKey()) void load() }
    const timer = window.setInterval(checkDate, 60_000)
    window.addEventListener('focus', checkDate)
    document.addEventListener('visibilitychange', checkDate)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', checkDate); document.removeEventListener('visibilitychange', checkDate) }
  }, [plan, load])

  const updateCard = async (card: Card) => {
    setBusy(true)
    try { await saveCard(card); setCards((items) => items.map((item) => item.id === card.id ? card : item)); setError('') }
    catch { setError('没有保存成功，请重试；原来的进度已保留。'); throw new Error('save failed') }
    finally { setBusy(false) }
  }
  const rateCard = async (card: Card, rating: Rating, correct: boolean, daily = false) => {
    setBusy(true)
    try {
      const updated = scheduleCard(card, rating, new Date(), correct)
      if (daily && plan) setPlan(await saveDailyReview(updated, plan.date))
      else await saveCard(updated)
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item)); setError('')
    } catch { setError('这句没有保存成功，请重试；不会跳过当前题。'); throw new Error('save failed') }
    finally { setBusy(false) }
  }
  const updateSettings = async (value: Settings) => {
    try { await saveSettings(value); setSettings(value); setError('') }
    catch { setError('设置没有保存成功，请重试。') }
  }
  const savePractice = async (draft: string, done: boolean) => {
    if (!plan) return
    setBusy(true)
    try { setPlan(await saveDailyPractice(plan.date, draft, done)); setError('') }
    catch { setError('练习没有保存成功，请重试。'); throw new Error('save failed') }
    finally { setBusy(false) }
  }
  if (!ready) return <div className="app-shell loading" role="status">正在准备你的英语…</div>
  return <div className="app-shell">
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => void load()}>重试读取</button></div>}
    {plan ? <>
      <div hidden={page !== 'today'}><TodayPage cards={cards} plan={plan} settings={settings} active={page === 'today'} busy={busy} onUpdate={updateCard} onRate={(card, rating, correct) => rateCard(card, rating, correct, true)} onPractice={savePractice} onOpenMine={() => setPage('mine')} /></div>
      {page === 'mine' && <MyCardsPage cards={cards} settings={settings} busy={busy} onUpdate={updateCard} onRate={rateCard} />}
      {page === 'settings' && <SettingsPage settings={settings} onChange={updateSettings} />}
      <nav className="bottom-nav" aria-label="主导航">{([{ id: 'today', label: '今日' }, { id: 'mine', label: '我的表达' }, { id: 'settings', label: '设置' }] as const).map((item) => <button key={item.id} aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>{item.label}</button>)}</nav>
    </> : <main className="page"><p>暂时无法开始学习。</p><button className="primary" onClick={() => void load()}>重新读取学习数据</button></main>}
  </div>
}
