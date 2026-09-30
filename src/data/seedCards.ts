import type { Card, Difficulty } from '../types'

type Seed = [cn: string, sentence: string, question: string, answer: string, options: string[], expression: string, explanation: string, wrong: string, alternative?: string, difficulty?: Difficulty]

const groups: Record<string, Seed[]> = {
  driving: [
    ['我来接你。', "I'll pick you up.", "I'll ____.", 'pick you up', ['pick you up', 'pick up you', 'take you up', 'meet to you'], 'pick someone up', '表示开车去接某人；代词放在 pick 和 up 中间。', "I'll pick up you.", "I'll come pick you up."],
    ['我送你回去。', "I'll drop you off.", "I'll ____.", 'drop you off', ['drop you off', 'drop off you', 'send you down', 'take off you'], 'drop someone off', '表示开车把某人送到目的地。', "I'll drop off you.", "I'll give you a ride back."],
    ['靠边停就行。', 'You can pull over here.', 'You can ____ here.', 'pull over', ['pull over', 'stop aside', 'park over', 'pull aside me'], 'pull over', '指车辆安全靠边停车。', 'You can stop aside here.', 'You can let me out here.'],
    ['我马上到了。', "I'm almost there.", "I'm ____ there.", 'almost', ['almost', 'mostly', 'nearly to', 'soon at'], 'almost there', '表示离目的地很近，马上就到。', "I'm nearly to there.", "I'll be there in a minute."],
  ],
  restaurant: [
    ['可以帮我打包吗？', 'Could I get this to go?', 'Could I get this ____?', 'to go', ['to go', 'take away it', 'for leave', 'to outside'], 'to go', '美式英语中表示把食物打包带走。', 'Could I take away this?', 'Could you box this up for me?'],
    ['我们可以点餐了吗？', "We're ready to order.", "We're ready ____.", 'to order', ['to order', 'for ordering', 'order now', 'to ordering'], 'be ready to order', '服务员过来时，用这句自然表示可以点餐了。', "We're ready for order.", 'Could we order, please?'],
    ['这个里面有坚果吗？', 'Does this contain nuts?', 'Does this ____ nuts?', 'contain', ['contain', 'include of', 'have with', 'contains'], 'contain', '询问食物是否含有某种成分。', 'Does this contains nuts?', 'Are there any nuts in this?'],
    ['麻烦买单。', 'Could we get the check, please?', 'Could we get ____, please?', 'the check', ['the check', 'the bill out', 'a checkout', 'paying'], 'get the check', '在美国餐厅自然地请求结账。', 'Could we get checkout?', 'Can we have the check, please?'],
  ],
  airport: [
    ['能给我靠过道的座位吗？', 'Could I get an aisle seat?', 'Could I get ____?', 'an aisle seat', ['an aisle seat', 'a passage seat', 'an aisle chair', 'a side seat'], 'aisle seat', 'aisle seat 是靠过道的座位。', 'Could I get a passage seat?', 'Do you have any aisle seats available?'],
    ['在哪里办理登机？', 'Where do I check in?', 'Where do I ____?', 'check in', ['check in', 'check on', 'board in', 'register flight'], 'check in', '表示办理登机手续。', 'Where do I check on?', 'Where is the check-in counter?'],
    ['我的航班延误了吗？', 'Has my flight been delayed?', 'Has my flight been ____?', 'delayed', ['delayed', 'late off', 'postponing', 'behind time'], 'be delayed', '航班延误通常使用 be delayed。', 'Is my flight delay?', 'Is my flight still on time?'],
    ['这个行李可以随身带吗？', 'Can I take this as a carry-on?', 'Can I take this as ____?', 'a carry-on', ['a carry-on', 'a hand bagging', 'a take-on', 'a cabin thing'], 'carry-on', 'carry-on 指随身带上飞机的行李。', 'Can I take this as a take-on?', 'Can this go in the cabin?'],
  ],
  hotel: [
    ['我想办理入住。', "I'd like to check in.", "I'd like to ____.", 'check in', ['check in', 'live in', 'enter room', 'book in'], 'check in', '到酒店后办理入住最常用的表达。', "I'd like to live in.", 'I have a reservation under Wang.'],
    ['可以晚点退房吗？', 'Could I get a late checkout?', 'Could I get ____?', 'a late checkout', ['a late checkout', 'a later leave', 'checkout lately', 'a delay room'], 'late checkout', 'late checkout 指延迟退房。', 'Could I checkout lately?', 'Would it be possible to check out late?'],
    ['房间里的空调坏了。', "The air conditioning isn't working.", "The air conditioning ____.", "isn't working", ["isn't working", "doesn't open", 'is broken down it', 'has no work'], "isn't working", '礼貌、自然地说明设备无法使用。', "The air conditioning doesn't open.", 'There seems to be a problem with the AC.'],
    ['可以再给我一条毛巾吗？', 'Could I get another towel?', 'Could I get ____?', 'another towel', ['another towel', 'one more towels', 'a towel again', 'other towel'], 'another', 'another + 单数名词，表示再一个。', 'Could I get one more towels?', 'Could you bring up an extra towel?'],
  ],
  work: [
    ['我今天得加班。', 'I have to work late today.', 'I have to ____ today.', 'work late', ['work late', 'work overtime time', 'add work', 'work lately'], 'work late', '日常口语里常用 work late 表示加班到很晚。', 'I have to add work today.', "I'm working late tonight."],
    ['我们改天再聊这个吧。', "Let's come back to this another day.", "Let's ____ another day.", 'come back to this', ['come back to this', 'return this topic', 'talk back it', 'come again this'], 'come back to something', '表示稍后或改天重新讨论某事。', "Let's return this topic another day.", "Let's pick this up another day."],
    ['我马上把文件发给你。', "I'll send you the file right away.", "I'll send you the file ____.", 'right away', ['right away', 'at once time', 'soonly', 'right now later'], 'right away', '表示立即、马上。', "I'll send it soonly.", "I'll send it over in a minute."],
    ['这个截止时间能延吗？', 'Can we push back the deadline?', 'Can we ____ the deadline?', 'push back', ['push back', 'push away', 'delay after', 'move lately'], 'push back a deadline', '表示把截止时间往后推。', 'Can we push away the deadline?', 'Could we move the deadline back?'],
  ],
  chat: [
    ['我有点晚了。', "I'm running a little late.", "I'm running a little ____.", 'late', ['late', 'slow', 'later', 'behindly'], 'run late', '表示可能比约定时间晚到。', "I'm running a little later.", "I'm going to be a bit late."],
    ['听起来不错。', 'Sounds good.', '____ good.', 'Sounds', ['Sounds', 'Hears', 'Listens', 'Looks like'], 'sounds good', '轻松自然地表示同意安排。', 'Hears good.', 'That works for me.'],
    ['别急，慢慢来。', 'Take your time.', '____ your time.', 'Take', ['Take', 'Use', 'Spend', 'Have'], 'take your time', '告诉对方不用着急。', 'Use your time.', "There's no rush."],
    ['我也这么觉得。', 'I feel the same way.', 'I feel ____ way.', 'the same', ['the same', 'a same', 'same the', 'in same'], 'feel the same way', '自然表达与对方有相同感受。', 'I feel a same way.', 'I think so too.'],
  ],
  shopping: [
    ['我只是随便看看。', "I'm just looking.", "I'm just ____.", 'looking', ['looking', 'watching', 'seeing around', 'having a look at'], 'just looking', '店员询问是否需要帮助时的常用回答。', "I'm just watching.", "I'm just browsing, thanks."],
    ['这个有大一号的吗？', 'Do you have this in a larger size?', 'Do you have this in ____?', 'a larger size', ['a larger size', 'a bigger number', 'large one size', 'more large'], 'in a larger size', '询问同款更大尺码。', 'Do you have this more large?', 'Could I try the next size up?'],
    ['我可以试穿吗？', 'Can I try this on?', 'Can I ____?', 'try this on', ['try this on', 'try on this', 'wear a try', 'test this'], 'try something on', '代词放在 try 和 on 中间。', 'Can I try on it?', 'Where are the fitting rooms?'],
    ['可以退货吗？', 'Can I return this?', 'Can I ____ this?', 'return', ['return', 'give back to', 'refund', 'send again'], 'return an item', 'return 作动词表示退货。', 'Can I give back this to?', "What's your return policy?"],
  ],
  travel: [
    ['去市中心怎么走？', 'How do I get downtown?', 'How do I ____ downtown?', 'get', ['get', 'go to the', 'arrive to', 'reach to'], 'get somewhere', 'get + 地点表示到达；downtown 前通常不加 to。', 'How do I get to downtown?', "What's the best way to get downtown?"],
    ['这里离车站远吗？', 'Is it far from the station?', 'Is it far ____ the station?', 'from', ['from', 'to', 'away', 'with'], 'far from', 'far from 表示离某地远。', 'Is it far to the station?', 'Is the station far from here?'],
    ['我好像迷路了。', 'I think I\'m lost.', 'I think ____ lost.', "I'm", ["I'm", 'I get', 'I have', 'I was being'], 'be lost', '简洁自然地表示迷路。', 'I think I have lost.', "I don't think I'm going the right way."],
    ['这趟车去老城区吗？', 'Does this train go to the old town?', 'Does this train ____ the old town?', 'go to', ['go to', 'goes to', 'arrive', 'drive at'], 'go to', '询问交通工具是否前往某地。', 'Does this train goes to the old town?', 'Is this the right train for the old town?'],
  ]
}

