import assert from 'node:assert/strict'
import { scheduleCard, similarity } from '../src/utils/srs.ts'
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
console.log('SRS 与跟读相似度检查通过')
