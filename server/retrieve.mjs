// 报吧 · 检索模块 —— 字面检索(关键词 + 中文 2-gram)over feed.json,带别名扩展。
// 独立成模块:既被 server 用,也能被 tests/retrieveCheck.mjs 直接 import 做无 LLM 的确定性验证。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

export const FEED = JSON.parse(readFileSync(join(ROOT, 'web', 'src', 'data', 'feed.json'), 'utf8'))

// 9吧/高考语境别名表:把口语·变体·英文映射到语料里真实出现的规范词,提升召回
// (例:用户说"码农/宇宙机"也能命中"计算机"卡;"性价比"命中"值不值")
export const ALIASES = [
  { triggers: ['码农', '程序员', '敲代码', '写代码', '软工', '软件工程', '宇宙机', 'cs', 'CS', 'IT'], add: ['计算机', '软件', '互联网'] },
  { triggers: ['人工智能', '大模型', '机器学习', '深度学习', 'ai', 'AI'], add: ['人工智能', '计算机'] },
  { triggers: ['性价比', '划算', '值不值', '值得', '值不值得', '亏不亏', '血亏'], add: ['性价比', '划算'] },
  { triggers: ['天坑', '劝退', '坑不坑', '生化环材', '提桶跑路'], add: ['天坑', '后悔', '劝退'] },
  { triggers: ['学医', '医学', '临床', '医生', '医学生', '儿科', '麻醉'], add: ['临床', '医学'] },
  { triggers: ['保研', '推免', '读研', '考研', '升学率', '保研率'], add: ['保研', '升学', '推免'] },
  { triggers: ['大厂', '进大厂', '校招', '秋招', 'offer', '薪资', '工资', '月入'], add: ['就业', '大厂'] },
  { triggers: ['央企', '国企', '国家电网', '国网', '选调', '烟草', '体制内', '编制'], add: ['央企', '国企', '国网', '选调', '烟草', '就业'] },
  { triggers: ['留学', '出国', '申研', 'gpa', 'GPA', '藤校', 'top'], add: ['留学', '出国'] },
  { triggers: ['读博', '科研', '硕士点', '博士点', '直博', '搞科研'], add: ['科研', '读博'] },
  { triggers: ['尖班', '院士班', '拔尖班', '尖子班', '强基'], add: ['尖班', '院士班'] },
  { triggers: ['华五', '华东五校', '复交浙科南'], add: ['华五'] },
  { triggers: ['两电一邮', '西电', '电子科大', '北邮', '成电'], add: ['西电', '北邮', '两电一邮'] },
  { triggers: ['跳水', '暴跌', '断档', '大跳水', '分数跳水'], add: ['分数线跳水', '跳水', '断档'] },
  { triggers: ['超短裙', '藏分', '投档线', '压线', '大小年', '招生套路', '套路', '综评', '提前批'], add: ['超短裙', '藏分', '招生套路'] },
  { triggers: ['后悔', '别报', '千万别报', '错付'], add: ['后悔', '后悔实录'] },
]

export function expandQuery(q) {
  const extra = []
  for (const a of ALIASES) if (a.triggers.some((t) => q.includes(t))) extra.push(...a.add)
  return extra.length ? q + ' ' + extra.join(' ') : q
}

// 按 token 切分(再取 2-gram),避免跨词拼出误命中的 gram;terms/grams 去重防别名词重复加权
export function tokenize(q) {
  const toks = q.replace(/[^一-龥a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean)
  const terms = [...new Set(toks.filter((t) => t.length >= 2))]
  const grams = new Set()
  for (const tok of toks) {
    const zh = tok.match(/[一-龥]/g) || []
    for (let i = 0; i < zh.length - 1; i++) grams.add(zh[i] + zh[i + 1]) // 2-gram,避免单字误命中(山东≠山大)
  }
  return { terms, grams: [...grams] }
}

export function retrieve(query, n = 5) {
  const { terms, grams } = tokenize(expandQuery(query || ''))
  if (!terms.length && !grams.length) return []
  return FEED.map((it) => {
    const title = it.title || ''
    const hay = `${it.title} ${it.quote} ${it.take} ${it.theme} ${(it.heihua || []).join(' ')}`
    let s = 0
    for (const t of terms) s += title.includes(t) ? t.length * 3 : hay.includes(t) ? t.length * 1.5 : 0
    for (const g of grams) s += title.includes(g) ? 1.2 : hay.includes(g) ? 0.6 : 0
    s += (it.heat || 0) / 200000 // 平手时轻微偏高热
    return { it, s }
  })
    .filter((x) => x.s >= 1.2)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.it)
}
