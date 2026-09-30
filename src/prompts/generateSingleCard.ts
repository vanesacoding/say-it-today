import { SYSTEM_PROMPT } from './base'

export function singleCardPrompt(cn: string) {
  return `${SYSTEM_PROMPT}\n请把这句话制作成 1 张学习卡：${cn}`
}
