import { useCallback, useEffect, useRef, useState } from 'react'
import { visualWords } from '../data/visualWords'
import { getCards, getVisualSession, initDb, saveVisualSession, type VisualSession } from '../db'
import type { Card } from '../types'
import { shuffleOptions } from '../utils/dailyPlan'

export function VisualQuiz() {
  const [session, setSession] = useState<VisualSession | null>(null)
  const [legacy, setLegacy] = useState<Card[]>([])
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [auto, setAuto] = useState(true)
  const [left, setLeft] = useState(5)
  const [view, setView] = useState<'study' | 'favorites'>('study')
  const [error, setError] = useState('')
  const [audioMessage, setAudioMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioGeneration = useRef(0)
  const word = session && visualWords.find((item) => item.id === session.order[session.cursor])
  const batchEnd = session ? Math.min(session.batchStart + 6, session.order.length) : 0
  const finished = Boolean(session && session.cursor >= batchEnd)
  const load = useCallback(async () => {
    try {
      await initDb()
      const [value, cards] = await Promise.all([getVisualSession(visualWords.map((item) => item.id)), getCards()])
      setSession(value); setLegacy(cards.filter((item) => item.favorite)); setError('')
    } catch { setError('学习记录暂时无法读取，请重试。') }
  }, [])
  useEffect(() => { void load(); return () => audio.current?.pause() }, [load])
  const stopAudio = () => { audioGeneration.current++; if (audio.current) { audio.current.pause(); audio.current.currentTime = 0 } }
  const play = useCallback((url: string, rate = 1) => {
    if (!audio.current) audio.current = new Audio()
    const player = audio.current
    const generation = ++audioGeneration.current
    player.pause(); player.src = url; player.playbackRate = rate; player.muted = false
    setAudioMessage('')
    void player.play().catch(() => { if (audioGeneration.current === generation) setAudioMessage('点击“听发音”重试。') })
  }, [])
  const persist = async (value: VisualSession) => {
    if (saving.current) return false
    saving.current = true; setBusy(true)
    try { await saveVisualSession(value); setSession(value); setError(''); return true }
    catch { setPaused(true); setError('进度没有保存成功，请重试；当前图片不会跳过。'); return false }
    finally { saving.current = false; setBusy(false) }
  }
  const next = async () => {
    if (!session || !revealed) return
    stopAudio()
    if (await persist({ ...session, cursor: session.cursor + 1 })) {
      setRevealed(false); setLeft(5); setAudioMessage('')
    }
  }
  const reveal = () => { setRevealed(true); setLeft(5); if (word) play(word.audio) }
  const start = () => {
    setStarted(true); setPaused(false)
    // Unlock this same audio element from a user gesture for later automatic reveals.
    if (word) {
      if (!audio.current) audio.current = new Audio()
      const player = audio.current; const generation = ++audioGeneration.current; player.src = word.audio; player.muted = true
      void player.play().then(() => { if (audioGeneration.current === generation) { player.pause(); player.currentTime = 0; player.muted = false } }).catch(() => {})
    }
  }
  useEffect(() => {
    if (!started || paused || finished || view !== 'study' || busy || (revealed && !auto)) return
    const timer = window.setTimeout(() => {
      if (left > 1) setLeft(left - 1)
      else if (!revealed) reveal()
      else void next()
    }, 1000)
    return () => window.clearTimeout(timer)
  })
  useEffect(() => {
    const pause = () => { if (document.hidden) { setPaused(true); audio.current?.pause() } }
    document.addEventListener('visibilitychange', pause)
    return () => document.removeEventListener('visibilitychange', pause)
  }, [])
  const favorite = async () => {
    if (!session || !word) return
    const favorites = session.favorites.includes(word.id) ? session.favorites.filter((id) => id !== word.id) : [...session.favorites, word.id]
    await persist({ ...session, favorites })
  }
  const more = async () => {
    if (!session) return
    let value = { ...session, batchStart: session.cursor }
    if (session.cursor >= session.order.length) {
      const order = shuffleOptions(session.order)
      if (order[0] === session.order.at(-1)) [order[0], order[1]] = [order[1], order[0]]
      value = { ...value, order, cursor: 0, batchStart: 0, round: session.round + 1 }
    }
    if (await persist(value)) { setStarted(false); setRevealed(false); setLeft(5); setPaused(false) }
  }
  if (!session) return <main className="visual-app visual-loading"><p role="status">{error || '正在准备图片…'}</p>{error && <button onClick={() => void load()}>重试</button>}</main>
  return <main className="visual-app">
    <header className="visual-header"><div><span className="brand">SAY IT TODAY</span><h1>{view === 'study' ? '看图，开口说' : '我的收藏'}</h1></div><button className="quiet-button" onClick={() => { stopAudio(); setPaused(true); setView(view === 'study' ? 'favorites' : 'study') }}>{view === 'study' ? '收藏' : '返回学习'}</button></header>
    {error && <p className="visual-error" role="alert">{error}</p>}
    {view === 'favorites' ? <section className="visual-favorites"><h2>看图词汇</h2>{!session.favorites.length && <p>喜欢的词可以在揭晓后收藏。</p>}{visualWords.filter((item) => session.favorites.includes(item.id)).map((item) => <article key={item.id}><img src={item.image} alt={item.cn} /><div><b>{item.word}</b><span>{item.cn}</span></div><button onClick={() => play(item.audio)}>听发音</button><button disabled={busy} onClick={() => void persist({ ...session, favorites: session.favorites.filter((id) => id !== item.id) })}>移除</button></article>)}{legacy.length > 0 && <><h2>之前收藏的表达</h2>{legacy.map((item) => <article key={item.id}><div><b>{item.sentence}</b><span>{item.cn}</span></div></article>)}</>}{audioMessage && <p role="status">{audioMessage}</p>}</section> : finished ? <section className="visual-finish"><span>FRUIT COLLECTION</span><h2>这一组学完了</h2><p>已看 {session.cursor} / {session.order.length} 个水果<br />{session.cursor < session.order.length ? '下一组接着看新的，不重复。' : '全部看过了，下一轮换个顺序复习。'}</p><div className="batch-words">{session.order.slice(session.batchStart, batchEnd).map((id) => { const item = visualWords.find((w) => w.id === id)!; return <span key={id}>{item.word}<small>{item.cn}</small></span> })}</div><button className="visual-primary" disabled={busy} onClick={() => void more()}>{session.cursor < session.order.length ? '再看一组' : '打乱顺序，再复习'}</button></section> : word && <>
      <div className="visual-progress"><span>水果 · 第 {session.round} 轮</span><span>{session.cursor + 1} / {session.order.length}</span></div>
      <section className="picture-stage" aria-label="看图猜词">
        <p className="picture-question">What is this?</p>
        <div className="fruit-photo"><img key={word.id} src={word.image} alt={revealed ? word.cn : '待猜的水果照片'} /></div>
        <div className="word-reveal" aria-live="polite">{revealed ? <><span className="word-cn">{word.cn}</span><h2>{word.word}</h2><p className="word-ipa">{word.phonetic}</p></> : <p className="think-hint">{!started ? '先看图片，试着说出英文' : paused ? '已暂停，慢慢想' : `想一想 · ${left} 秒后揭晓`}</p>}</div>
        <div className="picture-timer" role="progressbar" aria-label={revealed ? '下一张倒计时' : '答案揭晓倒计时'} aria-valuemin={0} aria-valuemax={5} aria-valuenow={!started ? 5 : left}><span style={{ width: `${!started ? 100 : left * 20}%` }} /></div>
      </section>
      <section className="visual-below">{revealed ? <><div className="word-tools"><button onClick={() => play(word.audio)}>听发音</button><button onClick={() => play(word.audio, .8)}>慢速</button><button disabled={busy} aria-pressed={session.favorites.includes(word.id)} onClick={() => void favorite()}>{session.favorites.includes(word.id) ? '已收藏' : '收藏这个词'}</button></div><p className="word-example">{word.example}</p>{audioMessage && <p className="audio-note" role="status">{audioMessage}</p>}</> : <p className="visual-tip">不用选答案，自己说出来就好。</p>}</section>
      <footer className="visual-controls"><button className="visual-primary" disabled={busy} onClick={() => !started ? start() : revealed ? void next() : reveal()}>{!started ? '开始看图猜词' : busy ? '正在保存…' : revealed ? '下一张' : '提前揭晓'}</button><div className="play-options">{started && <button onClick={() => { setPaused(!paused); if (!paused) stopAudio() }}>{paused ? '继续' : '暂停'}</button>}<label><input type="checkbox" checked={auto} onChange={(event) => { setAuto(event.target.checked); setLeft(5) }} />自动下一张</label></div></footer>
    </>}
  </main>
}
