export interface VisualWord { id: string; word: string; cn: string; phonetic: string; example: string; image: string; audio: string }
import visualAssets from "./visualAssets.json"
const data = [
  [
    "jackfruit",
    "菠萝蜜",
    "/ˈdʒæk.fruːt/",
    "Have you ever tried jackfruit?"
  ],
  [
    "dragon-fruit",
    "火龙果",
    "/ˈdræɡ.ən fruːt/",
    "This dragon fruit has white flesh."
  ],
  [
    "lychee",
    "荔枝",
    "/ˈliː.tʃiː/",
    "Peel the lychee before you eat it."
  ],
  [
    "mangosteen",
    "山竹",
    "/ˈmæŋ.ɡə.stiːn/",
    "The mangosteen has a thick purple rind."
  ],
  [
    "rambutan",
    "红毛丹",
    "/ræmˈbuː.tən/",
    "Rambutan looks hairy on the outside."
  ],
  [
    "passion-fruit",
    "百香果",
    "/ˈpæʃ.ən fruːt/",
    "Add some passion fruit to your yogurt."
  ],
  [
    "papaya",
    "木瓜",
    "/pəˈpaɪ.ə/",
    "Wait until the papaya is ripe."
  ],
  [
    "pomegranate",
    "石榴",
    "/ˈpɑː.məˌɡræn.ɪt/",
    "Pomegranate seeds add a little crunch."
  ],
  [
    "guava",
    "番石榴",
    "/ˈɡwɑː.və/",
    "Would you like some guava juice?"
  ],
  [
    "avocado",
    "牛油果",
    "/ˌæv.əˈkɑː.doʊ/",
    "Slice an avocado for the salad."
  ],
  [
    "fig",
    "无花果",
    "/fɪɡ/",
    "Fresh figs are soft and sweet."
  ],
  [
    "persimmon",
    "柿子",
    "/pərˈsɪm.ən/",
    "This persimmon is still a little firm."
  ],
  [
    "kumquat",
    "金橘",
    "/ˈkʌm.kwɑːt/",
    "You can eat the peel of a kumquat."
  ],
  [
    "nectarine",
    "油桃",
    "/ˈnek.tə.riːn/",
    "A nectarine has smooth skin."
  ],
  [
    "apricot",
    "杏",
    "/ˈeɪ.prɪ.kɑːt/",
    "I bought a bag of dried apricots."
  ],
  [
    "grapefruit",
    "葡萄柚",
    "/ˈɡreɪp.fruːt/",
    "This grapefruit tastes a little bitter."
  ],
  [
    "quince",
    "榅桲",
    "/kwɪns/",
    "Quince is often cooked into jelly."
  ],
  [
    "cantaloupe",
    "甜瓜",
    "/ˈkæn.tə.loʊp/",
    "Cut the cantaloupe into small pieces."
  ],
  [
    "tamarillo",
    "树番茄",
    "/ˌtæm.əˈrɪl.oʊ/",
    "Scoop out the flesh of the tamarillo."
  ],
  [
    "salak",
    "蛇皮果",
    "/ˈsɑː.læk/",
    "Salak has a scaly brown skin."
  ],
  [
    "kiwi",
    "猕猴桃",
    "/ˈkiː.wiː/",
    "A kiwi is green inside."
  ],
  [
    "pineapple",
    "菠萝",
    "/ˈpaɪnˌæp.əl/",
    "This pineapple is really juicy."
  ],
  [
    "raspberry",
    "树莓",
    "/ˈræzˌber.i/",
    "Top the pancakes with raspberries."
  ]
] as const
export const visualWords: VisualWord[] = data.map(([id, cn, phonetic, example]) => ({ id, word: id.replaceAll("-", " "), cn, phonetic, example, image: visualAssets[id].image, audio: visualAssets[id].audio }))
