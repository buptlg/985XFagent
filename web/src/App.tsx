import { useMemo, useState, type ReactNode } from 'react'
import { FEED } from './data/feed'
import { HEIHUA } from './data/heihua'
import { ANCHORS } from './data/anchors'
import { PITFALLS } from './data/pitfalls'
import { XUEFENG, XUEFENG_HEURISTICS, NINEBA } from './data/methodology'
import type { Theme, FeedItem } from './data/types'

type Mode = '985' | 'chat' | 'radar' | 'xf' | 'data'

const MODES: { id: Mode; label: string; sub: string }[] = [
  { id: '985', label: '985吧·实时锐评', sub: '当下 / 犀利 / 抓眼球' },
  { id: 'chat', label: '赛博斗蛐蛐', sub: '9吧老哥对线' },
  { id: 'radar', label: '避坑雷达', sub: '院校/专业排雷' },
  { id: 'xf', label: '张雪峰·方法论', sub: '框架决策' },
  { id: 'data', label: '硬数据', sub: '锚点案例' },
]

const THEMES: (Theme | '全部')[] = [
  '全部', '专业鄙视链', '院校battle', '排行榜', '就业出口', '升学保研', '出国留学', '科研读博', '杂七杂八榜', '分数线跳水', '招生套路', '后悔实录',
]

const THEME_STYLE: Record<Theme, string> = {
  '专业鄙视链': 'bg-rose-100 text-rose-700',
  '院校battle': 'bg-blue-100 text-blue-700',
  '排行榜': 'bg-indigo-100 text-indigo-700',
  '就业出口': 'bg-green-100 text-green-700',
  '升学保研': 'bg-cyan-100 text-cyan-700',
  '出国留学': 'bg-sky-100 text-sky-700',
  '科研读博': 'bg-violet-100 text-violet-700',
  '杂七杂八榜': 'bg-fuchsia-100 text-fuchsia-700',
  '分数线跳水': 'bg-teal-100 text-teal-700',
  '招生套路': 'bg-amber-100 text-amber-700',
  '后悔实录': 'bg-stone-200 text-stone-600',
}

