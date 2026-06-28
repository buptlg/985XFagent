// 离线预算 985吧 语料向量 → web/src/data/feed.embeddings.json
// 运行:node scripts/embed.mjs   (= npm run embed)
// 端点优先级 EMBED_* → OPENAI_* → LLM_*;模型默认 text-embedding-3-small(可用 EMBED_MODEL 覆盖)
// ⚠️ 运行时给 query 编码必须用同一个模型,换模型请重跑本脚本。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// .env 加载(与 server 一致;已有环境变量优先)
try {
  const p = join(ROOT, '.env')
  if (existsSync(p)) for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const BASE = process.env.EMBED_BASE_URL || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || 'http://localhost:11434/v1'
const MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small'
const KEY = process.env.EMBED_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || 'local'

const FEED = JSON.parse(readFileSync(join(ROOT, 'web', 'src', 'data', 'feed.json'), 'utf8'))
const textOf = (it) => `${it.title}。${it.quote}。${it.take}。主题:${it.theme}`

async function embedBatch(texts) {
  const r = await fetch(`${BASE}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, input: texts }),
    signal: AbortSignal.timeout(60000),
  })
  if (!r.ok) throw new Error('embeddings ' + r.status + ': ' + (await r.text()).slice(0, 200))
  return (await r.json()).data.map((d) => d.embedding)
}

console.log(`[embed] BASE=${BASE} MODEL=${MODEL} | ${FEED.length} 条语料`)
const vectors = {}
const B = 32
for (let i = 0; i < FEED.length; i += B) {
  const part = FEED.slice(i, i + B)
  const vs = await embedBatch(part.map(textOf))
  vs.forEach((v, k) => { vectors[part[k].id] = v.map((x) => Math.round(x * 1e5) / 1e5) }) // 5 位小数,缩小文件
  process.stdout.write(`  embedded ${Math.min(i + B, FEED.length)}/${FEED.length}\r`)
}
const dim = vectors[FEED[0].id]?.length || 0
const out = join(ROOT, 'web', 'src', 'data', 'feed.embeddings.json')
writeFileSync(out, JSON.stringify({ model: MODEL, dim, count: FEED.length, vectors }))
console.log(`\n✅ wrote ${out}  (model=${MODEL} dim=${dim} count=${FEED.length})`)