const lifeCards: Card[] = Object.entries(groups).flatMap(([scene, cards]) => cards.map((card, index) => {
  const [cn, sentence, question, answer, options, expression, explanation, wrongExample, alternative, difficulty = 'daily'] = card
  return {
    id: `seed-${scene}-${index + 1}`,
    cn, sentence, question, answer, options, expression, explanation, wrongExample,
    correctExample: sentence,
    alternatives: alternative ? [alternative] : [],
    scene,
    tags: [scene, expression],
    difficulty,
    source: 'seed',
    createdAt: '2026-01-01T00:00:00.000Z',
    favorite: false,
    status: 'new',
    reviewInterval: 0,
    nextReviewAt: null,
    correctCount: 0,
    wrongCount: 0,
    lastReviewedAt: null
  }
}))

type TargetSeed = [track: '商务英语' | '日常进阶', cn: string, sentence: string, question: string, answer: string, options: string[], expression: string, explanation: string, wrong: string, alternative: string]

const targetData: TargetSeed[] = [
  ['商务英语', '我们先统一一下优先事项。', "Let's align on our priorities first.", "Let's ____ our priorities first.", 'align on', ['align on', 'agree to', 'line up at', 'match with'], 'align on', 'align on 表示团队就目标、范围或优先级达成共同理解，比 agree 更强调对齐认知。', "Let's align our priorities first.", "Let's make sure we're aligned on priorities."],
  ['日常进阶', '这事我完全忘了。', 'It completely slipped my mind.', 'It completely ____ my mind.', 'slipped', ['slipped', 'escaped from', 'missed', 'forgot through'], 'slip your mind', 'slip your mind 是自然口语，表示一时忘记某事。', 'It slipped from my mind.', 'It totally slipped my mind.'],
  ['商务英语', '我想提出一个顾虑。', "I'd like to flag a concern.", "I'd like to ____ a concern.", 'flag', ['flag', 'mark out', 'raise up', 'signal to'], 'flag a concern', 'flag 在商务语境中表示把问题提出来供大家注意，语气直接但不冒犯。', "I'd like to flag up a concern to you.", "There is one concern I'd like to raise."],
  ['日常进阶', '这不太合我的口味。', "It's not quite my thing.", "It's not quite ____.", 'my thing', ['my thing', 'for my taste of', 'my style thing', 'to my liking it'], 'not quite my thing', '委婉表达自己不喜欢某种活动、风格或选择，比 I hate it 更得体。', "It's not my cup.", "It's not really for me."],
  ['商务英语', '我们需要管理好客户的预期。', "We need to manage the client's expectations.", 'We need to ____ the client\'s expectations.', 'manage', ['manage', 'control on', 'handle with', 'reduce down'], 'manage expectations', 'manage expectations 指提前说明现实范围、时间或结果，避免对方产生不切实际的期待。', "We need to control the client's expectations.", "We should set realistic expectations with the client."],
  ['日常进阶', '这个消息让我措手不及。', 'The news caught me off guard.', 'The news caught me ____.', 'off guard', ['off guard', 'without guard', 'by surprise of', 'unready'], 'catch someone off guard', '表示突发情况让人没有心理准备，常用于消息、问题或反应。', 'The news caught me unpreparedly.', 'I was taken aback by the news.'],
  ['商务英语', '这个问题我们会后单独聊。', "Let's take this offline.", "Let's take this ____.", 'offline', ['offline', 'outside', 'afterward meeting', 'privately out'], 'take this offline', '会议中表示把偏题或需要深入讨论的问题留到会后小范围处理。', "Let's discuss this out of the meeting.", "Let's follow up on this after the meeting."],
  ['日常进阶', '我还在犹豫。', "I'm still on the fence.", "I'm still ____.", 'on the fence', ['on the fence', 'in two minds of', 'between choices', 'not decided yetly'], 'on the fence', '表示尚未决定、两边都在考虑；比 I don’t know 更准确。', "I'm still on a fence.", "I haven't made up my mind yet."],
  ['商务英语', '请随时同步给相关方。', 'Please keep the stakeholders in the loop.', 'Please keep the stakeholders ____.', 'in the loop', ['in the loop', 'on the line', 'inside information', 'updated with it'], 'keep someone in the loop', '表示持续让相关人员掌握进展，是项目协作中的高频表达。', 'Please keep the stakeholders on the loop.', 'Please keep everyone updated.'],
  ['日常进阶', '我特意绕道去帮她。', 'I went out of my way to help her.', 'I ____ to help her.', 'went out of my way', ['went out of my way', 'went by my way', 'made an extra road', 'went beyond me'], 'go out of your way', '表示付出额外努力做某事，通常强调体贴或不嫌麻烦。', 'I went out from my way to help her.', 'I made a special effort to help her.'],
  ['商务英语', '目前的时间表只是暂定。', 'The timeline is tentative at this stage.', 'The timeline is ____ at this stage.', 'tentative', ['tentative', 'temporary planned', 'uncertainly', 'roughly decided'], 'tentative', 'tentative 表示尚未最终确认、之后可能调整，适合计划、日期和协议。', 'The timeline is tentatively at this stage.', 'The timeline is still provisional.'],
  ['日常进阶', '你得听懂他的言外之意。', 'You have to read between the lines.', 'You have to read ____.', 'between the lines', ['between the lines', 'behind his words', 'inside the sentence', 'through the meanings'], 'read between the lines', '表示从没有明说的话中理解真实含义或态度。', 'You have to read behind the lines.', 'Pay attention to what he is implying.'],
  ['商务英语', '我想进一步确认一下具体范围。', "I'd like to get more clarity on the scope.", "I'd like to get more ____ on the scope.", 'clarity', ['clarity', 'clear', 'clarification about of', 'details clear'], 'get clarity on', 'get clarity on 用于礼貌地要求把范围、职责或要求说得更明确。', "I'd like to get more clear on the scope.", "Could we clarify the scope a little further?"],
  ['日常进阶', '先往好处想，别急着下结论。', "Let's give her the benefit of the doubt.", "Let's give her ____.", 'the benefit of the doubt', ['the benefit of the doubt', 'a positive doubt', 'the good assumption', 'some trust benefit'], 'give someone the benefit of the doubt', '在证据不足时暂且相信对方没有恶意或有合理解释。', "Let's give her a benefit of doubt.", "Let's not jump to conclusions."],
  ['商务英语', '这项方案需要得到高层支持。', 'We need executive buy-in for this proposal.', 'We need executive ____ for this proposal.', 'buy-in', ['buy-in', 'approval from', 'supporting in', 'agreement of'], 'executive buy-in', 'buy-in 不只是批准，还包含关键人员真正认同并愿意支持执行。', 'We need executives buy in this proposal.', 'We need senior leadership to back this proposal.'],
  ['日常进阶', '这让我重新看清了事情的轻重。', 'That really put things into perspective.', 'That really put things ____.', 'into perspective', ['into perspective', 'in perspective view', 'to the right scale', 'under context'], 'put things into perspective', '表示一件事帮助自己更客观地判断问题的重要性或全貌。', 'That put the things in perspective.', 'That helped me see the bigger picture.']
]

