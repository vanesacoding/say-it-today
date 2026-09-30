import { z } from 'zod'

export const generatedCardSchema = z.object({
  cn: z.string().min(1),
  sentence: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  expression: z.string().min(1),
  explanation: z.string().min(1),
  wrongExample: z.string().min(1),
  correctExample: z.string().min(1),
  alternatives: z.array(z.string()),
  scene: z.string().min(1),
  tags: z.array(z.string()),
  difficulty: z.enum(['easy', 'daily', 'challenging'])
})

export const generatedCardsSchema = z.object({ cards: z.array(generatedCardSchema).min(1).max(20) })
export type GeneratedCard = z.infer<typeof generatedCardSchema>
