import type { Card, DailyPlan, Settings } from '../types'
import { defaultSettings } from '../types'
import { isDue } from './srs'

export function localDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function makeQueue(cards: Card[], settings: Settings = defaultSettings, now = new Date()) {
  const limit = (n: number, fallback: number) => Number.isFinite(n) ? Math.min(20, Math.max(0, Math.floor(n))) : fallback
  const due = cards.filter((card) => isDue(card, now)).sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '')).slice(0, limit(settings.reviewPerDay, 2))
  const fresh = cards.filter((card) => card.status === 'new' && (card.source !== 'seed' || card.tags.some((tag) => ['商务英语', '日常进阶'].includes(tag))))
  const personal = fresh.filter((card) => card.source !== 'seed')
  const business = fresh.filter((card) => card.source === 'seed' && card.tags.includes('商务英语')).sort((a, b) => Number(a.id.split('-').at(-1)) - Number(b.id.split('-').at(-1)))
  const daily = fresh.filter((card) => card.source === 'seed' && card.tags.includes('日常进阶')).sort((a, b) => Number(a.id.split('-').at(-1)) - Number(b.id.split('-').at(-1)))
  const mixed = Array.from({ length: Math.max(business.length, daily.length) }, (_, i) => [business[i], daily[i]]).flat().filter((card): card is Card => Boolean(card))
  const newCards = [...personal, ...mixed].filter((card) => !due.some((item) => item.id === card.id)).slice(0, limit(settings.newPerDay, 3))
  return [...due, ...newCards]
}

export function createDailyPlan(cards: Card[], settings: Settings, now = new Date()): DailyPlan {
  const queue = makeQueue(cards, settings, now)
  return { date: localDateKey(now), cardIds: queue.map((card) => card.id), completedIds: [], reviewIds: queue.filter((card) => isDue(card, now)).map((card) => card.id), practiceDraft: '', practiceDone: false }
}

export function completePlanCard(plan: DailyPlan, id: string): DailyPlan {
  return plan.cardIds.includes(id) && !plan.completedIds.includes(id) ? { ...plan, completedIds: [...plan.completedIds, id] } : plan
}

export function shuffleOptions(options: string[], random = Math.random) {
  const result = [...options]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
