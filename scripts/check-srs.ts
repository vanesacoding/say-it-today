import assert from 'node:assert/strict'
import { isDue, scheduleCard, similarity } from '../src/utils/srs.ts'
import { completePlanCard, createDailyPlan, localDateKey, makeQueue, shuffleOptions } from '../src/utils/dailyPlan.ts'
import { defaultSettings, type Card } from '../src/types/index.ts'
const base = { source: 'seed', tags: ['商务英语'], reviewInterval: 0, correctCount: 0, wrongCount: 0, status: 'new', nextReviewAt: null, lastReviewedAt: null } as Card
const now = new Date(2026, 0, 1, 20, 30)
assert.equal(scheduleCard(base, 'again', now).reviewInterval, 1)
assert.equal(scheduleCard(base, 'familiar', now).reviewInterval, 3)
assert.equal(scheduleCard(base, 'known', now).reviewInterval, 7)
assert.equal(scheduleCard({ ...base, reviewInterval: 7 }, 'known', now).reviewInterval, 14)
assert.equal(scheduleCard({ ...base, reviewInterval: 14 }, 'known', now).reviewInterval, 30)
assert.ok(isDue(scheduleCard(base, 'again', now), new Date(2026, 0, 2, 8)))
assert.equal(scheduleCard(base, 'known', now, false).wrongCount, 1)
assert.equal(scheduleCard(base, 'again', now, true).correctCount, 1)
assert.ok(similarity("I'm almost there", "I'm almost there.") > .99)
const cards = Array.from({ length: 20 }, (_, i) => ({ ...base, id: 'seed-target-' + (i + 1), tags: [i % 2 ? '日常进阶' : '商务英语'] })) as Card[]
const personalDue = { ...base, id: 'ai-due', source: 'ai', status: 'learning', nextReviewAt: new Date(2025, 11, 31).toISOString() } as Card
const queue = makeQueue([personalDue, ...cards], defaultSettings, now)
assert.equal(queue.length, 4)
assert.equal(queue[0].id, 'ai-due')
assert.equal(new Set(queue.map((card) => card.id)).size, queue.length)
const plan = createDailyPlan(cards, defaultSettings, now)
assert.equal(plan.cardIds.length, 3)
assert.equal(plan.date, '2026-01-01')
const complete = completePlanCard(plan, plan.cardIds[0])
assert.equal(completePlanCard(complete, plan.cardIds[0]).completedIds.length, 1)
assert.equal(completePlanCard(plan, 'unrelated').completedIds.length, 0)
assert.equal(localDateKey(new Date(2026, 0, 2, 0, 1)), '2026-01-02')
assert.deepEqual([...shuffleOptions(['a', 'b', 'c', 'd'], () => 0)].sort(), ['a', 'b', 'c', 'd'])
assert.notDeepEqual(shuffleOptions(['a', 'b', 'c', 'd'], () => 0), ['a', 'b', 'c', 'd'])
console.log('每日计划、复习日期、对错/自评分离与选项映射检查通过')
