import { useCallback, useEffect, useRef, useState } from 'react'
import { visualWords, learningCards, visualThemes } from '../data/visualWords'
import { getCards, getVisualSession, getVisualTheme, getVisualFavorites, initDb, saveVisualSession, type VisualSession, type VisualTheme } from '../db'
import type { Card } from '../types'
import { shuffleOptions } from '../utils/dailyPlan'

export function VisualQuiz() {
  const [session, setSession] = useState<VisualSession | null>(null)
  const [theme, setTheme] = useState<VisualTheme>('fruits')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
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
  const word = session && learningCards.find((item) => item.id === session.order[session.cursor])
  const isSentence = word?.kind === 'sentence'
  const sentenceTheme = ['buffet', 'cafe', 'outing', 'everyday'].includes(theme)
  const batchEnd = session ? Math.min(session.batchStart + 6, session.order.length) : 0
  const finished = Boolean(session && session.cursor >= batchEnd)
  const load = useCallback(async () => {
    try {
      await initDb()
      const topic = await getVisualTheme()
      const [value, cards, favorites] = await Promise.all([getVisualSession(learningCards.filter((item) => item.theme === topic).map((item) => item.id), topic), getCards(), getVisualFavorites()])
      setTheme(topic); setFavoriteIds(favorites); setSession(value); setLegacy(cards.filter((item) => item.favorite)); setError('')
    } catch { setError('学习记录暂时无法读取，请重试。') }
  }, [])
  useEffect(() => { void load(); return () => { audio.current?.pause(); window.speechSynthesis?.cancel() } }, [load])
  const stopAudio = () => { window.speechSynthesis?.cancel(); audioGeneration.current++; if (audio.current) { audio.current.pause(); audio.current.currentTime = 0 } }
  const play = useCallback((url: string, rate = 1) => {
    window.speechSynthesis?.cancel()
    if (url.startsWith('speech:')) {
      audio.current?.pause(); audioGeneration.current++
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { setAudioMessage('当前设备不支持朗读，请换用支持朗读的浏览器。'); return }
      const utterance = new window.SpeechSynthesisUtterance(decodeURIComponent(url.slice(7)))
      utterance.lang = 'en-US'; utterance.rate = rate
      const voices = window.speechSynthesis.getVoices()
      utterance.voice = voices.find((voice) => voice.lang === 'en-US' && /natural|samantha|jenny|aria|google/i.test(voice.name)) || voices.find((voice) => voice.lang === 'en-US') || null
      utterance.onerror = (event) => { if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioMessage('点击“听发音”重试。') }
      setAudioMessage('设备朗读 · 音色随设备变化')
      window.speechSynthesis.speak(utterance); return
    }
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
    try { await saveVisualSession(value, theme); setSession(value); setFavoriteIds(await getVisualFavorites()); setError(''); return true }
    catch { setPaused(true); setError('进度没有保存成功，请重试；当前卡片不会跳过。'); return false }
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
    if (word && !word.audio.startsWith('speech:')) {
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
    const pause = () => { if (document.hidden) { setPaused(true); audio.current?.pause(); window.speechSynthesis?.cancel() } }
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
  const switchTheme = async (topic: VisualTheme) => {
    if (saving.current || topic === theme) return
    saving.current = true; setBusy(true); stopAudio(); setPaused(true); setStarted(false); setRevealed(false); setLeft(5); setAudioMessage('')
    try {
      const value = await getVisualSession(learningCards.filter((item) => item.theme === topic).map((item) => item.id), topic)
      await saveVisualSession(value, topic)
      setTheme(topic); setSession(value); setError('')
    } catch { setError('主题暂时无法切换，请重试。') }
    finally { saving.current = false; setBusy(false) }
  }
  const removeFavorite = async (id: string, topic: VisualTheme) => {
    if (topic === theme) { if (session) await persist({ ...session, favorites: session.favorites.filter((key) => key !== id) }); return }
    if (saving.current) return
    saving.current = true; setBusy(true)
    try {
      const value = await getVisualSession(learningCards.filter((item) => item.theme === topic).map((item) => item.id), topic)
      await saveVisualSession({ ...value, favorites: value.favorites.filter((key) => key !== id) }, topic)
      if (session) await saveVisualSession(session, theme)
      setFavoriteIds(await getVisualFavorites()); setError('')
    } catch { setError('收藏没有保存成功，请重试。') }
    finally { saving.current = false; setBusy(false) }
  }
  if (!session) return <main className="visual-app visual-loading"><p role="status">{error || '正在准备学习内容…'}</p>{error && <button onClick={() => void load()}>重试</button>}</main>
  return <main className="visual-app">
    <header className="visual-header"><div><span className="brand">SAY IT TODAY · {visualWords.length} 词 · {learningCards.length - visualWords.length} 句</span><h1>{view === 'study' ? sentenceTheme ? '想一句，开口说' : '看图，开口说' : '我的收藏'}</h1></div><button className="quiet-button" onClick={() => { stopAudio(); setPaused(true); setView(view === 'study' ? 'favorites' : 'study') }}>{view === 'study' ? '收藏' : '返回学习'}</button></header>
    {error && <p className="visual-error" role="alert">{error}</p>}
    {view === 'study' && <label className="topic-picker"><span>学习主题</span><select aria-label="学习主题" value={theme} disabled={busy} onChange={(event) => void switchTheme(event.target.value as VisualTheme)}>{(['word', 'sentence'] as const).map((kind) => <optgroup key={kind} label={kind === 'word' ? '看图词汇' : '场景句子'}>{visualThemes.filter((topic) => topic.kind === kind).map((topic) => <option key={topic.id} value={topic.id}>{topic.label} · {learningCards.filter((item) => item.theme === topic.id).length}{kind === 'word' ? ' 词' : ' 句'}</option>)}</optgroup>)}</select></label>}
    {view === 'favorites' ? <section className="visual-favorites"><h2>收藏的词和句子</h2>{!favoriteIds.length && <p>喜欢的词和句子可以在揭晓后收藏。</p>}{learningCards.filter((item) => favoriteIds.includes(item.id)).map((item) => <article key={item.id}>{item.image && <img src={item.image} alt={item.cn} />}<div><b>{item.word}</b><span>{item.cn}</span></div><button onClick={() => play(item.audio)}>听发音</button><button disabled={busy} onClick={() => void removeFavorite(item.id, item.theme)}>移除</button></article>)}{legacy.length > 0 && <><h2>之前收藏的表达</h2>{legacy.map((item) => <article key={item.id}><div><b>{item.sentence}</b><span>{item.cn}</span></div></article>)}</>}{audioMessage && <p role="status">{audioMessage}</p>}</section> : finished ? <section className="visual-finish"><span>{visualThemes.find((item) => item.id === theme)?.label}</span><h2>这一组学完了</h2><p>已看 {session.cursor} / {session.order.length} {sentenceTheme ? '句' : '个词'}<br />{session.cursor < session.order.length ? '下一组接着看新的，不重复。' : '全部看过了，下一轮换个顺序复习。'}</p><div className="batch-words">{session.order.slice(session.batchStart, batchEnd).map((id) => { const item = learningCards.find((w) => w.id === id)!; return <span key={id}>{item.word}<small>{item.cn}</small></span> })}</div><button className="visual-primary" disabled={busy} onClick={() => void more()}>{session.cursor < session.order.length ? '再看一组' : '打乱顺序，再复习'}</button></section> : word && <>
      <div className="visual-progress"><span>{visualThemes.find((item) => item.id === theme)?.label} · 第 {session.round} 轮</span><span>{session.cursor + 1} / {session.order.length}</span></div>
      <section className={`picture-stage ${isSentence ? "sentence-stage" : ""}`} aria-label={isSentence ? "场景句子练习" : "看图猜词"}>
        {isSentence ? <><div className="scene-art" aria-hidden="true"><SceneArt theme={theme} /></div><p className="sentence-cn">{word.cn}</p><h2 className="sentence-prompt">{revealed ? <>{word.word.slice(0, word.word.indexOf(word.focus!))}<strong>{word.focus}</strong>{word.word.slice(word.word.indexOf(word.focus!) + word.focus!.length)}</> : word.prompt}</h2></> : <><p className="picture-question">What is this?</p><div className="fruit-photo"><img key={word.id} src={word.image} style={{ objectFit: word.pictureFit }} alt={revealed ? word.cn : '待猜的物品照片'} /></div></>}
        <div className="word-reveal" aria-live="polite">{revealed ? <>{!isSentence && <><span className="word-cn">{word.cn}</span><h2>{word.word}</h2></>}<p className="word-ipa">{word.phonetic}</p></> : <p className="think-hint">{!started ? isSentence ? '试着补全句子，说出来' : '先看图片，试着说出英文' : paused ? '已暂停，慢慢想' : `想一想 · ${left} 秒后揭晓`}</p>}</div>
        <div className="picture-timer" role="progressbar" aria-label={revealed ? '下一张倒计时' : '答案揭晓倒计时'} aria-valuemin={0} aria-valuemax={5} aria-valuenow={!started ? 5 : left}><span style={{ width: `${!started ? 100 : left * 20}%` }} /></div>
      </section>
      <section className="visual-below">{revealed ? <><div className="word-tools"><button onClick={() => play(word.audio)}>听发音</button><button onClick={() => play(word.audio, .8)}>慢速</button><button disabled={busy} aria-pressed={session.favorites.includes(word.id)} onClick={() => void favorite()}>{session.favorites.includes(word.id) ? '已收藏' : isSentence ? '收藏这句话' : '收藏这个词'}</button></div><p className="word-example">{word.example}</p>{word.aliases?.length ? <p className="word-alias">也叫：{word.aliases.join(" · ")}</p> : null}{word.credit && <details className="image-credit"><summary>图片来源</summary><a href={word.credit.url} target="_blank" rel="noreferrer">{word.credit.author}</a><span> · </span><a href={word.credit.licenseUrl || word.credit.url} target="_blank" rel="noreferrer">{word.credit.license}</a></details>}{audioMessage && <p className="audio-note" role="status">{audioMessage}</p>}</> : <p className="visual-tip">{isSentence ? '根据中文提示，补全英文并说出来。' : '不用选答案，自己说出来就好。'}</p>}</section>
      <footer className="visual-controls"><button className="visual-primary" disabled={busy} onClick={() => !started ? start() : revealed ? void next() : reveal()}>{!started ? isSentence ? '开始句子练习' : '开始看图猜词' : busy ? '正在保存…' : revealed ? '下一张' : '提前揭晓'}</button><div className="play-options">{started && <button onClick={() => { setPaused(!paused); if (!paused) stopAudio() }}>{paused ? '继续' : '暂停'}</button>}<label><input type="checkbox" checked={auto} onChange={(event) => { setAuto(event.target.checked); setLeft(5) }} />自动下一张</label></div></footer>
    </>}
  </main>
}

function SceneArt({ theme }: { theme: VisualTheme }) {
  return <svg viewBox="0 0 240 120" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {theme === 'buffet' ? <><path d="M20 94h200M35 87h170V48H35zM42 42h156M82 48v39m73-39v39" /><path d="M49 42c0-19 25-19 25 0m22 0c0-26 41-26 41 0m23 0c0-19 25-19 25 0" /><circle cx="75" cy="99" r="5" /><circle cx="166" cy="99" r="5" /><path d="M112 17h15" /></> : theme === 'cafe' ? <><path d="M68 39h89v36c0 21-89 21-89 0V39zM157 46h13c26 0 26 30 0 30h-13M50 99h143M89 22c-8-9 8-12 0-22m26 22c-8-9 8-12 0-22m26 22c-8-9 8-12 0-22" /></> : theme === 'outing' ? <><rect x="54" y="22" width="132" height="72" rx="12" /><path d="M65 33h109v32H65zM87 95l-9 17m76-17 9 17M106 14h28M120 14v8M80 112h83" /><circle cx="80" cy="80" r="4" /><circle cx="160" cy="80" r="4" /></> : <><path d="M28 22h120v55H71L52 93V77H28zM155 45h56v52h-22l-13 13V97h-43V84" /><path d="M49 43h77M49 57h54M157 64h34M157 78h25" /></>}
  </svg>
}
