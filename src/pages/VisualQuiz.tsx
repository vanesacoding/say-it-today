import { useCallback, useEffect, useRef, useState } from 'react'
import { visualWords, learningCards, visualThemes } from '../data/visualWords'
import { getCards, getVisualSession, getVisualTheme, getVisualFavorites, initDb, saveVisualSession, type VisualSession, type VisualTheme } from '../db'
import type { Card } from '../types'
import { shuffleOptions } from '../utils/dailyPlan'
import { ArrowRight, Heart, Pause, Play, SpeakerHigh, CaretDown, ArrowLeft } from '@phosphor-icons/react'

export function VisualQuiz() {
  const [session, setSession] = useState<VisualSession | null>(null)
  const [theme, setTheme] = useState<VisualTheme>('everyday-advanced')
  const [advanced, setAdvanced] = useState(true)
  const lastWordTheme = useRef<VisualTheme>('fruits')
  const lastSentenceTheme = useRef<VisualTheme>('everyday-advanced')
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
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioGeneration = useRef(0)
  const word = session && learningCards.find((item) => item.id === session.order[session.cursor])
  const isSentence = word?.kind === 'sentence'
  const sentenceTheme = visualThemes.find((item) => item.id === theme)?.kind === 'sentence'
  const batchEnd = session ? Math.min(session.batchStart + 6, session.order.length) : 0
  const finished = Boolean(session && session.cursor >= batchEnd)
  const load = useCallback(async () => {
    try {
      await initDb()
      const topic = await getVisualTheme()
      const [value, cards, favorites] = await Promise.all([getVisualSession(learningCards.filter((item) => item.theme === topic).map((item) => item.id), topic), getCards(), getVisualFavorites()])
      setTheme(topic); setFavoriteIds(favorites); setSession(value); setLegacy(cards.filter((item) => item.favorite)); setError('')
      if (visualThemes.find((item) => item.id === topic)?.kind === 'sentence') { lastSentenceTheme.current = topic; setAdvanced(topic.endsWith('-advanced')) }
      else lastWordTheme.current = topic
    } catch { setError('学习记录暂时无法读取，请重试。') }
  }, [])
  useEffect(() => { void load(); return () => { audioGeneration.current++; audio.current?.pause(); audio.current?.remove?.(); audio.current = null } }, [load])
  const playerFor = () => {
    if (!audio.current) {
      audio.current = new Audio()
      if (audio.current instanceof window.HTMLAudioElement) { audio.current.hidden = true; audio.current.preload = 'auto'; document.body.appendChild(audio.current) }
    }
    return audio.current
  }
  const stopAudio = () => { audioGeneration.current++; setPlaying(false); if (audio.current) { audio.current.pause(); audio.current.currentTime = 0 } }
  const play = useCallback((url: string, rate = 1) => {
    const player = playerFor()
    const generation = ++audioGeneration.current
    player.pause(); player.src = url; player.playbackRate = rate; player.muted = false
    player.onended = () => { if (audioGeneration.current === generation) setPlaying(false) }
    const failed = () => { if (audioGeneration.current === generation) { setPlaying(false); setAudioMessage('点击“听发音”重试。') } }
    player.onerror = failed
    setPlaying(true)
    setAudioMessage('')
    void player.play().catch(failed)
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
      setRevealed(false); setLeft(learningCards.find((item) => item.id === session.order[session.cursor + 1])?.level === 'upper-intermediate' ? 8 : 5); setAudioMessage('')
    }
  }
  const reveal = () => { setRevealed(true); setLeft(5); if (word) play(word.audio) }
  const start = () => {
    setStarted(true); setPaused(false); setLeft(word?.level === 'upper-intermediate' ? 8 : 5)
    // Unlock this same audio element from a user gesture for later automatic reveals.
    if (word) {
      const player = playerFor(); const generation = ++audioGeneration.current; player.src = word.audio; player.muted = true
      void player.play().then(() => { if (audioGeneration.current === generation) { player.pause(); player.currentTime = 0; player.muted = false } }).catch(() => {})
    }
  }
  useEffect(() => {
    if (!started || paused || finished || view !== 'study' || busy || (revealed && (!auto || playing))) return
    const timer = window.setTimeout(() => {
      if (left > 1) setLeft(left - 1)
      else if (!revealed) reveal()
      else void next()
    }, 1000)
    return () => window.clearTimeout(timer)
  })
  useEffect(() => {
    const pause = () => { if (document.hidden) { setPaused(true); setPlaying(false); audioGeneration.current++; audio.current?.pause() } }
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
      if (visualThemes.find((item) => item.id === topic)?.kind === 'sentence') { lastSentenceTheme.current = topic; setAdvanced(topic.endsWith('-advanced')) }
      else lastWordTheme.current = topic
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
    <header className="visual-header"><span className="brand">SAY IT TODAY</span><button className="quiet-button" onClick={() => { stopAudio(); setPaused(true); setView(view === 'study' ? 'favorites' : 'study') }}>{view === 'study' ? '收藏' : <><ArrowLeft size={16} />返回学习</>}</button></header>
    <div className="visual-intro"><p className="eyebrow">SPEAK A LITTLE</p><h1>{view === 'favorites' ? '值得再说一遍' : sentenceTheme ? '把想法，说出来' : '把眼前，变成英文'}</h1></div>
    {error && <p className="visual-error" role="alert">{error}</p>}
    {view === 'study' && <>
      <div className="topic-row"><label className="topic-picker"><select aria-label="学习主题" value={theme} disabled={busy} onChange={(event) => void switchTheme(event.target.value as VisualTheme)}>{visualThemes.filter((item) => item.kind === (sentenceTheme ? 'sentence' : 'word') && (item.kind === 'word' || item.id.endsWith('-advanced') === advanced)).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><CaretDown size={16} aria-hidden="true" /></label>{sentenceTheme ? <select className="level-picker" aria-label="学习难度" disabled={busy} value={advanced ? 'advanced' : 'basic'} onChange={(event) => { const base = theme.replace('-advanced', ''); void switchTheme((event.target.value === 'advanced' ? `${base}-advanced` : base) as VisualTheme) }}><option value="advanced">进阶 · IELTS 6.5</option><option value="basic">基础 · 实用表达</option></select> : <span className="level-label">日常词汇 · {visualWords.length} 词</span>}</div>
      <div className="mode-progress"><nav className="mode-switch" aria-label="练习模式"><button aria-pressed={!sentenceTheme} disabled={busy} onClick={() => void switchTheme(lastWordTheme.current)}>看图词汇</button><button aria-pressed={sentenceTheme} disabled={busy} onClick={() => void switchTheme(lastSentenceTheme.current)}>场景表达</button></nav><div className="visual-progress" aria-label="本组进度"><span>{String(Math.min(session.cursor - session.batchStart + 1, batchEnd - session.batchStart)).padStart(2, '0')} / {String(batchEnd - session.batchStart).padStart(2, '0')}</span><progress max={Math.max(1, batchEnd - session.batchStart)} value={finished ? batchEnd - session.batchStart : session.cursor - session.batchStart + 1} /></div></div>
    </>}
    {view === 'favorites' ? <section className="visual-favorites"><h2>收藏的词和句子</h2>{!favoriteIds.length && <p>喜欢的词和句子可以在揭晓后收藏。</p>}{learningCards.filter((item) => favoriteIds.includes(item.id)).map((item) => <article key={item.id}>{item.image && <img src={item.image} alt={item.cn} />}<div><b>{item.word}</b><span>{item.cn}</span></div><button onClick={() => play(item.audio)} aria-label={`朗读 ${item.word}`}><SpeakerHigh size={19} /></button><button disabled={busy} onClick={() => void removeFavorite(item.id, item.theme)}>移除</button></article>)}{legacy.length > 0 && <><h2>之前收藏的表达</h2>{legacy.map((item) => <article key={item.id}><div><b>{item.sentence}</b><span>{item.cn}</span></div></article>)}</>}{audioMessage && <p role="status">{audioMessage}</p>}</section> : finished ? <section className="visual-finish"><span>第 {session.round} 轮 · {visualThemes.find((item) => item.id === theme)?.label}</span><h2>这一组学完了</h2><p>{session.cursor < session.order.length ? '下一组接着练习新的内容。' : '给自己一点时间，再把它们说一遍。'}</p><div className="batch-words">{session.order.slice(session.batchStart, batchEnd).map((id) => { const item = learningCards.find((w) => w.id === id)!; return <span key={id}>{item.word}<small>{item.cn}</small></span> })}</div><button className="visual-primary" disabled={busy} onClick={() => void more()}>{session.cursor < session.order.length ? '再看一组' : '打乱顺序，再复习'}<ArrowRight size={20} /></button></section> : word && <>
      <section className={`picture-stage ${isSentence ? 'sentence-stage' : ''}`} aria-label={isSentence ? '场景句子练习' : '看图猜词'}>
        {isSentence ? <><p className="sentence-cn">{word.cn}</p><h2 className="sentence-prompt" aria-live="polite">{revealed ? <>{word.word.slice(0, word.word.indexOf(word.focus!))}<strong>{word.focus}</strong>{word.word.slice(word.word.indexOf(word.focus!) + word.focus!.length)}</> : word.prompt}</h2></> : <><p className="picture-question">What do you see?</p><div className="fruit-photo"><img key={word.id} src={word.image} style={{ objectFit: word.pictureFit }} alt={revealed ? word.cn : '待猜的物品照片'} /></div></>}
        <div className="word-reveal" aria-live="polite">{revealed ? <>{!isSentence && <><span className="word-cn">{word.cn}</span><h2>{word.word}</h2></>}{!isSentence && <p className="word-ipa">{word.phonetic}</p>}</> : <p className="think-hint">{!started ? isSentence ? '试着补全句子，再完整地说出来' : '先看图片，试着说出英文' : paused ? '已暂停，慢慢想' : `想一想 · ${left} 秒后揭晓`}</p>}</div>
        {!revealed && <div className="picture-timer" role="progressbar" aria-label="答案揭晓倒计时" aria-valuemin={0} aria-valuemax={word.level === 'upper-intermediate' ? 8 : 5} aria-valuenow={!started ? word.level === 'upper-intermediate' ? 8 : 5 : left}><span style={{ width: `${!started ? 100 : left / (word.level === 'upper-intermediate' ? 8 : 5) * 100}%` }} /></div>}
      </section>
      <section className="visual-below">{revealed ? <>
        <div className="word-tools"><button className="listen-button" onClick={() => play(word.audio)}><span><Play size={20} weight="fill" /></span>听发音</button><button className="slow-button" onClick={() => play(word.audio, .8)}>慢速</button><button className="favorite-button" disabled={busy} aria-label={session.favorites.includes(word.id) ? '已收藏' : isSentence ? '收藏这句话' : '收藏这个词'} aria-pressed={session.favorites.includes(word.id)} onClick={() => void favorite()}><Heart size={26} weight={session.favorites.includes(word.id) ? 'fill' : 'regular'} /><span className="sr-only">{session.favorites.includes(word.id) ? '已收藏' : isSentence ? '收藏这句话' : '收藏这个词'}</span></button></div>
        <div className="usage-note"><p><b>{word.focus || word.word}</b><span>{isSentence ? word.example.split('。')[0].split('；')[0].split('：').slice(-1)[0] : word.cn}</span></p><details><summary>用法与例句</summary><p className="word-example">{word.example}</p>{isSentence && <p className="word-ipa">{word.phonetic}</p>}{word.aliases?.length ? <p>也叫：{word.aliases.join(' · ')}</p> : null}</details></div>
        {word.followUp && <details className="follow-up"><summary>再多说 20 秒<CaretDown size={14} /></summary><p lang="en">{word.followUp}</p><p>{word.speakingGoal}</p></details>}
        {word.credit && <details className="image-credit"><summary>图片来源</summary><a href={word.credit.url} target="_blank" rel="noreferrer">{word.credit.author}</a><span> · </span><a href={word.credit.licenseUrl || word.credit.url} target="_blank" rel="noreferrer">{word.credit.license}</a></details>}{audioMessage && <p className="audio-note" role="status">{audioMessage}</p>}
      </> : <p className="visual-tip">{isSentence ? '不用逐字翻译，先把意思说出来。' : '不用选答案，自己说出来就好。'}</p>}</section>
      <footer className="visual-controls"><button className="visual-primary" disabled={busy} onClick={() => !started ? start() : revealed ? void next() : reveal()}>{!started ? isSentence ? '开始句子练习' : '开始看图猜词' : busy ? '正在保存…' : revealed ? isSentence ? '下一句' : '下一张' : '提前揭晓'}<ArrowRight size={20} /></button><div className="play-options">{started && <button onClick={() => { setPaused(!paused); if (!paused) stopAudio() }}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? '继续' : '暂停'}</button>}<label><input type="checkbox" checked={auto} onChange={(event) => { setAuto(event.target.checked); if (revealed) setLeft(5) }} />{isSentence ? '自动下一句' : '自动下一张'}</label></div></footer>
    </>}
  </main>
}
