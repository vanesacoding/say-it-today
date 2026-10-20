# 100本书库内容与配音验收记录

日期：2026-10-20。此记录对应 `library-100-three-voices-20261020`；上线数量以成功部署及线上目录为准。

## 书目和来源

保留现有50本，新增50本独立书目。排除了与现有《Friends》几乎同文的《My new friends》，以及图文错配的《A cow is my friend》《Keeper and His Special Nursery》、留白过多的《A Tiny Seed》。新增实际522页英文；英文逐页等于所链固定来源的 sourceText，仅合并换行空白。图片使用原始字节并记录SHA256，正文页短边至少320像素，宽高比不超过1.4。

46本新增为CC BY，4本新增（0002、0003、0030、0067）为CC BY-NC 3.0，仅用于当前无收费、无广告的非商业版本。每本保留作者、插画者、文字来源、图片许可证据与许可链接；NC许可在绘本说明中明确显示。Oxford未获授权的正文、插画和配音未收录。

《Letter to mum》原图16、17依照固定英文中“两名宝宝／屋外等待”配对；图像字节不变，书内说明有记载。人物传记按出版时语境阅读，例如Zanele末页的2016年计划，不呈现为当前新闻。

## 分类与阶段

100本主分类：日常生活34、动物与自然28、颜色与发现15、心情与朋友23。阶段：S1 23、S2 36、S3 41。S3含较长传记与民间故事，可分次听，暂不强求每个主题覆盖相同数量或难度。阶段是本产品亲子共读建议，非Oxford级别。

复核全部书目主主题与附属主题：数动物以观察数数为主，保留动物副主题；找纽扣以帮助与友谊为主；比赛故事以合作、公平为主；火的用途以观察发现为主。原有8本中泛泛重复的提示已按页替换为动作、指图、生活关联。新增522页每页一个简短中文提示，不要求拼写、背诵、打卡或答对。动物童话、昼夜神话与真实自然知识区别说明；真实工具、道路或火的操作由照顾孩子的大人负责。

## 原文与旧录音

已上线的0248第5页为 I saw a Giraffe.，对应两只低头喝水的长颈鹿。此前改成leopard的错误已撤回。此批另恢复0079的 takes the milk、0268的 beautiful flat house、0147的 monkey balls 原文；旧版其他语法标点校订保留并在绘本说明中披露。原版真人英文、原画和音频不改；仅允许陪读提示与主题调整。

## 音色与生产保护

新增分配：Rowan美式17本、Charlotte英式17本、Knightley英式16本。每本固定一个音色，新增书禁止Charlie。原有3页修复沿用原书Charlie，避免同书换声；其他原有录音复用。

三音色相同短文试听任务39355874472成功；音频通过解码、时长及非静音检查。口音名称依据官方音色表，不能把自动音频校验当作逐页真人听审或发音绝对无误。

本批525个逐页请求、65551输入字符。每次提交前落盘请求ID与状态，完成后验证音频并存内容哈希。已完成页面可复用；请求结果不明时停止，不自动重试付费请求。分片与整批计划有SHA256保护，新书英文、音色、书目或原目录变动即拒绝生产。发布前后主分支与源目录校验，全部音频、图像和UI检查通过后才部署。

## 新增书目

