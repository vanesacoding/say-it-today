import { openDB } from 'idb'
import { seedCards } from '../data/seedCards'
import { defaultSettings, type Card, type Settings } from '../types'

const dbPromise = openDB('say-it-today', 1, {
  upgrade(db) {
    db.createObjectStore('cards', { keyPath: 'id' })
    db.createObjectStore('settings')
  }
})

export async function initDb() {
  const db = await dbPromise
  const existing = new Set(await db.getAllKeys('cards'))
  const missing = seedCards.filter((card) => !existing.has(card.id))
  if (missing.length) {
    const tx = db.transaction('cards', 'readwrite')
    await Promise.all(missing.map((card) => tx.store.put(card)))
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
  return ((await (await dbPromise).get('settings', 'main')) as Settings | undefined) ?? defaultSettings
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
