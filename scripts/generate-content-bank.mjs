import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const directory = resolve(root, 'src/data/content-bank')
const output = resolve(directory, 'cards.json')
const themes = JSON.parse(await readFile(resolve(directory, 'themes.json'), 'utf8'))
const apiKey = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY
const model = process.env.DOUBAO_MODEL || 'doubao-seed-2-1-turbo-260628'
const endpoint = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
if (!apiKey) throw new Error('请先设置 ARK_API_KEY；密钥只用于本地生成，不会写入题库。')

const fields = ['expression', 'phonetic', 'meaning', 'sentence', 'translation', 'promptZh', 'usageZh', 'commonMistake', 'alternative', 'imagePrompt']
const itemSchema = {
  type: 'object', additionalProperties: false, required: [...fields, 'tags'],
  properties: {
    ...Object.fromEntries(fields.map((field) => [field, { type: 'string', minLength: 1 }])),
    tags: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 1 } }
  }
}
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'content_bank_chunk', strict: true,
    schema: { type: 'object', additionalProperties: false, required: ['cards'], properties: { cards: { type: 'array', minItems: 5, maxItems: 5, items: itemSchema } } }
  }
}
const plan = ['B1', 'B2', 'B2', 'B2', 'C1']
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const valid = (card) => card && fields.every((field) => typeof card[field] === 'string' && card[field].trim()) && Array.isArray(card.tags) && card.tags.length >= 2
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let cards = []
try { cards = JSON.parse(await readFile(output, 'utf8')) } catch {}

for (const [themeIndex, theme] of themes.entries()) {
  let themeCards = cards.filter((card) => card.themeId === theme.id)
  if (themeCards.length === 25) {
    console.log(`[${themeIndex + 1}/${themes.length}] ${theme.name} 已存在，跳过`)
    continue
  }
  if (![0, 5, 10, 15, 20].includes(themeCards.length)) {
    console.log(`[${themeIndex + 1}/${themes.length}] ${theme.name} 的未完整批次已清理`)
    cards = cards.filter((card) => card.themeId !== theme.id)
    themeCards = []
  }

  for (let chunk = themeCards.length / 5; chunk < plan.length; chunk++) {
    const level = plan[chunk]
    const generated = []
    for (let attempt = 1; attempt <= 5 && generated.length < 5; attempt++) {
      const existing = [...cards, ...generated].map((card) => card.expression)
      console.log(`[${themeIndex + 1}/${themes.length}] ${theme.name} ${level} 第 ${chunk + 1}/5 批，尝试 ${attempt}`)
      const prompt = `你是为中国成年女性和妈妈设计英语口语内容的资深编辑。请为“${theme.name}”生成 5 条 ${level} 难度的英语表达母题。场景：${theme.description}。

内容必须真实、现代、自然，以美式英语为主。不要生成小学生式孤立名词；优先短语、搭配、句型、形容词和高频口语表达。每条只教一个核心表达，适合 5 分钟口语卡片。避免陈旧、冒犯、刻板印象和中式英语。5 条 expression 和 sentence 均不得重复，也不要使用这些已有表达：${existing.join(' | ') || '无'}。

只返回 JSON：{"cards":[...] }。每个对象必须包含：expression 核心英文表达；phonetic 美式 IPA 且首尾带 /；meaning 自然中文意思；sentence 6–18 个英文单词的真实完整例句；translation 例句中文；promptZh 主动说英文的中文情境；usageZh 1–2 句用法；commonMistake 典型错误英文；alternative 自然英文替代表达；imagePrompt 不含文字或品牌的英文生活场景；tags 2–4 个中文标签。不要输出 Markdown。`
      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], thinking: { type: 'disabled' }, response_format: responseFormat, temperature: 0.9, max_tokens: 6000 }),
          signal: AbortSignal.timeout(120_000)
        })
      } catch (error) {
        console.error(`  请求失败：${error.message}`)
        await wait(1500)
        continue
      }
      if (!response.ok) {
        console.error(`  API ${response.status}: ${(await response.text()).slice(0, 240)}`)
        await wait(1500)
        continue
      }
      try {
        const payload = await response.json()
        const batch = JSON.parse(payload.choices?.[0]?.message?.content || '{}').cards
        if (batch?.length !== 5 || !batch.every(valid)) {
          console.error('  返回内容未通过字段校验')
          continue
        }
        const existingExpressions = new Set([...cards, ...generated].map((card) => normalize(card.expression)))
        const existingSentences = new Set([...cards, ...generated].map((card) => normalize(card.sentence)))
        for (const card of batch) {
          const expression = normalize(card.expression)
          const sentence = normalize(card.sentence)
          if (existingExpressions.has(expression) || existingSentences.has(sentence)) continue
          generated.push(card)
          existingExpressions.add(expression)
          existingSentences.add(sentence)
          if (generated.length === 5) break
        }
        if (generated.length < 5) console.error(`  已保留 ${generated.length}/5 条，继续补齐`)
      } catch (error) { console.error(`  JSON 解析失败：${error.message}`) }
    }
    if (generated.length < 5) throw new Error(`${theme.name} 第 ${chunk + 1} 批连续五次仍未补齐；已完成内容保留，可重新运行续传。`)
    cards = [...cards, ...generated.map((card, index) => ({
      id: `${theme.id}-${String(chunk * 5 + index + 1).padStart(2, '0')}`,
      themeId: theme.id, track: theme.track, level, ...card,
      tags: [...new Set([theme.name, ...card.tags])]
    }))]
    await mkdir(directory, { recursive: true })
    await writeFile(output, `${JSON.stringify(cards, null, 2)}\n`)
  }
}

console.log(`完成：${cards.length} 条，${themes.length} 个主题。`)
