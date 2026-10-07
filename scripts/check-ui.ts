import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.com/say-it-today/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = await import('react-dom/client')
const { default: App } = await import('../src/App.tsx')
const { getCards } = await import('../src/db/index.ts')
let spoken = ''
const speech = { cancel() {}, getVoices: () => [], speak: (utterance: { text: string }) => { spoken = utterance.text } }
Object.assign(dom.window, { speechSynthesis: speech })
Object.assign(globalThis, { speechSynthesis: speech, SpeechSynthesisUtterance: class { lang = ''; rate = 1; constructor(public text: string) {} } })
const container = document.getElementById('root')!
let root = createRoot(container)
const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)) }) }
const mount = async () => { await act(async () => { root.render(createElement(App)) }); await settle() }
const visibleButtons = () => [...document.querySelectorAll('button')].filter((button) => !button.closest('[hidden]'))
const click = async (text: string) => {
  const button = visibleButtons().find((button) => button.textContent?.trim() === text)
  assert.ok(button, `Missing button: ${text}`)
  await act(async () => { button.click(); await new Promise((resolve) => setTimeout(resolve, 40)) })
}
const clickOption = async (text: string) => {
  const button = [...document.querySelectorAll('.options button')].find((button) => button.textContent?.endsWith(text)) as HTMLButtonElement
  assert.ok(button)
  await act(async () => { button.click() })
}
const reload = async () => { await act(async () => { root.unmount() }); root = createRoot(container); await mount() }
await mount()
assert.match(container.textContent!, /新表达 3 句/)
assert.ok(!container.textContent!.includes('align on'), 'Home should not leak target phrase')
await click('开始 5 分钟')
assert.equal(document.querySelector('.countdown'), null)
await clickOption('agree to')
await click('提交答案')
assert.match(document.querySelector('.answer')!.textContent!, /选错了/)
await click('听整句')
assert.equal(spoken, "Let's align on our priorities first.")
await click('遮住答案，自己说')
assert.equal(document.querySelector('.answer'), null)
assert.equal(document.querySelector('.explanation'), null)
await click('显示答案，自己对照')
const favorite = document.querySelector('[aria-label="收藏"]') as HTMLButtonElement
await act(async () => { favorite.click(); await new Promise((resolve) => setTimeout(resolve, 40)) })
await click('会了7 天')
assert.equal((await getCards()).find((card) => card.id === 'seed-target-1')!.wrongCount, 1)
await click('我的表达')
assert.match(document.querySelector('.sentence-list')!.textContent!, /align on/)
await click('再练一句')
await click('‹ 返回我的表达')
await click('今日')
await reload()
assert.match(document.querySelector('.home-segments')!.getAttribute('aria-label')!, /已完成 1，共 3/)
await click('继续学习')
assert.match(document.querySelector('.learning-card')!.textContent!, /slipped|这事我完全忘了/)
await click('暂时不会，看答案')
await click('不会明天')
await clickOption('flag')
await click('提交答案')
await click('有点熟3 天')
assert.equal(document.querySelector('.progress span')!.getAttribute('style'), 'width: 100%;')
assert.match(document.querySelector('.completion-summary')!.textContent!, /今天完成了/)
await click('我说过了，保存练习')
assert.match(document.querySelector('.transfer-practice')!.textContent!, /练习已保存/)
await click('‹ 返回今日目标')
assert.match(document.querySelector('.home-stamp')!.textContent!, /已完成/)
await reload()
assert.match(document.querySelector('.home-stamp')!.textContent!, /已完成/)
await click('查看今日回顾')
assert.match(document.querySelector('.transfer-practice')!.textContent!, /练习已保存/)
await click('设置')
assert.match(container.textContent!, /数量调整从明天生效/)
await act(async () => { root.unmount() })
console.log('React交互检查通过：做题、听音、隐藏答案、收藏回看、刷新恢复、完成返回、练习保存')
