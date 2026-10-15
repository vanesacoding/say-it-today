import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const directory = resolve(root, 'src/data/content-bank')
const themes = JSON.parse(await readFile(resolve(directory, 'themes.json'), 'utf8'))
const cards = JSON.parse(await readFile(resolve(directory, 'cards.json'), 'utf8'))
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const required = ['id', 'themeId', 'track', 'level', 'expression', 'phonetic', 'meaning', 'sentence', 'translation', 'promptZh', 'usageZh', 'commonMistake', 'alternative', 'imagePrompt']

assert.equal(themes.length, 24, '主题必须为 24 个')
assert.equal(cards.length, 600, '题库必须为 600 条')
assert.equal(new Set(cards.map((card) => card.id)).size, 600, 'ID 必须唯一')
assert.equal(new Set(cards.map((card) => normalize(card.expression))).size, 600, '核心表达不得重复')
assert.equal(new Set(cards.map((card) => normalize(card.sentence))).size, 600, '例句不得重复')

for (const theme of themes) {
  const batch = cards.filter((card) => card.themeId === theme.id)
  assert.equal(batch.length, 25, `${theme.name} 必须为 25 条`)
  assert.deepEqual(batch.reduce((counts, card) => ({ ...counts, [card.level]: (counts[card.level] || 0) + 1 }), {}), { B1: 5, B2: 15, C1: 5 }, `${theme.name} 难度比例错误`)
  for (const card of batch) {
    assert.equal(card.track, theme.track, `${card.id} 的赛道错误`)
    for (const field of required) assert.equal(typeof card[field] === 'string' && card[field].trim().length > 0, true, `${card.id}.${field} 不能为空`)
    assert.match(card.phonetic, /^\/.+\/$/, `${card.id} 音标格式错误`)
    assert.equal(Array.isArray(card.tags) && card.tags.length >= 2, true, `${card.id} 标签不足`)
  }
}

console.log('题库检查通过：24 个主题、600 条表达、ID/表达/例句唯一、难度比例正确。')
