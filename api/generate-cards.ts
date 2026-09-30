import { generatedCardsSchema } from '../src/services/aiSchema'
import { sceneCardsPrompt } from '../src/prompts/generateSceneCards'
import { singleCardPrompt } from '../src/prompts/generateSingleCard'

interface Req { method?: string; body?: { text?: string; scene?: string; count?: number; goal?: string } }
interface Res { status(code: number): Res; json(body: unknown): void }

export default async function handler(req: Req, res: Res) {
  const configured = Boolean(process.env.DOUBAO_API_KEY && process.env.DOUBAO_MODEL && process.env.DOUBAO_BASE_URL)
  if (req.method === 'GET') return res.status(200).json({ configured })
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const input = req.body ?? {}
  if (!input.text && !input.scene) return res.status(400).json({ error: 'missing_input' })

  const baseUrl = process.env.DOUBAO_BASE_URL
  const model = process.env.DOUBAO_MODEL
  if (!configured || !baseUrl || !model) return res.status(503).json({ error: 'ai_not_configured' })

  const prompt = input.text
    ? singleCardPrompt(input.text)
    : sceneCardsPrompt(input.scene!, Math.max(1, Math.min(input.count ?? 10, 20)), input.goal ?? '日常口语')

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DOUBAO_API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: 1800
      }),
      signal: AbortSignal.timeout(60_000)
    })
    if (!response.ok) throw new Error('provider')
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('empty')
    const parsed = generatedCardsSchema.safeParse(JSON.parse(content))
    if (!parsed.success) throw new Error('schema')
    return res.status(200).json(parsed.data)
  } catch (error) {
    console.error('Doubao card generation failed:', error)
    return res.status(502).json({ error: 'generation_failed' })
  }
}
