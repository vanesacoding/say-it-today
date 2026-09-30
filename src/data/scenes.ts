export const scenes = [
  { id: 'driving', icon: '🚗', name: '开车 / 打车' },
  { id: 'restaurant', icon: '🍜', name: '餐厅' },
  { id: 'cafe', icon: '☕', name: '咖啡店' },
  { id: 'airport', icon: '✈️', name: '机场' },
  { id: 'hotel', icon: '🏨', name: '酒店' },
  { id: 'work', icon: '💼', name: '工作' },
  { id: 'chat', icon: '💬', name: '日常聊天' },
  { id: 'shopping', icon: '🛍️', name: '购物' },
  { id: 'friends', icon: '❤️', name: '约会 / 朋友' },
  { id: 'travel', icon: '🌍', name: '旅游' }
] as const

export const sceneName = (id: string) => scenes.find((scene) => scene.id === id)?.name ?? id
