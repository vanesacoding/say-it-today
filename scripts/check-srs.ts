import assert from 'node:assert/strict'
import { scheduleCard, similarity } from '../src/utils/srs.ts'
import { DAILY_CARD_LIMIT, makeQueue } from '../src/pages/TodayPage.tsx'
import type { Card } from '../src/types/index.ts'

const base = {
  reviewInterval: 0, correctCount: 0, wrongCount: 0, status: 'new', nextReviewAt: null, lastReviewedAt: null
} as Card
const now = new Date('2026-01-01T00:00:00.000Z')
assert.equal(scheduleCard(base, 'again', now).reviewInterval, 1)
assert.equal(scheduleCard(base, 'familiar', now).reviewInterval, 3)
assert.equal(scheduleCard(base, 'known', now).reviewInterval, 7)
assert.equal(scheduleCard({ ...base, reviewInterval: 7 }, 'known', now).reviewInterval, 14)
assert.equal(scheduleCard({ ...base, reviewInterval: 14 }, 'known', now).reviewInterval, 30)
assert.ok(similarity("I'm almost there", "I'm almost there.") > 0.99)
const cards = Array.from({ length: 20 }, (_, index) => ({ ...base, id: String(index), tags: [index % 2 ? '日常进阶' : '商务英语'] })) as Card[]
const queue = makeQueue(cards)
assert.equal(queue.length, DAILY_CARD_LIMIT)
assert.equal(queue.filter((card) => card.tags.includes('商务英语')).length, 4)
console.log('SRS、每日 5 分钟队列与跟读相似度检查通过')
