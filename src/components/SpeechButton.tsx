import { useState } from 'react'
import { similarity } from '../utils/srs'

export function SpeechButton({ text, locale }: { text: string; locale: string }) {
  const [speed, setSpeed] = useState(1)
  const speak = () => {
    if (!('speechSynthesis' in window)) return alert('当前浏览器不支持语音朗读。')
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale
    utterance.rate = speed
    const voice = speechSynthesis.getVoices().find((item) => item.lang === locale)
    if (voice) utterance.voice = voice
    speechSynthesis.speak(utterance)
  }
  return <div className="speech-control">
    <button className="text-button" onClick={speak}>🔊 听一句</button>
    <button className="speed" onClick={() => setSpeed(speed === 1 ? .8 : 1)}>{speed}x</button>
  </div>
}

export function RepeatButton({ text, locale }: { text: string; locale: string }) {
  const [result, setResult] = useState('')
  const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  const listen = () => {
    const recognition = new SpeechRecognition()
    recognition.lang = locale
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const heard = event.results[0][0].transcript as string
      const score = similarity(heard, text)
      setResult(`你说的是：${heard} · ${score > .8 ? '很好' : score > .55 ? '基本正确' : '再试一次'}`)
    }
    recognition.onerror = () => setResult('没有听清，请再试一次。')
    recognition.start()
  }
  return <div><button className="text-button" onClick={listen}>🎙️ 跟读</button>{result && <p className="speech-result">{result}</p>}</div>
}
