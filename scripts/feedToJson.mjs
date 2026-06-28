// 把 web/src/data/feed.ts 的 FEED 数组导出为 feed.json(server 与 web 共用的干净知识库)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let t = readFileSync(join(ROOT, 'web/src/data/feed.ts'), 'utf8')
t = t.replace(/^import[^\n]*$/gm, '').replace(/export const FEED\s*:\s*FeedItem\[\]\s*=/, 'return')
// eslint-disable-next-line no-new-func
const FEED = new Function(t)()
writeFileSync(join(ROOT, 'web/src/data/feed.json'), JSON.stringify(FEED, null, 2) + '\n', 'utf8')
console.log('wrote feed.json:', FEED.length, 'items')
