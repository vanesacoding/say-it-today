export type CardStatus = 'new' | 'learning' | 'mastered'
export type CardSource = 'seed' | 'ai' | 'manual'
export type Difficulty = 'easy' | 'daily' | 'challenging'
export type Rating = 'again' | 'familiar' | 'known'

export interface Card {
  id: string
  cn: string
  sentence: string
  question: string
  answer: string
  options: string[]
  explanation: string
  wrongExample: string
  correctExample: string
  alternatives: string[]
  scene: string
  tags: string[]
  expression: string
  theme?: string
  image?: string
  difficulty: Difficulty
  source: CardSource
  createdAt: string
  favorite: boolean
  status: CardStatus
  reviewInterval: number
  nextReviewAt: string | null
  correctCount: number
  wrongCount: number
  lastReviewedAt: string | null
}

export interface Settings {
  newPerDay: number
  reviewPerDay: number
  accent: 'en-US' | 'en-GB'
  goal: string
  difficulty: Difficulty
  autoPlay: boolean
  showChinese: boolean
}

export const defaultSettings: Settings = {
  newPerDay: 8,
  reviewPerDay: 8,
  accent: 'en-US',
  goal: '商务英语与日常进阶',
  difficulty: 'challenging',
  autoPlay: false,
  showChinese: true
}