const targetPhonetics = [
  '/əˈlaɪn ɑːn/', '/slɪp jʊr maɪnd/', '/flæɡ ə kənˈsɜːrn/', '/nɑːt kwaɪt maɪ θɪŋ/',
  '/ˈmænɪdʒ ˌekspekˈteɪʃənz/', '/kætʃ ˌsʌmwʌn ɔːf ˈɡɑːrd/', '/teɪk ðɪs ˌɔːfˈlaɪn/', '/ɑːn ðə fens/',
  '/kiːp ˌsʌmwʌn ɪn ðə luːp/', '/ɡoʊ aʊt əv jʊr weɪ/', '/ˈtentətɪv/', '/riːd bɪˈtwiːn ðə laɪnz/',
  '/ɡet ˈklærəti ɑːn/', '/ɡɪv ˌsʌmwʌn ðə ˈbenəfɪt əv ðə daʊt/', '/ɪɡˈzekjətɪv ˈbaɪ ɪn/', '/pʊt θɪŋz ˌɪntuː pərˈspektɪv/'
]

const targetCards: Card[] = targetData.map(([track, cn, sentence, question, answer, options, expression, explanation, wrongExample, alternative], index) => ({
  id: `seed-target-${index + 1}`, cn, sentence, question, answer, options, expression, explanation, wrongExample,
  correctExample: sentence, alternatives: [alternative], scene: track === '商务英语' ? 'work' : 'chat', tags: [track, expression], theme: track,
  phonetic: targetPhonetics[index], image: `${import.meta.env.BASE_URL}images/advanced/${index + 1}.webp`,
  difficulty: 'challenging', source: 'seed', createdAt: '2026-09-30T00:00:00.000Z', favorite: false, status: 'new', reviewInterval: 0,
  nextReviewAt: null, correctCount: 0, wrongCount: 0, lastReviewedAt: null
}))