| ID | 绘本 | 主分类 | 阶段 | 旁白 |
|---|---|---|---|---|
| 0004 | 山羊、小狗和奶牛 / Goat, Dog, and Cow | 动物与自然 | S3 | Rowan · 美式英语 |
| 0006 | 阿南西和智慧 / Anansi and Wisdom | 心情与朋友 | S3 | Charlotte · 英式英语 |
| 0007 | 找水喝 / Looking for water | 日常生活 | S1 | Knightley · 英式英语 |
| 0013 | 写给妈妈的信 / Letter to mum | 日常生活 | S3 | Rowan · 美式英语 |
| 0017 | 扎内莱·西图：我的故事 / Zanele Situ: My Story | 心情与朋友 | S3 | Charlotte · 英式英语 |
| 0018 | 娅耶丽为什么这么棒？ / Why is Yayeri great? | 日常生活 | S2 | Knightley · 英式英语 |
| 0021 | 店主登贝 / Dembe the shopkeeper | 日常生活 | S2 | Rowan · 美式英语 |
| 0027 | 一起作决定 / Decision | 心情与朋友 | S3 | Charlotte · 英式英语 |
| 0035 | 风来了 / Wind | 动物与自然 | S2 | Knightley · 英式英语 |
| 0042 | 胡狼与酸葡萄 / Hungry jackal and the sour grapes | 心情与朋友 | S3 | Rowan · 美式英语 |
| 0045 | 胡狼与乌鸦 / The clever jackal and the foolish crow | 心情与朋友 | S3 | Charlotte · 英式英语 |
| 0051 | 我们看见彩虹的那天 / The day we saw the rainbow | 颜色与发现 | S2 | Knightley · 英式英语 |
| 0067 | 一起做饭 / Cooking | 日常生活 | S1 | Rowan · 美式英语 |
| 0074 | 聪明的小小鸟 / The Clever Little Bird | 动物与自然 | S3 | Charlotte · 英式英语 |
| 0092 | 龟兔再次出发 / Hare and Tortoise (Again!) | 心情与朋友 | S3 | Knightley · 英式英语 |
| 0002 | 听听动物的声音 / Look at the animals | 动物与自然 | S1 | Rowan · 美式英语 |
| 0105 | 手机女士 / Ms Phone | 日常生活 | S2 | Charlotte · 英式英语 |
| 0106 | 娜穆库鲁的自行车 / Namukuru's bicycle | 日常生活 | S2 | Knightley · 英式英语 |
| 0109 | 莱基雄和奶牛们 / Lekishon and the cows | 动物与自然 | S2 | Rowan · 美式英语 |
| 0003 | 上学的衣服 / School clothes | 日常生活 | S1 | Charlotte · 英式英语 |
| 0113 | 家里的新小猫 / New pussy cat | 动物与自然 | S1 | Knightley · 英式英语 |
| 0117 | 鬣狗和野兔的友谊 / Friendship between Hyena and Hare | 心情与朋友 | S2 | Rowan · 美式英语 |
| 0121 | 早餐粥 / Porridge | 日常生活 | S2 | Charlotte · 英式英语 |
| 0126 | 我喜欢云 / Clouds | 动物与自然 | S1 | Knightley · 英式英语 |
| 0127 | 不同的玩法 / Different Plays | 日常生活 | S1 | Rowan · 美式英语 |
| 0149 | 月亮和帽子 / The Moon and the Cap | 心情与朋友 | S2 | Charlotte · 英式英语 |
| 0152 | 宝宝怎么啦？ / What is wrong child? | 日常生活 | S2 | Knightley · 英式英语 |
| 0155 | 丛林学校 / The Jungle School | 动物与自然 | S3 | Rowan · 美式英语 |
| 0160 | 残障不等于不能 / Disability is Not Inability | 心情与朋友 | S2 | Charlotte · 英式英语 |
| 0167 | 第七个太阳 / The seventh sun: A tribal tale from Odisha, India | 颜色与发现 | S3 | Knightley · 英式英语 |
| 0168 | 帕姆帕姆鸟 / Pam-Pam bird | 动物与自然 | S3 | Rowan · 美式英语 |
| 0185 | 夜晚来到奥皮奥的村庄 / How night came to Opio's village | 颜色与发现 | S3 | Charlotte · 英式英语 |
| 0195 | 辛迪韦与萤火虫 / Sindiwe and the Fireflies | 心情与朋友 | S3 | Knightley · 英式英语 |
| 0197 | 小狗和鳄鱼 / Dog and Crocodile | 动物与自然 | S3 | Rowan · 美式英语 |
| 0198 | 我们是一个球队 / Soccer game Chiefs and Aces | 心情与朋友 | S2 | Charlotte · 英式英语 |
| 0030 | 我的心情 / Feelings | 心情与朋友 | S1 | Knightley · 英式英语 |
| 0243 | 在奶奶家的假期 / Holidays with grandmother | 日常生活 | S3 | Rowan · 美式英语 |
| 0256 | 我的第一双鞋 / My first pair of shoes | 日常生活 | S3 | Charlotte · 英式英语 |
| 0257 | 彩虹的颜色 / Colours of a rainbow | 颜色与发现 | S1 | Knightley · 英式英语 |
| 0267 | 舞者的故事：菲莉丝·斯皮拉 / A Dancer's Tale: The Story of Phyllis Spira | 心情与朋友 | S3 | Rowan · 美式英语 |
| 0291 | 姐姐会怎么说？ / What Vusi's sister said | 心情与朋友 | S3 | Charlotte · 英式英语 |
| 0294 | 奶奶的香蕉 / Grandma's bananas | 日常生活 | S3 | Knightley · 英式英语 |
| 0302 | 认识火 / Fire | 颜色与发现 | S1 | Rowan · 美式英语 |
| 0355 | 告诉我：颜色 / Tell me...now! Colours | 颜色与发现 | S2 | Charlotte · 英式英语 |
| 0361 | 人和狮子 / The Man and the Lion | 动物与自然 | S3 | Knightley · 英式英语 |
| 0124 | 一条鱼和一份礼物 / A Fish and a Gift | 动物与自然 | S3 | Rowan · 美式英语 |
| 0237 | 姆基泽先生的四分之一面包 / Mr Mkhize's quarters | 颜色与发现 | S3 | Charlotte · 英式英语 |
| 0019 | 第一次去市场 / My first day at the market | 日常生活 | S3 | Knightley · 英式英语 |
| 0103 | 唱出真相：米丽娅姆·马凯巴 / Singing the Truth: The Story of Miriam Makeba | 心情与朋友 | S3 | Rowan · 美式英语 |
| 0169 | 阿南西带来故事 / Anansi gives people stories | 颜色与发现 | S3 | Charlotte · 英式英语 |
