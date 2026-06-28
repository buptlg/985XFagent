export type Theme =
  | '专业鄙视链'
  | '院校battle'
  | '排行榜'
  | '就业出口'
  | '升学保研'
  | '出国留学'
  | '科研读博'
  | '杂七杂八榜'
  | '分数线跳水'
  | '招生套路'
  | '后悔实录'

export interface FeedItem {
  id: string
  theme: Theme
  title: string
  author: string
  date: string      // 发帖时间
  heat: number      // 热度(互动近似)
  quote: string     // 原帖金句
  take: string      // 我们的锐评提炼
  heihua?: string[] // 涉及黑话(可点解码)
  replies?: string[] // 楼中锐评(赛博斗蛐蛐)
  image?: string     // 可选:本地化的榜单图(/xxx.png)
}

export interface Heihua {
  term: string
  def: string
}

export interface Anchor {
  id: string
  topic: string
  claim: string     // 结论
  data: string      // 硬数据
  source: string    // 出处
  year: string
}

export interface MethodPoint {
  group: string
  point: string
}