const personalityData = [
  ['傲慢', 'He can be pretty arrogant.', 'He can be pretty ____.', 'arrogant', ['arrogant', 'confidently', 'strict', 'proudly'], 'arrogant', 'arrogant 表示自以为比别人优越，语气比 confident 更负面。', 'He is very confidently.', 'arrogant.webp'],
  ['淘气', "She's mischievous.", "She's ____.", 'mischievous', ['mischievous', 'naughtyly', 'humorous', 'active'], 'mischievous', 'mischievous 常形容爱恶作剧、带点顽皮的人，未必真的坏。', 'She is naughtyly.', 'mischievous.webp'],
  ['体贴', "He's very considerate.", "He's very ____.", 'considerate', ['considerate', 'considering', 'careful of', 'thought'], 'considerate', 'considerate 表示会顾及他人的感受和需要。', 'He is very considering.', 'considerate.webp'],
  ['固执', 'She can be really stubborn.', 'She can be really ____.', 'stubborn', ['stubborn', 'steady', 'strong-mindedly', 'insistent to'], 'stubborn', 'stubborn 表示不愿改变想法或做法，通常略带负面。', 'She is very stubbornly.', 'stubborn.webp'],
  ['外向', "She's outgoing and easy to talk to.", "She's ____ and easy to talk to.", 'outgoing', ['outgoing', 'outside', 'openly', 'socialized'], 'outgoing', 'outgoing 表示外向、喜欢与人交往。', 'She is very outside.', 'outgoing.webp'],
  ['内敛', "He's quiet and reserved.", "He's quiet and ____.", 'reserved', ['reserved', 'introvertedly', 'shy of', 'silent person'], 'reserved', 'reserved 表示不轻易表达感受、言行克制；不一定是害羞。', 'He is very introvertedly.', 'reserved.webp']
] as const

const personalityCards: Card[] = personalityData.map(([cn, sentence, question, answer, options, expression, explanation, wrongExample, image], index) => ({
  id: `seed-personality-${index + 1}`,
  cn: `他/她有点${cn}。`, sentence, question, answer, options: [...options], expression, explanation, wrongExample,
  correctExample: sentence, alternatives: [], scene: 'chat', tags: ['人物性格', cn], theme: '描述人物性格',
  image: `${import.meta.env.BASE_URL}images/personality/${image}`, difficulty: 'daily', source: 'seed', createdAt: '2026-09-30T00:00:00.000Z',
  favorite: false, status: 'new', reviewInterval: 0, nextReviewAt: null, correctCount: 0, wrongCount: 0, lastReviewedAt: null
}))

export const seedCards: Card[] = [...targetCards, ...personalityCards, ...lifeCards]
