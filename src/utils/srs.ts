import type { Card, Rating } from '../types'

export function scheduleCard(card: Card, rating: Rating, now = new Date(), answeredCorrect?: boolean): Card {
  const knownInterval = card.reviewInterval >= 14 ? 30 : card.reviewInterval >= 7 ? 14 : 7
  const reviewInterval = rating === 'again' ? 1 : rating === 'familiar' ? 3 : knownInterval
  const nextReview = new Date(now)
  nextReview.setDate(nextReview.getDate() + reviewInterval)
  nextReview.setHours(0, 0, 0, 0)
  return {
    ...card,
    status: rating === 'again' ? 'learning' : rating === 'known' ? 'mastered' : 'learning',
    reviewInterval,
    nextReviewAt: nextReview.toISOString(),
    correctCount: card.correctCount + (answeredCorrect === true || (answeredCorrect === undefined && rating !== 'again') ? 1 : 0),
    wrongCount: card.wrongCount + (answeredCorrect === false || (answeredCorrect === undefined && rating === 'again') ? 1 : 0),
    lastReviewedAt: now.toISOString()
  }
}

export function isDue(card: Card, now = new Date()) {
  return Boolean(card.nextReviewAt && new Date(card.nextReviewAt) <= now)
}

export function similarity(a: string, b: string) {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const x = clean(a)
  const y = clean(b)
  if (!x || !y) return 0
  const words = new Set(y.split(' '))
  return x.split(' ').filter((word) => words.has(word)).length / Math.max(x.split(' ').length, y.split(' ').length)
}
