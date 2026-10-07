import { useEffect, useState } from 'react'

export function SpeechButton({ text, locale }: { text: string; locale: string }) {
  const [message, setMessage] = useState('')
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])
  const speak = (rate: number) => {
    if (!('speechSynthesis' in window)) { setMessage('当前设备不支持朗读，可以先看句子、自己复述。'); return }
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = locale
      utterance.rate = rate
      const voice = window.speechSynthesis.getVoices().find((item) => item.lang === locale)
      if (voice) utterance.voice = voice
      utterance.onerror = () => setMessage('朗读暂时不可用，请再试一次。')
      setMessage('')
      window.speechSynthesis.speak(utterance)
    } catch { setMessage('朗读暂时不可用，请再试一次。') }
  }
  return <div><div className="speech-control"><button className="text-button" onClick={() => speak(1)}>听整句</button><button className="text-button" onClick={() => speak(.8)}>慢速重听</button></div>{message && <p className="muted" role="status">{message}</p>}</div>
}
