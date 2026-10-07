import { useEffect, useState } from 'react'
import type { Card, DailyPlan, Rating, Settings } from '../types'
import { LearningCard } from '../components/LearningCard'
import { ProgressBar } from '../components/ProgressBar'

const transferExamples: Record<string, [string, string]> = {
  'align on': ['我们先统一一下项目范围。', "Let's align on the project scope first."],
  'slip your mind': ['我完全忘了这次会议。', 'The meeting completely slipped my mind.'],
  'flag a concern': ['我想提出一个关于时间安排的顾虑。', "I'd like to flag a concern about the timeline."],
  'not quite my thing': ['别人邀请你参加一项不喜欢的活动，委婉表达不太感兴趣。', "It's not quite my thing."],
  'manage expectations': ['我们需要管理好团队的预期。', "We need to manage the team's expectations."],
  'catch someone off guard': ['这个问题让我措手不及。', 'The question caught me off guard.'],
  'take this offline': ['会议中建议把这个问题留到会后讨论。', "Let's take this offline."],
  'on the fence': ['我还在犹豫要不要接受这份工作。', "I'm still on the fence about accepting the job."]
}

export function TodayPage({ cards, plan, settings, active, busy, onUpdate, onRate, onPractice, onOpenMine }: {
  cards: Card[]; plan: DailyPlan; settings: Settings; active: boolean; busy: boolean
  onUpdate: (card: Card) => Promise<void>; onRate: (card: Card, rating: Rating, correct: boolean) => Promise<void>
  onPractice: (draft: string, done: boolean) => Promise<void>; onOpenMine: () => void
}) {
  const [started, setStarted] = useState(false)
  const [draft, setDraft] = useState(plan.practiceDraft)
  const [showReference, setShowReference] = useState(false)
  useEffect(() => { setStarted(false); setDraft(plan.practiceDraft); setShowReference(false) }, [plan.date])
  const planned = plan.cardIds.map((id) => cards.find((card) => card.id === id)).filter((card): card is Card => Boolean(card))
  const queue = planned.filter((card) => !plan.completedIds.includes(card.id))
  const total = planned.length
  const completed = planned.filter((card) => plan.completedIds.includes(card.id)).length
  const card = queue[0]
  const finished = !card
  const reviewCount = plan.reviewIds.filter((id) => planned.some((card) => card.id === id)).length
  const practiceCard = planned[0]
  const transfer = practiceCard && (transferExamples[practiceCard.expression] ?? [practiceCard.cn, practiceCard.sentence])
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${plan.date}T12:00:00`))
  if (!started) return <main className="page today-home">
    <header className="home-top"><div><p>{date}</p><h1>今天，只学 5 分钟</h1></div><div className="home-avatar">6.5</div></header>
    <section className="home-goal"><span className="eyebrow">TODAY'S 5 MINUTES</span><h2>商务沟通 · 日常进阶</h2><p>少背基础词，多练自然、得体的表达。</p><div className="home-stamp">今日<br />{finished ? '已完成' : '未完成'}</div><div className="home-segments" aria-label={`已完成 ${completed}，共 ${total} 句`}>{Array.from({ length: total }, (_, i) => <i className={i < completed ? 'done' : ''} key={i} />)}</div></section>
    <div className="home-section-title"><h2>{finished ? '今日回顾' : completed ? '接着学' : '今天练什么'}</h2><span>{finished ? `完成 ${completed} 句` : `还剩 ${queue.length} 句`}</span></div>
    {card ? <article className="home-next">{card.image && <img src={card.image} alt="学习场景" />}<div><small>{plan.reviewIds.includes(card.id) ? '到期复习' : '下一句 · 场景预告'}</small><h2>{card.cn}</h2><p>先想一想，再听一句，最后自己说。</p></div></article> : <article className="home-review"><div><b>{total ? '今天的表达已经排入后续复习' : '今天没有到期复习或新表达'}</b><p>{total ? '可以回顾已学表达，或再练一句自己的话。' : '你可以到“我的表达”自主练习。'}</p></div></article>}
    <article className="home-review"><div><b>今日计划 · {total} 句</b><p>新表达 {total - reviewCount} 句 + 到期复习 {reviewCount} 句{reviewCount === 0 ? ' · 今天暂无到期复习' : ''}</p></div><span>按你的节奏</span></article>
    <button className="home-start" onClick={() => total ? setStarted(true) : onOpenMine()}>{finished ? total ? '查看今日回顾' : '去我的表达' : completed ? '继续学习' : '开始 5 分钟'}</button>
  </main>
  return <main className="page today-page">
    <button className="study-back" onClick={() => setStarted(false)}>‹ 返回今日目标</button>
    <header className="today-header"><div><span className="eyebrow">TODAY'S 5 MINUTES</span><h1>{card?.theme ?? '今日回顾'}</h1></div><p>{finished ? `完成 ${completed} 句` : `还剩 ${queue.length} 句`}</p></header>
    <ProgressBar value={completed} max={total} />
    {card ? <LearningCard key={`${plan.date}-${card.id}`} card={card} settings={settings} active={active} busy={busy} onFavorite={() => onUpdate({ ...card, favorite: !card.favorite })} onRate={(rating, correct) => onRate(card, rating, correct)} /> : <>
      <section className="completion-summary"><h2>今天完成了</h2><p>这些句子已经排进下一次复习。</p><ul>{planned.map((item) => <li key={item.id}><b>{item.expression}</b><span>{item.cn}</span></li>)}</ul><button className="secondary wide" onClick={onOpenMine}>去我的表达回看</button></section>
      {practiceCard && transfer && <section className="recall-practice transfer-practice"><span className="eyebrow">再说一句自己的话 · 可选</span><h3>试着用 {practiceCard.expression}</h3><p>{transfer[0]}</p><label className="field"><span>你的英文（也可以先口头说）</span><textarea rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="把你的说法写在这里…" /></label><button className="text-button" onClick={() => setShowReference(!showReference)}>{showReference ? '收起参考表达' : '看一种参考表达'}</button>{showReference && <p className="alternative">{transfer[1]}</p>}<button className="primary wide" disabled={busy} onClick={() => void onPractice(draft, true).catch(() => {})}>{plan.practiceDone ? '已完成 · 保存修改' : '我说过了，保存练习'}</button>{plan.practiceDone && <p role="status">练习已保存。参考表达不是唯一答案。</p>}</section>}
    </>}
  </main>
}
