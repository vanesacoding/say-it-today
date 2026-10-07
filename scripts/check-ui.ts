import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.com/say-it-today/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
let played = ''; let playbackRate = 1
class FakeAudio { src = ''; muted = false; currentTime = 0; playbackRate = 1; pause() {} async play() { if (!this.muted) { played = this.src; playbackRate = this.playbackRate } } }
Object.assign(globalThis, { Audio: FakeAudio })
Object.assign(dom.window, { SpeechSynthesisUtterance: class { lang = ''; rate = 1; voice = null; constructor(public text: string) {} }, speechSynthesis: { cancel() {}, getVoices: () => [], speak: (utterance: { text: string; rate: number }) => { played = `speech:${encodeURIComponent(utterance.text)}`; playbackRate = utterance.rate } } })
const timers = new Map<number, () => void>(); let timerId = 0
Object.assign(dom.window, { setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId }, clearTimeout: (id: number) => timers.delete(id) })
const { createRoot } = await import('react-dom/client')
const { default: App } = await import('../src/App.tsx')
const { getVisualSession, getVisualTheme, saveVisualSession, getCards, saveCard } = await import('../src/db/index.ts')
const { visualWords, sentenceCards, learningCards } = await import('../src/data/visualWords.ts')
const container = document.getElementById('root')!
let root = createRoot(container)
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 35)) }
const mount = async () => { await act(async () => { root.render(createElement(App)) }); await act(async () => { await settle() }) }
const click = async (text: string) => {
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)
  assert.ok(button, `Missing button: ${text}`)
  await act(async () => { button.click(); await settle() })
}
const tick = async (seconds: number) => { for (let n = 0; n < seconds; n++) await act(async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()); await settle() }) }
const reload = async () => { await act(async () => root.unmount()); root = createRoot(container); await mount() }
const ids = visualWords.filter((w) => w.theme === 'fruits').map((w) => w.id)
for (const item of visualWords) {
  assert.ok(Buffer.from(item.image!.split(',')[1], 'base64').length > 1000, `${item.id}: photo missing`)
  if (item.audio.startsWith('speech:')) { assert.equal(decodeURIComponent(item.audio.slice(7)), item.word); continue }
  assert.ok(Buffer.from(item.audio.split(',')[1], 'base64').length > 2000, `${item.id}: audio missing`)
  const bytes = Buffer.from(item.audio.split(',')[1], 'base64')
  assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224), 'Valid MP3 header')
}
assert.equal(new Set(visualWords.map((item) => item.id)).size, 66)
await mount()
assert.ok(!container.textContent!.includes('jackfruit'), 'Answer must be hidden until reveal')
assert.equal(document.querySelector('.fruit-photo img')!.getAttribute('alt'), '待猜的物品照片')
await click('开始看图猜词')
await tick(2)
await click('暂停')
const left = document.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')
await tick(6)
assert.equal(document.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow'), left)
await click('继续')
await tick(3)
assert.match(document.querySelector('.word-reveal')!.textContent!, /jackfruit/)
assert.equal(played, visualWords[0].audio)
await click('慢速'); assert.equal(playbackRate, .8)
await click('收藏这个词')
await tick(5)
assert.equal((await getVisualSession(ids)).cursor, 1)
assert.equal(document.querySelector('.fruit-photo img')!.getAttribute('src'), visualWords[1].image)
await click('暂停')
await click('收藏')
assert.match(document.querySelector('.visual-favorites')!.textContent!, /jackfruit/)
await click('返回学习')
await reload()
assert.equal((await getVisualSession(ids)).cursor, 1)
assert.equal(document.querySelector('.word-reveal h2'), null)
await click('开始看图猜词')
await click('暂停')
const seen = new Set(['jackfruit'])
for (let i = 1; i < 6; i++) {
  await click('提前揭晓')
  const word = document.querySelector('.word-reveal h2')!.textContent!
  assert.ok(!seen.has(word)); seen.add(word)
  await click('下一张')
}
assert.match(container.textContent!, /这一组学完了/)
await reload(); assert.match(container.textContent!, /这一组学完了/)
await click('再看一组')
assert.equal((await getVisualSession(ids)).cursor, 6)
assert.equal((await getVisualSession(ids)).batchStart, 6)
await click('开始看图猜词'); await click('暂停'); await click('提前揭晓')
assert.ok(!seen.has(document.querySelector('.word-reveal h2')!.textContent!))
// Existing expression favorites survive the new main experience and database upgrade.
const original = (await getCards())[0]; await saveCard({ ...original, favorite: true })
await reload(); await click('收藏')
assert.match(container.textContent!, /之前收藏的表达/)
assert.ok(container.textContent!.includes(original.sentence))
assert.equal((await getCards()).find((item) => item.id === original.id)!.correctCount, original.correctCount)
await click('返回学习')
const selectTopic = async (value: string) => {
  await act(async () => { const select = document.querySelector('select')!; select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); await settle() })
}
await selectTopic('vegetables')
assert.equal(document.querySelector('.fruit-photo img')!.getAttribute('src'), visualWords.find((item) => item.id === 'artichoke')!.image)
await click('开始看图猜词'); await click('提前揭晓'); await click('收藏这个词'); await click('下一张')
await selectTopic('buffet')
assert.equal(document.querySelector('.sentence-prompt')!.textContent, 'This is _____.')
assert.ok(!document.querySelector('.sentence-stage')!.textContent!.includes('all-you-can-eat'))
await click('开始句子练习'); await click('提前揭晓')
assert.equal(document.querySelector('.sentence-prompt strong')!.textContent, 'all-you-can-eat')
assert.equal(played, sentenceCards[0].audio)
await click('收藏这句话'); await click('下一张')
await reload()
assert.equal(await getVisualTheme(), 'buffet')
assert.equal(document.querySelector('.sentence-prompt')!.textContent, 'Please _____.')
await selectTopic('vegetables')
assert.equal((await getVisualSession(visualWords.filter((item) => item.theme === 'vegetables').map((item) => item.id), 'vegetables')).cursor, 1)
await click('收藏')
assert.match(container.textContent!, /jackfruit/); assert.match(container.textContent!, /artichoke/); assert.match(container.textContent!, /This is all-you-can-eat/)
// Adding entries to an installed deck appends them and retains completed work and favorites.
const previous = await getVisualSession(ids)
await saveVisualSession({ ...previous, cursor: 2, batchStart: 0, favorites: ['jackfruit'] })
const expanded = await getVisualSession([...ids, 'new-word'])
assert.equal(expanded.cursor, 2); assert.equal(expanded.order.at(-1), 'new-word'); assert.deepEqual(expanded.favorites, ['jackfruit'])
assert.equal(new Set(learningCards.map((item) => item.id)).size, 90)
for (const item of sentenceCards) {
  assert.equal(item.word.replace(item.focus!, '_____'), item.prompt)
  assert.equal(decodeURIComponent(item.audio.slice(7)), item.word)
}
await act(async () => root.unmount())
console.log('看图交互检查通过：隐藏答案、5秒揭晓、暂停、音频、收藏、自动前进、刷新恢复、新一组不重复、旧数据保留；66组高清图片/音频、24句整句音频、主题切换、跨模式收藏、扩充词库保留进度检查通过')
