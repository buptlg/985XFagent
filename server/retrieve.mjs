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

// 单条 item 的字面得分(关键词 + 2-gram,标题加权)
function lexScoreOf(it, terms, grams) {
  const title = it.title || ''
  const hay = `${it.title} ${it.quote} ${it.take} ${it.theme} ${(it.heihua || []).join(' ')}`
  let s = 0
  for (const t of terms) s += title.includes(t) ? t.length * 3 : hay.includes(t) ? t.length * 1.5 : 0
  for (const g of grams) s += title.includes(g) ? 1.2 : hay.includes(g) ? 0.6 : 0
  return s
}

// 纯字面检索(同步、无网络):tests 与"无 embedding"时的兜底
export function retrieve(query, n = 5) {
  const { terms, grams } = tokenize(expandQuery(query || ''))
  if (!terms.length && !grams.length) return []
  return FEED.map((it) => ({ it, s: lexScoreOf(it, terms, grams) + (it.heat || 0) / 200000 }))
    .filter((x) => x.s >= 1.2)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.it)
}

// ===== 语义层:离线预算的语料向量 + 运行时 query 向量,优雅降级 =====
let EMB = null
try { EMB = JSON.parse(readFileSync(join(ROOT, 'web', 'src', 'data', 'feed.embeddings.json'), 'utf8')) } catch {}
export const semanticReady = !!EMB

const E_BASE = process.env.EMBED_BASE_URL || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || 'http://localhost:11434/v1'
const E_KEY = process.env.EMBED_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || 'local'
const E_MODEL = (EMB && EMB.model) || process.env.EMBED_MODEL || 'text-embedding-3-small' // 必须与建库模型一致
const SEM_MIN = Number(process.env.EMBED_MIN) || 0.33 // 语义命中门槛(校准:相关≥0.36,跑题≤0.28)

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

async function embedQuery(text) {
  if (!EMB) return null
  const r = await fetch(`${E_BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${E_KEY}` },
    body: JSON.stringify({ model: E_MODEL, input: [text] }),
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error('embed ' + r.status)
  return (await r.json()).data?.[0]?.embedding || null
}

// 混合检索(异步):字面 + 语义融合;任一过门槛即入选,都不过→空(交模型自然作答)。
// 无 embedding 文件 / query 编码失败 → 自动退回纯字面,绝不影响 clone-即跑。
export async function retrieveHybrid(query, n = 5) {
  const q = query || ''
  const { terms, grams } = tokenize(expandQuery(q))
  let qv = null
  try { qv = await embedQuery(q) } catch {}
  const useSem = !!(qv && EMB)
  const scored = FEED.map((it) => {
    const lex = lexScoreOf(it, terms, grams) + (it.heat || 0) / 200000
    const ev = EMB && EMB.vectors[it.id]
    const sem = useSem && ev ? cosine(qv, ev) : 0
    return { it, lex, sem }
  })
  const cands = scored.filter((x) => x.lex >= 1.2 || x.sem >= SEM_MIN)
  if (!cands.length) return []
  const maxLex = Math.max(1e-9, ...cands.map((c) => c.lex))
  const maxSem = Math.max(1e-9, ...cands.map((c) => c.sem))
  for (const c of cands) c.final = useSem ? 0.55 * (c.sem / maxSem) + 0.45 * (c.lex / maxLex) : c.lex / maxLex
  return cands.sort((a, b) => b.final - a.final).slice(0, n).map((c) => c.it)
}