function heatLabel(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

export default function App() {
  const [mode, setMode] = useState<Mode>('985')
  const [theme, setTheme] = useState<Theme | '全部'>('全部')
  const [drawer, setDrawer] = useState<string | null>(null) // 黑话解码:打开时为查询词或''
  const [persona, setPersona] = useState<'致敬' | '扮演'>('致敬')
  const [spotlight, setSpotlight] = useState<FeedItem | null>(null)

  const feed = useMemo(() => {
    const list = theme === '全部' ? FEED : FEED.filter((f) => f.theme === theme)
    return [...list].sort((a, b) => b.heat - a.heat)
  }, [theme])

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-paper/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="flex items-center gap-3 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-zhu font-black text-white shadow-sm">报</div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight">报吧 · 犀利志愿</div>
              <div className="text-xs text-stone-500">985吧实时锐评 × 张雪峰方法论</div>
            </div>
            <button
              onClick={() => setDrawer('')}
              className="ml-auto rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-zhu hover:text-zhu"
            >
              黑话解码 ⌗
            </button>
          </div>
          {/* Mode tabs */}
          <nav className="flex gap-1 overflow-x-auto pb-2">
            {MODES.map((m) => {
              const on = mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={
                    'group flex shrink-0 items-baseline gap-2 rounded-t-lg px-3.5 py-2 text-sm transition ' +
                    (on ? 'bg-ink text-white' : 'text-stone-600 hover:bg-stone-100')
                  }
                >
                  <span className="font-bold">{m.label}</span>
                  <span className={'hidden text-[11px] sm:inline ' + (on ? 'text-stone-300' : 'text-stone-400')}>{m.sub}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
        {mode === '985' && (
          <>
            <Hero />
            <AdmissionGuide />
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => setSpotlight(FEED[Math.floor(Math.random() * FEED.length)])}
                className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-zhu"
              >
                🎲 随机斗一只蛐蛐
              </button>
              {spotlight && (
                <button onClick={() => setSpotlight(null)} className="text-xs text-stone-400 hover:text-stone-600">
                  收起
                </button>
              )}
            </div>
            {spotlight && <SpotlightCard item={spotlight} />}
            {/* theme chips */}
            <div className="mb-5 flex flex-wrap gap-2">
              {THEMES.map((t) => {
                const on = theme === t
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={
                      'rounded-full px-3 py-1.5 text-sm font-medium transition ' +
                      (on
                        ? 'bg-zhu text-white shadow-sm'
                        : 'border border-stone-300 bg-white text-stone-600 hover:border-zhu hover:text-zhu')
                    }
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            {/* feed */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feed.map((f, i) => (
                <article
                  key={f.id}
                  className="rise flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className={'rounded-md px-2 py-0.5 text-xs font-bold ' + THEME_STYLE[f.theme]}>
                      {f.theme}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      🔥 {heatLabel(f.heat)}
                    </span>
                  </div>

                  <blockquote className="border-l-[3px] border-zhu pl-3 text-[15px] font-medium leading-relaxed text-ink">
                    {f.quote}
                  </blockquote>

                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    <span className="font-bold text-zhu">锐评 · </span>
                    {f.take}
                  </p>

                  {f.image && (
                    <a
                      href={f.image}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block overflow-hidden rounded-lg border border-stone-200"
                    >
                      <img
                        src={f.image}
                        alt="9吧榜单原图"
                        loading="lazy"
                        className="max-h-72 w-full bg-white object-cover object-top"
                      />
                      <div className="bg-stone-50 px-2 py-1 text-[11px] text-stone-400">📷 9吧原图 · 点击看大图</div>
                    </a>
                  )}

                  {f.replies && f.replies.length > 0 && <Replies items={f.replies} />}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.heihua?.map((h) => (
                      <button
                        key={h}
                        onClick={() => setDrawer(h)}
                        className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500 transition hover:bg-zhu-soft hover:text-zhu"
                      >
                        #{h}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3 text-xs text-stone-400">
                    <span className="truncate">「{f.title}」</span>
                    <span className="ml-auto shrink-0">{f.author} · {f.date}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {mode === 'chat' && <ChatPanel />}
        {mode === 'radar' && <RadarPanel />}
        {mode === 'xf' && <XuefengPanel persona={persona} setPersona={setPersona} />}
        {mode === 'data' && <DataPanel />}
      </main>

      <Footer />

      {drawer !== null && <HeihuaDrawer initial={drawer} onClose={() => setDrawer(null)} />}
    </div>
  )
}

function SpotlightCard({ item }: { item: FeedItem }) {
  return (
    <div className="rise mb-5 overflow-hidden rounded-2xl border-2 border-zhu bg-zhu-soft p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-zhu px-2 py-0.5 text-xs font-bold text-white">🎲 随机蛐蛐</span>
        <span className={'rounded-md px-2 py-0.5 text-xs font-bold ' + THEME_STYLE[item.theme]}>{item.theme}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-600">🔥 {heatLabel(item.heat)}</span>
      </div>
      <blockquote className="border-l-[3px] border-zhu pl-3 text-base font-semibold leading-relaxed text-ink">
        {item.quote}
      </blockquote>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        <span className="font-bold text-zhu">锐评 · </span>
        {item.take}
      </p>
      <div className="mt-2 text-xs text-stone-400">「{item.title}」· {item.author} · {item.date}</div>
    </div>
  )
}

function Hero() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-ink to-stone-800 p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">今日锐评 · 985吧</h1>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">语料采集 2026-06-19</span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">
        来自 985吧 的当下锐评(赛博斗蛐蛐),按热度排序。社区情绪 ≠ 事实,结论请配合「硬数据」板块与各校官方最新口径。
      </p>
    </div>
  )
}

function XuefengPanel({
  persona, setPersona,
}: { persona: '致敬' | '扮演'; setPersona: (p: '致敬' | '扮演') => void }) {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
        ⚠️ 张雪峰老师已于 <b>2026-03-24</b> 因心源性猝死去世。本板块为其报志愿方法论的<b>致敬性整理</b>(提炼自 GitHub 星标最高的张雪峰 skill,9.5k⭐),非本人发言、不代表其真实观点。
      </div>
      <div className="mb-5 inline-flex rounded-lg border border-stone-300 bg-white p-1 text-sm">
        {(['致敬', '扮演'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPersona(p)}
            className={'rounded-md px-3 py-1.5 font-medium transition ' + (persona === p ? 'bg-ink text-white' : 'text-stone-600')}
          >
            {p === '致敬' ? '致敬版(第三人称)' : '扮演版(风格复刻)'}
          </button>
        ))}
      </div>

      <p className="mb-5 max-w-3xl text-[15px] leading-relaxed text-stone-700">
        {persona === '致敬'
          ? '张老师的内核:把"就业"当报志愿的反推起点,用"社会筛子"看一切选择——先专业 → 次城市 → 后院校;给建议前先问清家庭条件。'
          : '（风格复刻）我跟你说,报志愿先想明白:你要文凭还是饭碗?家里几个矿?先专业、后城市、再看牌子,顺序千万别反——错一步,普通家庭可能全盘皆输。'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="5 大心智模型" points={XUEFENG} accent="purple" />
        <Card title="8 条决策启发式" points={XUEFENG_HEURISTICS} accent="purple" />
        <Card title="9吧自有方法论(查证工具)" points={NINEBA} accent="zhu" />
      </div>

      <p className="mt-4 text-xs text-stone-400">
        方法论提炼自 GitHub 星标最高的张雪峰 skill:
        <a href="https://github.com/alchaincyf/zhangxuefeng-skill" target="_blank" rel="noreferrer" className="text-zhu hover:underline">
          alchaincyf/zhangxuefeng-skill
        </a>
        (9.5k⭐)· 致敬整理,非本人观点。
      </p>
    </div>
  )
}

function Card({
  title, points, accent,
}: { title: string; points: { group: string; point: string }[]; accent: 'purple' | 'zhu' }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-extrabold">{title}</h3>
      <ul className="space-y-3">
        {points.map((p) => (
          <li key={p.group} className="text-sm leading-relaxed">
            <span className={'mr-2 rounded px-1.5 py-0.5 text-xs font-bold ' + (accent === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-zhu-soft text-zhu')}>
              {p.group}
            </span>
            <span className="text-stone-700">{p.point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DataPanel() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-black">硬数据锚点</h2>
      <p className="mb-5 text-sm text-stone-500">关键结论挂数字与出处。一切分数/政策<b>以各校官方最新为准</b>。</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ANCHORS.map((a) => (
          <div key={a.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-zhu-soft px-2 py-0.5 text-xs font-bold text-zhu">{a.topic}</span>
              <span className="ml-auto text-xs text-stone-400">{a.year}</span>
            </div>
            <p className="font-bold text-ink">{a.claim}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{a.data}</p>
            <p className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-400">来源:{a.source}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeihuaDrawer({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [q, setQ] = useState(initial)
  const list = useMemo(() => {
    const s = q.trim()
    if (!s) return HEIHUA
    return HEIHUA.filter((h) => h.term.includes(s) || h.def.includes(s))
  }, [q])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
        <div className="flex items-center gap-2 border-b border-stone-200 px-5 py-4">
          <h3 className="text-lg font-extrabold">黑话解码 ⌗</h3>
          <button onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-200">✕</button>
        </div>
        <div className="px-5 py-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜黑话,如 超短裙 / 天坑 / 尖班"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-zhu"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {list.length === 0 && <p className="py-8 text-center text-sm text-stone-400">没收录这个词,等下一轮采集~</p>}
          <ul className="space-y-2.5">
            {list.map((h) => (
              <li
                key={h.term}
                className={
                  'rounded-xl border bg-white p-3.5 ' +
                  (h.term === initial ? 'border-zhu ring-1 ring-zhu/30' : 'border-stone-200')
                }
              >
                <div className="font-bold text-zhu">{h.term}</div>
                <div className="mt-1 text-sm leading-relaxed text-stone-700">{h.def}</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

const CHAT_PERSONAS: { key: string; label: string }[] = [
  { key: '985', label: '985吧·斗蛐蛐' },
  { key: 'xf', label: '张雪峰·方法论' },
]

type Msg = { role: 'user' | 'assistant'; content: string }

// 反常识 / 抓眼球的示例问题(均出自扒来的 9吧 料)
const SUGGESTIONS = [
  '央企总部最爱的其实是中财/政法/北外,不是工科?',
  '一个211西电,凭啥大厂校招排第9、吊打一半985?',
  '"全校保研率40%",为啥到我手里可能不到10%?',
  '"计算机寒冬"喊了十年,为啥越喊分越高?',
  '哈工大尖班分数超复旦计算机,这到底值不值?',
  '临床2024集体跳水,现在报是抄底还是接盘?',
  '天大今年突然全投"带电工科",是真转型还是营销?',
]

function ChatPanel() {
  const [persona, setPersona] = useState('985')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [engine, setEngine] = useState<string | null>(null)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: persona, messages: next }),
      })
      const j = await r.json()
      setEngine(j.engine ?? null)
      setMsgs([...next, { role: 'assistant', content: j.reply || '(空回复)' }])
    } catch {
      setMsgs([...next, { role: 'assistant', content: '⚠️ 连不上 server。先在项目根目录运行:node server/index.mjs' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {CHAT_PERSONAS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPersona(p.key)}
            className={
              'rounded-full px-3 py-1.5 text-sm font-medium transition ' +
              (persona === p.key
                ? 'bg-ink text-white'
                : 'border border-stone-300 bg-white text-stone-600 hover:border-zhu hover:text-zhu')
            }
          >
            {p.label}
          </button>
        ))}
        {engine && (
          <span
            className={
              'ml-auto rounded-full px-2 py-0.5 text-xs font-medium ' +
              (engine === 'llm' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
            }
          >
            {engine === 'llm' ? '● 真模型' : '● mock 兜底'}
          </span>
        )}
      </div>

      <div className="min-h-[48vh] space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        {msgs.length === 0 && (
          <div className="py-10">
            <div className="mb-3 text-center text-sm text-stone-400">问点犀利的 · 点一条直接填进输入框 👇</div>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-left text-xs text-stone-600 transition hover:border-zhu hover:text-zhu"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ' +
                (m.role === 'user' ? 'bg-zhu text-white' : 'bg-stone-100 text-ink')
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-stone-400">
            斗蛐蛐生成中…<span className="text-stone-300">(推理模型思考中,慢的话约 1 分钟,别关)</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder="说说你的分数 / 省份 / 意向专业…"
          className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-zhu"
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-zhu px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          发
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        引擎:自部署开源模型(Ollama/vLLM,OpenAI 兼容);未起模型时 mock 兜底。回答含社区情绪,仅供参考,分数政策以官方最新为准。
      </p>
    </div>
  )
}

// 可折叠板块:标题带 ▶ 箭头,点击展开/收起
function Collapse({
  title,
  sub,
  defaultOpen = true,
  children,
}: {
  title: string
  sub?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="mb-6">
      <button onClick={() => setOpen(!open)} className="mb-3 flex w-full items-center gap-2 text-left">
        <span className={'text-xs text-stone-400 transition-transform ' + (open ? 'rotate-90' : '')}>▶</span>
        <h2 className="text-lg font-black">{title}</h2>
        {sub && <span className="hidden text-xs text-stone-400 sm:inline">{sub}</span>}
      </button>
      {open && children}
    </section>
  )
}

// 楼中对线:默认收起,点箭头展开
function Replies({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 rounded-lg bg-stone-50 p-2.5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1 text-xs font-bold text-stone-500">
        <span className={'transition-transform ' + (open ? 'rotate-90' : '')}>▶</span>
        🦗 楼中对线 ({items.length})
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {items.map((r, j) => (
            <li key={j} className="text-xs leading-relaxed text-stone-600">{r}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ADMISSION_STYLES: { key: string; gloss: string; tone: string; schools: string; desc: string; tip: string }[] = [
  { key: '超短裙', gloss: '只露热门', tone: 'rose', schools: '清北上交浙复 · 今年 +天大/东南/南开', desc: '只投热门专业(计算机/电子)拉高投档线,天坑藏进提前批/综评/中外。2026 天大(全带电工科)、东南(物化分组)、南开等传统985也集体入伙。', tip: '算"热门专业招生数 ÷ 总招生数",别被投档线骗。' },
  { key: '姜-泰勒', gloss: '畸变拔高', tone: 'amber', schools: '哈工大 · 西交', desc: '靠尖班/院士班 + 超短裙把分数"畸变"顶上去,塔尖几十人撑起最高分。', tip: '尖班待遇 ≠ 全校待遇;看普通批真实门槛。' },
  { key: '共轭', gloss: '稳态扁平', tone: 'blue', schools: '中科大 · 南大', desc: '相对老实,招生规模较稳、分数扁平;但近年中科大也开始缩招。', tip: '分数扁平 ≠ 好进,转专业/保研政策更关键。' },
]

const STYLE_TONE: Record<string, string> = {
  rose: 'from-rose-500 to-rose-600',
  amber: 'from-amber-500 to-amber-600',
  blue: 'from-blue-500 to-blue-600',
}

const ADMISSION_MOVES_2026: { school: string; tag: string; text: string }[] = [
  { school: '天大', tag: '激进转型', text: '从"老实工科"猛出手:河北/山东2026全投带电工科、天津前1000直录未来技术学院、未院广东低分可进且号称~100%保研;吧里吐槽"山西招生群疯了""今年天大营销/水军多""别半场开香槟"。' },
  { school: '东南', tag: '分组拔高', text: '江苏物+化分三个组、吴健雄班(登峰)1人顶最高分;低分组当心被西交"击穿"。"建议改名中国理工大学"的梗也是今年的。' },
  { school: '南大', tag: '扩招+尖班', text: '本科扩招300、未来技术学院启动本科招生(苏州校区)、至诚班扩容到6专业、匡亚明新设励行班。' },
  { school: '哈工大', tag: '再升级', text: '推"应用场景集群培养"(8大战略场景,入学进集群、大三才选专业),尖班玩法又翻新。' },
  { school: '大工', tag: '100%保研班', text: '大批"100%保研"班型(8省只招100%保研班),快赶上哈工大。' },
  { school: '浙大', tag: '取消大类', text: '2026取消大类、按学院招生(学院内专业任选)+大批拔尖班;外省继续小规模,普通班保研率追平复旦。' },
  { school: '人大', tag: '被催优化', text: '吧友呼吁/预测人大跟进:经管不在物理类招或限物化、类内任选,否则物理类位次继续下滑(今年仍卡第7-8)。' },
  { school: '厦大', tag: '该出手了', text: '"天大出手了,厦大会不会出手?"——厦大有南墙书院等试验班,但被吐槽"亡羊补牢太晚"。' },
  { school: '中山/川大', tag: '新试验班', text: '中山逸仙班今年首办(分数线未知);川大等也在加试验班跟进抢分。' },
]

function AdmissionGuide() {
  return (
    <>
      <Collapse title="招生风格图鉴" sub={'985吧梗 · 一眼看懂各校"分数是怎么做出来的"'}>
        <div className="grid gap-3 sm:grid-cols-3">
          {ADMISSION_STYLES.map((s) => (
            <div key={s.key} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className={'bg-gradient-to-br px-4 py-3 text-white ' + STYLE_TONE[s.tone]}>
                <div className="text-base font-black">
                  {s.key}
                  <span className="ml-2 text-xs font-normal opacity-80">{s.gloss}</span>
                </div>
                <div className="mt-0.5 text-xs opacity-90">{s.schools}</div>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed text-stone-600">{s.desc}</p>
                <p className="mt-2 rounded-lg bg-zhu-soft px-2.5 py-1.5 text-xs text-zhu">避坑:{s.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </Collapse>

      <Collapse title="📈 2026 今年新动向" sub="9吧实说 · 采集 2026-06">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <ul className="space-y-2.5">
            {ADMISSION_MOVES_2026.map((m) => (
              <li key={m.school} className="text-sm leading-relaxed">
                <span className="mr-2 inline-block rounded bg-zhu-soft px-1.5 py-0.5 text-xs font-bold text-zhu">
                  {m.school}·{m.tag}
                </span>
                <span className="text-stone-700">{m.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-xs leading-relaxed text-stone-600">
            <b>趋势</b>:超短裙 / 尖班 / 未院 / 100%保研班 从哈工大独创 → 传统985(天大·南开·中山…)集体跟进;"全员带电工科"俱乐部已扩到 浙大·天大·大工·北理·成电·哈工·南航·南理·北交·哈工程·南开。
          </p>
        </div>
      </Collapse>
    </>
  )
}

const PIT_TONE: Record<string, string> = {
  '超短裙藏分': 'bg-rose-100 text-rose-700',
  '综评藏天坑': 'bg-amber-100 text-amber-700',
  '护校水军': 'bg-purple-100 text-purple-700',
  '大类内卷': 'bg-teal-100 text-teal-700',
  '热度反噬': 'bg-orange-100 text-orange-700',
  '就业错配': 'bg-stone-200 text-stone-600',
}

function RadarPanel() {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim()
    if (!s) return PITFALLS
    return PITFALLS.filter(
      (p) => p.match.some((m) => s.includes(m) || m.includes(s)) || p.title.includes(s) || p.detail.includes(s),
    )
  }, [q])

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 text-xl font-black">避坑雷达</h2>
      <p className="mb-4 text-sm text-stone-500">输入院校或专业,扫出 985吧 总结的坑;不输入则看全部通用坑。</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="如:哈工大 / 临床 / 金融 / 同济 / 综评"
        className="mb-4 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-zhu"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => (
          <div key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className={'rounded-md px-2 py-0.5 text-xs font-bold ' + (PIT_TONE[p.type] || 'bg-stone-200 text-stone-600')}>
                {p.type}
              </span>
              <span className="ml-auto truncate text-xs text-stone-400">{p.match.slice(0, 3).join(' / ')}</span>
            </div>
            <p className="font-bold text-ink">{p.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{p.detail}</p>
            {p.source && <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-400">{p.source}</p>}
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400 sm:col-span-2">没扫到对应的坑,换个院校/专业词试试。</p>
        )}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-stone-400 sm:px-5">
      <p>语料采集自 985吧(2026-06),含社区情绪化表达,仅供参考;分数线/政策以各校官方最新公布为准。</p>
      <p className="mt-1">张雪峰板块为已故张雪峰老师报志愿方法论的致敬性整理,非本人发言。涉及离世/心理健康内容严肃呈现。</p>
    </footer>
  )
}
