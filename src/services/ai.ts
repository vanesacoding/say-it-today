import type { Card } from '../types'
import { generatedCardsSchema, type GeneratedCard } from './aiSchema'

function toCard(card: GeneratedCard): Card {
  return {
    ...card,
    id: `ai-${crypto.randomUUID()}`,
    source: 'ai', createdAt: new Date().toISOString(), favorite: false,
    status: 'new', reviewInterval: 0, nextReviewAt: null,
    correctCount: 0, wrongCount: 0, lastReviewedAt: null
  }
}

export async function generateCards(input: { text?: string; scene?: string; count?: number; goal?: string }) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 65_000)
  try {
    const response = await fetch(import.meta.env.VITE_API_URL || '/api/generate-cards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal: controller.signal
    })
    if (response.status === 503) throw new Error('豆包 API 尚未配置，请先在 .env.local 填写密钥、模型和接口地址。')
    if (!response.ok) throw new Error('豆包生成失败，请检查服务端配置后重试。')
    return generatedCardsSchema.parse(await response.json()).cards.map(toCard)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('豆包')) throw error
    throw new Error(navigator.onLine ? '豆包暂时没有返回有效内容，请稍后再试。' : '当前网络不可用，联网后再使用 AI 生成功能。')
  } finally {
    window.clearTimeout(timer)
  }
}
