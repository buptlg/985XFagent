// 考生 case 测试:把若干考生画像过 /api/chat,落到 tests/cases.md。
// 用法:确保 server 在跑(node server/index.mjs),然后 `node tests/runCases.mjs`
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'http://localhost:8787'

const cases = [
  { persona: '河南理科650,纠结哈工大尖班 vs 南大计算机', q: '我河南理科650,冲哈工大尖班还是稳南大计算机?', modes: ['985', 'fusion'] },
  { persona: '山东580,想学计算机', q: '山东580分,这个分能上什么档次的计算机?AI时代计算机还值得学吗?', modes: ['985', 'xf-tribute'] },
  { persona: '620纠结要不要学临床', q: '2024年了,620分还要不要报临床医学?家里想让我学医', modes: ['985', 'xf-roleplay'] },
  { persona: '同济大类值不值', q: '冲同济的大类招生值不值?听说大一分流很卷', modes: ['985', 'fusion'] },
  { persona: '文科生金融还是法学', q: '文科生,金融和法学怎么选?', modes: ['xf-tribute', '985'] },
]

const out = ['# 考生 case 测试记录', '', '> 生成自 `node tests/runCases.mjs`。engine=mock 表示未接开源模型(语气/检索仍可看);接 Ollama 后为真对话。', '']

for (const c of cases) {
  out.push(`## ${c.persona}`, '', `**问**:${c.q}`, '')
  for (const mode of c.modes) {
    let j
    try {
      const r = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: [{ role: 'user', content: c.q }] }),
      })
      j = await r.json()
    } catch (e) {
      j = { engine: 'ERR', reply: String(e), used: [] }
    }
    out.push(`### [${mode}] · engine=${j.engine}`, '', '```', j.reply || '(空)', '```', `引用:${(j.used || []).join(' / ') || '无'}`, '')
  }
}

writeFileSync(join(HERE, 'cases.md'), out.join('\n'), 'utf8')
console.log(`wrote tests/cases.md · ${cases.length} cases`)
