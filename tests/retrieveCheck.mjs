// 无 LLM 的确定性检索自检:直接 import server 的真实检索模块。
// 运行:node tests/retrieveCheck.mjs
import { retrieve, expandQuery, FEED } from '../server/retrieve.mjs'

const cases = [
  '码农现在还吃香吗',            // 别名:码农→计算机
  'AI时代学计算机性价比高吗',    // 别名:性价比→值不值 + AI→计算机
  '学医后悔吗',                  // 别名:学医→临床/医学
  '国网和烟草哪个好进',          // 别名:国网/烟草→就业/央企
  '哈工大尖班值不值',            // 别名:尖班→院士班 + 性价比
  '西电凭啥大厂校招那么猛',      // 别名:西电/大厂→就业
  '考古学甲骨文专业怎么样',      // 预期:命中很少或为空(语料没有)→ 模型自然作答
]

console.log(`FEED 知识库:${FEED.length} 条\n` + '='.repeat(60))
for (const q of cases) {
  const exp = expandQuery(q)
  const items = retrieve(q, 5)
  console.log(`\nQ: ${q}`)
  if (exp !== q) console.log(`  ↳ 扩展后: ${exp}`)
  if (items.length) items.forEach((it, i) => console.log(`  ${i + 1}. [${it.theme}] ${it.title}`))
  else console.log('  (无命中 → 空检索,交给模型按自身理解作答)')
}

// 多轮:follow-up 丢主题 vs 拼接最近多轮
console.log('\n' + '='.repeat(60))
console.log('多轮测试:第二句只说"那南大计算机呢?"')
const single = retrieve('那南大计算机呢', 5)
const multi = retrieve('哈工大尖班和华五计算机怎么选 那南大计算机呢', 5)
console.log(`  仅末句命中 ${single.length} 条;拼接最近多轮命中 ${multi.length} 条(server 实际用拼接)`)
