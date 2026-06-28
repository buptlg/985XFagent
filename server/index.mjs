// 报吧 · server —— 自部署开源模型(OpenAI 兼容)+ feed.json 知识库检索注入 + mock 兜底。
// 运行:node server/index.mjs   (无需任何外部 key)
// 知识库:web/src/data/feed.json(由 feed.ts 经 `node scripts/feedToJson.mjs` 生成,干净·可引用)
// env: PORT(默认8787) LLM_BASE_URL(默认 Ollama) LLM_MODEL(默认 qwen2.5:14b)
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 极简 .env 加载(放仓库根 .env;不入 git)。已存在的环境变量优先。
try {
  const envPath = join(ROOT, '.env')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
} catch {}

const PORT = Number(process.env.PORT) || 8787
// 优先 LLM_*;否则复用系统里已设的 OPENAI_*(密钥从环境读取,绝不写入任何文件)
const LLM_BASE_URL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1'
const LLM_MODEL = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'qwen2.5:14b'
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || 'local'

const modesCfg = JSON.parse(readFileSync(join(ROOT, 'data', 'modes.json'), 'utf8'))
const FEED = JSON.parse(readFileSync(join(ROOT, 'web', 'src', 'data', 'feed.json'), 'utf8'))

const citeOf = (it) => `${it.title}— ${it.author} · ${it.date}`

function retrieve(query, n = 5) {
  const q = query || ''
  const terms = q.replace(/[^一-龥a-zA-Z0-9]+/g, ' ').split(' ').filter((t) => t.length >= 2)
  const zh = q.match(/[一-龥]/g) || []
  const grams = []
  for (let i = 0; i < zh.length - 1; i++) grams.push(zh[i] + zh[i + 1]) // 2-gram,避免单字误命中(山东≠山大)
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

function buildSystem(modeKey) {
  const m = modesCfg.modes[modeKey] || modesCfg.modes['985']
  return [
    modesCfg.guardrails,
    `【人设】${m.persona}`,
    m.style ? `【说话风格】${m.style}` : '',
    m.extra_guardrail ? `【额外约束】${m.extra_guardrail}` : '',
    modesCfg.context_injection,
  ].filter(Boolean).join('\n\n')
}

async function callLLM(system, messages, context) {
  const r = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'system', content: `${system}\n\n【可引用的985吧真实语料】\n${context}` }, ...messages],
      temperature: 0.85,
      max_tokens: 800,
      stream: false,
    }),
    signal: AbortSignal.timeout(240000), // 推理模型(如 gpt-5.x-high)较慢,给足时间
  })
  if (!r.ok) throw new Error('LLM ' + r.status)
  const j = await r.json()
  const reply = j.choices?.[0]?.message?.content
  if (!reply) throw new Error('LLM empty')
  return reply
}

// mock 按人设区分语气 + 控长度,均引用检索到的真金句(来自 feed.json)
function mockReply(mode, userMsg, items) {
  const q = (userMsg || '').slice(0, 40)
  const q1 = items[0]?.quote ? items[0].quote.slice(0, 70) : ''
  const q2 = items[1]?.quote ? items[1].quote.slice(0, 70) : ''
  const tail = '(分数/政策以各校官方最新为准)'
  const flag = '〔mock·未接模型,起 Ollama 后即真·对话〕'
  const refs = items.length ? `\n\n📌 相关热帖:${items.slice(0, 3).map(citeOf).join(' / ')}` : ''

  let lines
  if (mode === 'xf-tribute') {
    lines = [
      flag, '',
      '张老师的思路:先专业 → 次城市 → 后院校层次。',
      `就「${q}」,先别纠结学校牌子,问三件事——这专业的就业出口在哪?城市有没有对口产业?将来保研/考研顺不顺?`,
      q1 && `参照985吧:"${q1}…"`,
      `理工看专业、医学看地域、文科才更看学校。${tail}`,
    ]
  } else if (mode === 'xf-roleplay') {
    lines = [
      '（本回答为已故张雪峰老师方法论的风格复刻,非本人发言)', '',
      flag,
      `「${q}」这事我跟你说实在的:普通家庭的孩子,报志愿第一位是饭碗,不是面子。`,
      '先把专业选对,城市第二,学校牌子第三,顺序别反。',
      q1 && `贴吧里都在讲:"${q1}…",话糙理不糙。`,
      `别人嘴里的好专业,不一定适合你家。${tail}`,
    ]
  } else if (mode === 'fusion') {
    lines = [
      flag, '',
      `① 框架:先专业 → 次城市 → 后院校。就「${q}」先定方向。`,
      `② 当下炮火:${q1 ? `"${q1}…"` : '专业冷热正在剧烈轮动'}${q2 ? `;另有"${q2}…"` : ''}。`,
      `③ 落子:同分优先可迁移性强、出口宽的专业;名校大类先问清分流淘汰率。${tail}`,
    ]
  } else {
    lines = [
      flag, '',
      `「${q}」?行,说点扎心的。`,
      q1 ? `985吧老哥原话:"${q1}…"` : '先看清楚再冲。',
      q2 && `还有一条:"${q2}…"`,
      `别被投档线骗——超短裙藏分、大类分流淘汰、专业冷热反噬,坑都在这。先搞清楚再填。${tail}`,
    ]
  }
  return lines.filter(Boolean).join('\n') + refs
}

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
  })
  res.end(JSON.stringify(obj))
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/api/health')
    return send(res, 200, { ok: true, entries: FEED.length, model: LLM_MODEL, base: LLM_BASE_URL, keyed: LLM_API_KEY !== 'local' })
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', async () => {
      try {
        const { mode = '985', messages = [] } = JSON.parse(body || '{}')
        const userMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
        const items = retrieve(userMsg, 5)
        const context = items
          .map((it) => `「${it.title}」(${it.author}·${it.date}·热度${it.heat}) 金句:${it.quote} ｜ 锐评:${it.take}`)
          .join('\n---\n')
        const system = buildSystem(mode)
        let reply, engine, debug
        try { reply = await callLLM(system, messages, context); engine = 'llm' }
        catch (e) { reply = mockReply(mode, userMsg, items); engine = 'mock'; debug = String((e && e.message) || e) }
        send(res, 200, { reply, engine, used: items.map(citeOf), debug })
      } catch (e) {
        send(res, 400, { error: String(e) })
      }
    })
    return
  }
  send(res, 404, { error: 'not found' })
})

server.listen(PORT, () =>
  console.log(`[报吧 server] :${PORT} | model ${LLM_MODEL} @ ${LLM_BASE_URL} | ${FEED.length} 条 feed 知识库`),
)
