export type Page = 'today' | 'scenes' | 'generate' | 'mine' | 'settings'

const items: { id: Page; icon: string; label: string }[] = [
  { id: 'today', icon: '◉', label: '今日' },
  { id: 'scenes', icon: '▦', label: '场景' },
  { id: 'generate', icon: '✦', label: 'AI 生成' },
  { id: 'mine', icon: '♡', label: '我的' },
  { id: 'settings', icon: '⚙', label: '设置' }
]

export function BottomNav({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  return <nav className="bottom-nav" aria-label="主导航">
    {items.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
      <span aria-hidden="true">{item.icon}</span>{item.label}
    </button>)}
  </nav>
}
