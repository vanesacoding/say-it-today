import type { VisualTheme } from '../db'
import vocabulary from './vocabulary.json'
import sentences from './sentences.json'
import fruits from './fruits-media.json'
import vegetables from './vegetables-media.json'
import kitchen from './kitchen-media.json'
import existingFruitMedia from './visualAssets.json'
export interface VisualWord {
  id: string; word: string; cn: string; phonetic: string; example: string; audio: string
  theme: VisualTheme; kind: 'word' | 'sentence'; image?: string; pictureFit?: 'contain' | 'cover'; aliases?: string[]
  focus?: string; prompt?: string
  credit?: { author: string; license: string; url: string; licenseUrl: string }
}
const media: Record<string, { image?: string }> = { ...fruits, ...vegetables, ...kitchen }
const recordings: Record<string, { audio: string }> = existingFruitMedia
const audioFor = (id: string, text: string) => recordings[id]?.audio || `speech:${encodeURIComponent(text)}`
export const visualWords: VisualWord[] = vocabulary.map((item) => ({ ...item, ...media[item.id], audio: audioFor(item.id, item.word) })) as VisualWord[]
export const sentenceCards: VisualWord[] = sentences.map((item) => ({ ...item, ...media[item.id], audio: audioFor(item.id, item.word) })) as VisualWord[]
export const learningCards = [...visualWords, ...sentenceCards]
export const visualThemes: { id: VisualTheme; label: string; kind: 'word' | 'sentence' }[] = [
  { id: 'fruits', label: '水果', kind: 'word' },
  { id: 'vegetables', label: '蔬菜', kind: 'word' },
  { id: 'kitchen', label: '厨房用品', kind: 'word' },
  { id: 'buffet', label: '自助餐', kind: 'sentence' },
  { id: 'cafe', label: '咖啡店', kind: 'sentence' },
  { id: 'outing', label: '出行与入住', kind: 'sentence' },
  { id: 'everyday', label: '日常交流', kind: 'sentence' }
]
