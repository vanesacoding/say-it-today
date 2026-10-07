import { openDB } from 'idb'
import { seedCards } from '../data/seedCards'
import { defaultSettings, type Card, type DailyPlan, type Settings } from '../types'
import { createDailyPlan, localDateKey, completePlanCard } from '../utils/dailyPlan'

const dbPromise = openDB('say-it-today', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
    if (!db.objectStoreNames.contains('dailyPlans')) db.createObjectStore('dailyPlans', { keyPath: 'date' })
  }
})

export async function initDb() {
  const db = await dbPromise
  const existing = new Map((await db.getAll('cards') as Card[]).map((card) => [card.id, card]))
  const seeded = seedCards.map((card) => {
    const saved = existing.get(card.id)
    return saved ? { ...card, favorite: saved.favorite, status: saved.status, reviewInterval: saved.reviewInterval, nextReviewAt: saved.nextReviewAt, correctCount: saved.correctCount, wrongCount: saved.wrongCount, lastReviewedAt: saved.lastReviewedAt } : card
  })
  if (seeded.length) {
    const tx = db.transaction('cards', 'readwrite')
    await Promise.all(seeded.map((card) => tx.store.put(card)))
    await tx.done
  }
  if (!(await db.get('settings', 'main'))) await db.put('settings', defaultSettings, 'main')
}

export async function getCards(): Promise<Card[]> {
  return (await dbPromise).getAll('cards') as Promise<Card[]>
}

export async function saveCard(card: Card) {
  await (await dbPromise).put('cards', card)
}

export async function saveCards(cards: Card[]) {
  const tx = (await dbPromise).transaction('cards', 'readwrite')
  await Promise.all(cards.map((card) => tx.store.put(card)))
  await tx.done
}

export async function deleteCard(id: string) {
  await (await dbPromise).delete('cards', id)
}

export async function getSettings(): Promise<Settings> {
  return { ...defaultSettings, ...((await (await dbPromise).get('settings', 'main')) as Settings | undefined) }
}

export async function getDailyPlan(cards: Card[], settings: Settings, now = new Date()): Promise<DailyPlan> {
  const db = await dbPromise
  const tx = db.transaction('dailyPlans', 'readwrite')
  let plan = await tx.store.get(localDateKey(now)) as DailyPlan | undefined
  if (!plan) {
    plan = createDailyPlan(cards, settings, now)
    // Recover reviews completed earlier today by the previous version.
    const completedToday = cards.filter((card) => card.lastReviewedAt && localDateKey(new Date(card.lastReviewedAt)) === plan!.date)
    const newSlots = Math.max(0, settings.newPerDay - completedToday.length)
    const remainingReviews = plan.cardIds.filter((id) => plan!.reviewIds.includes(id))
    const remainingNew = plan.cardIds.filter((id) => !plan!.reviewIds.includes(id)).slice(0, newSlots)
    plan.cardIds = [...new Set([...completedToday.map((card) => card.id), ...remainingReviews, ...remainingNew])]
    plan.completedIds = completedToday.map((card) => card.id)
    await tx.store.put(plan)
  }
  await tx.done
  return plan
}

export async function saveDailyReview(card: Card, date: string): Promise<DailyPlan> {
  const db = await dbPromise
  const tx = db.transaction(['cards', 'dailyPlans'], 'readwrite')
  // A request can reject before tx.done; handle the transaction's separate rejection too.
  void tx.done.catch(() => {})
  const plan = await tx.objectStore('dailyPlans').get(date) as DailyPlan
  if (!plan) { tx.abort(); throw new Error('今日任务不存在') }
  const updated = completePlanCard(plan, card.id)
  await tx.objectStore('cards').put(card)
  await tx.objectStore('dailyPlans').put(updated)
  await tx.done
  return updated
}

export async function saveDailyPractice(date: string, draft: string, done: boolean): Promise<DailyPlan> {
  const tx = (await dbPromise).transaction('dailyPlans', 'readwrite')
  void tx.done.catch(() => {})
  const plan = await tx.store.get(date) as DailyPlan
  const updated = { ...plan, practiceDraft: draft, practiceDone: done }
  await tx.store.put(updated)
  await tx.done
  return updated
}

export async function saveSettings(settings: Settings) {
  await (await dbPromise).put('settings', settings, 'main')
}

export async function exportData() {
  return JSON.stringify({ version: 1, cards: await getCards(), settings: await getSettings() }, null, 2)
}

export async function importData(raw: string) {
  const data = JSON.parse(raw) as { cards?: Card[]; settings?: Settings }
  if (!Array.isArray(data.cards)) throw new Error('invalid')
  await saveCards(data.cards)
  if (data.settings) await saveSettings(data.settings)
}

export async function clearProgress() {
  const cards = await getCards()
  await saveCards(cards.map((card) => ({ ...card, favorite: false, status: 'new', reviewInterval: 0, nextReviewAt: null, correctCount: 0, wrongCount: 0, lastReviewedAt: null })))
}
