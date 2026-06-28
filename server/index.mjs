// 报吧 · server —— 自部署开源模型(OpenAI 兼容)+ feed.json 知识库检索注入 + mock 兜底。
// 运行:node server/index.mjs   (无需任何外部 key)
// 知识库:web/src/data/feed.json(由 feed.ts 经 `node scripts/feedToJson.mjs` 生成,干净·可引用)
// env: PORT(默认8787) LLM_BASE_URL(默认 Ollama) LLM_MODEL(默认 qwen2.5:14b)
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FEED, retrieve } from './retrieve.mjs'

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

const citeOf = (it) => `${it.title}— ${it.author} · ${it.date}`

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

// 组装发给模型的请求体(system 注入语料 + 历史)
function buildPayload(system, messages, context, stream) {
  return {
    model: LLM_MODEL,
    messages: [{ role: 'system', content: `${system}\n\n【可引用的985吧真实语料】\n${context}` }, ...messages],
    temperature: 0.85,
    max_tokens: 1500, // 三层结构化长回答,800 易截断
    stream,
  }
}

async function callLLM(system, messages, context) {
  const r = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify(buildPayload(system, messages, context, false)),
    signal: AbortSignal.timeout(240000), // 推理模型(如 gpt-5.x-high)较慢,给足时间
  })
  if (!r.ok) throw new Error('LLM ' + r.status)
  const j = await r.json()
  const reply = j.choices?.[0]?.message?.content
  if (!reply) throw new Error('LLM empty')
  return reply
}

// 流式:逐段产出模型输出(解析上游 OpenAI 兼容的 SSE data: 行)
async function* callLLMStream(system, messages, context) {
  const r = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify(buildPayload(system, messages, context, true)),
    signal: AbortSignal.timeout(240000),
  })
  if (!r.ok) throw new Error('LLM ' + r.status)
  if (!r.body) throw new Error('LLM no body')
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {}
    }
  }
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
  if (mode === 'xf') {
    lines = [
      '（本回答为已故张雪峰老师方法论的风格复刻,非本人发言)', '',
      flag,
      `「${q}」这事我跟你说实在的:普通家庭报志愿第一位是饭碗,不是面子。`,
      '顺序记牢——先把专业选对、城市第二、学校牌子第三,别反(就业倒推、城市优先)。',
      q1 && `贴吧里都在讲:"${q1}…",话糙理不糙。`,
      `别人嘴里的好专业,不一定适合你家。${tail}`,
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

// 检索 + 组 prompt 的公共准备(JSON 与流式两个端点共用)
function prep(mode, messages) {
  const userMsgs = messages.filter((m) => m.role === 'user').map((m) => m.content || '')
  const userMsg = userMsgs[userMsgs.length - 1] || ''
  // 多轮:用最近 3 条用户消息一起检索,follow-up(如"那南大呢?")不丢主题
  const retrievalQuery = userMsgs.slice(-3).map((s) => s.slice(0, 200)).join(' ')
  const items = retrieve(retrievalQuery, 5)
  // 检索到就把真金句注入;检索为空则不强加约束,让模型按自身理解正常作答
  const context = items
    .map((it) => `「${it.title}」(${it.author}·${it.date}·热度${it.heat}) 金句:${it.quote} ｜ 锐评:${it.take}`)
    .join('\n---\n')
  return { userMsg, items, context, system: buildSystem(mode) }
}

// 读取请求体并 JSON 解析(带 1MB 上限)
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method === 'GET' && req.url === '/api/health')
    return send(res, 200, { ok: true, entries: FEED.length, model: LLM_MODEL, base: LLM_BASE_URL, keyed: LLM_API_KEY !== 'local' })
  // 非流式(JSON):保留给 tests/runCases 等批量回归
  if (req.method === 'POST' && req.url === '/api/chat') {
    readBody(req).then(async ({ mode = '985', messages = [] }) => {
      const { userMsg, items, context, system } = prep(mode, messages)
      let reply, engine, debug
      try { reply = await callLLM(system, messages, context); engine = 'llm' }
      catch (e) { reply = mockReply(mode, userMsg, items); engine = 'mock'; debug = String((e && e.message) || e) }
      send(res, 200, { reply, engine, used: items.map(citeOf), debug })
    }).catch((e) => send(res, 400, { error: String(e) }))
    return
  }

  // 流式(SSE):前端边收边显示。事件序列 meta(来源) → delta*(增量) → done(引擎)
  if (req.method === 'POST' && req.url === '/api/chat/stream') {
    readBody(req).then(async ({ mode = '985', messages = [] }) => {
      const { userMsg, items, context, system } = prep(mode, messages)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁代理缓冲
        'Access-Control-Allow-Origin': '*',
      })
      const sse = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      sse('meta', { used: items.map(citeOf) }) // 来源先发,也用作首次 flush
      let streamed = false
      try {
        for await (const delta of callLLMStream(system, messages, context)) {
          streamed = true
          sse('delta', { t: delta })
        }
        sse('done', { engine: 'llm' })
      } catch (e) {
        if (!streamed) { // 还没吐字就失败 → mock 兜底,整段发出
          sse('delta', { t: mockReply(mode, userMsg, items) })
          sse('done', { engine: 'mock', debug: String((e && e.message) || e) })
        } else {
          sse('done', { engine: 'llm', debug: '流中断: ' + String((e && e.message) || e) })
        }
      }
      res.end()
    }).catch((e) => send(res, 400, { error: String(e) }))
    return
  }
  send(res, 404, { error: 'not found' })
})

server.listen(PORT, () =>
  console.log(`[报吧 server] :${PORT} | model ${LLM_MODEL} @ ${LLM_BASE_URL} | ${FEED.length} 条 feed 知识库`),
)
