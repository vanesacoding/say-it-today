import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { openDB } from 'idb'
import { getCards, getDailyPlan, getSettings, initDb, saveCard, saveDailyPractice, saveDailyReview } from '../src/db/index.ts'
import { defaultSettings } from '../src/types/index.ts'
import { scheduleCard } from '../src/utils/srs.ts'
await initDb()
const initialCards = await getCards()
const initial = await getDailyPlan(initialCards, defaultSettings)
assert.equal(initial.cardIds.length, 3)
const card = initialCards.find((item) => item.id === initial.cardIds[0])!
await saveCard({ ...card, favorite: true })
const favored = (await getCards()).find((item) => item.id === card.id)!
const reviewed = scheduleCard(favored, 'known', new Date(), false)
const updated = await saveDailyReview(reviewed, initial.date)
assert.deepEqual(updated.completedIds, [card.id])
// A fresh read of persisted data must restore the same plan, even though the card is no longer new.
const afterReload = await getDailyPlan(await getCards(), { ...defaultSettings, newPerDay: 12 })
assert.deepEqual(afterReload.cardIds, initial.cardIds)
assert.deepEqual(afterReload.completedIds, [card.id])
assert.equal((await getCards()).find((item) => item.id === card.id)!.favorite, true)
assert.equal((await getCards()).find((item) => item.id === card.id)!.wrongCount, 1)
const db = await openDB('say-it-today', 3)
// Force a transaction failure: neither card counters nor plan completion may partially commit.
const originalPut = IDBObjectStore.prototype.put
IDBObjectStore.prototype.put = function (value, key) {
  if (this.name === 'dailyPlans') { this.transaction.abort(); throw new Error('simulated write failure') }
  return originalPut.call(this, value, key)
}
const second = initialCards.find((item) => item.id === initial.cardIds[1])!
await assert.rejects(saveDailyReview(scheduleCard(second, 'again'), initial.date))
IDBObjectStore.prototype.put = originalPut
assert.equal((await getCards()).find((item) => item.id === second.id)!.status, 'new')
assert.deepEqual((await getDailyPlan(await getCards(), defaultSettings)).completedIds, [card.id])
for (const id of initial.cardIds.slice(1)) {
  await saveDailyReview(scheduleCard(initialCards.find((item) => item.id === id)!, 'familiar'), initial.date)
}
await saveDailyPractice(initial.date, 'My own sentence.', true)
await initDb()
const completed = await getDailyPlan(await getCards(), await getSettings())
assert.deepEqual(completed.cardIds, initial.cardIds)
assert.equal(completed.completedIds.length, initial.cardIds.length)
assert.equal(completed.practiceDraft, 'My own sentence.')
assert.equal(completed.practiceDone, true)
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
const next = await getDailyPlan(await getCards(), defaultSettings, tomorrow)
assert.notEqual(next.date, initial.date)
assert.equal(next.completedIds.length, 0)
assert.equal(db.objectStoreNames.contains('dailyPlans'), true)
console.log('IndexedDB刷新恢复、收藏保持、完成保持、跨日任务与事务失败回滚检查通过')
