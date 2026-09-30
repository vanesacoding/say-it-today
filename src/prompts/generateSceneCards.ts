import { SYSTEM_PROMPT } from './base'

export function sceneCardsPrompt(scene: string, count: number, goal: string) {
  return `${SYSTEM_PROMPT}\n请为“${scene}”场景生成 ${count} 张互不重复的学习卡，目标是${goal}。`
}
