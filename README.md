# 报吧 · 犀利志愿

**985吧实时锐评 × 张雪峰方法论** —— 更犀利、更"当下"的高考志愿 agent(纯网页端 + 轻量对话后端)。

> ⚠️ 张雪峰老师已于 2026-03-24 去世。本项目"张雪峰"板块为其报志愿方法论的**致敬性复刻**,非本人发言、不伪造其观点。
> 一切分数线/招生/政策结论**以各校官方最新公布为准**;9吧锐评含社区情绪,仅供参考,不构成报考建议。涉及离世/心理健康内容严肃呈现。

## 这是什么
把 985吧(9吧)的**当下真实锐评** + 张雪峰式**决策框架**,做成一个能"对线"的志愿助手。所有 9吧 语料、图片均**已本地化进仓库**,clone 下来即可完整运行,不依赖任何个人账号/密钥。

## 模式
- **985吧·实时锐评** —— 真实金句卡片流,按主题筛选:`专业鄙视链 / 院校battle / 排行榜 / 就业出口 / 升学保研 / 出国留学 / 科研读博 / 杂七杂八榜 / 分数线跳水 / 招生套路 / 后悔实录`。含**招生风格图鉴**(超短裙 / 姜-泰勒 / 共轭 + 2026今年新动向)、**黑话解码**、**🎲 随机斗一只蛐蛐**;部分卡片嵌 **9吧原图**(榜单/录用名单)和可折叠的 **🦗 楼中对线**。
- **赛博斗蛐蛐** —— 对话 agent,3 人设可切换:`985吧·斗蛐蛐 / 张雪峰·致敬 / 张雪峰·扮演`。
- **避坑雷达** —— 输入院校/专业,扫出 超短裙藏分 / 综评藏天坑 / 大类内卷 / 护校水军 等坑。
- **张雪峰·方法论** —— 5 大心智模型 + 8 条决策启发式(提炼自 GitHub 星标最高的张雪峰 skill [alchaincyf/zhangxuefeng-skill](https://github.com/alchaincyf/zhangxuefeng-skill) 9.5k⭐,致敬整理)+ 9吧查证工具。
- **硬数据锚点**。

## 运行(Node ≥ 18)
```bash
# 前端
cd web && npm install && npm run dev        # http://localhost:5173

# 后端(对话 server,另开终端,在项目根目录)
node server/index.mjs                         # http://localhost:8787
```
前端已配代理:`/api` → `8787`。也可在根目录用 `npm run web` / `npm run server`。

### 接入大模型(对话引擎)
server 按优先级找引擎,**都不配就走 mock 兜底**(基于语料拼装,可看人设/检索效果):
1. `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`
2. 系统已有的 `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY`(自动复用)
3. 默认本地 **Ollama**:`http://localhost:11434/v1`,模型 `qwen2.5:14b`
```bash
ollama pull qwen2.5:14b      # 本地零成本跑真对话
```
> 密钥只从环境变量读,**绝不写入仓库**(`.env` 已 gitignore)。推理模型(如 gpt-5.x-high)较慢,约 1 分钟/条。

## 改内容(数据流)
**单一数据源**:`web/src/data/feed.ts`(精选锐评卡,网页直接 import)→ `node scripts/feedToJson.mjs`(= `npm run sync`)→ `web/src/data/feed.json`(对话 server 的检索知识库)。
> 改了 `feed.ts` **必须重跑脚本并重启 server**,否则对话读不到新卡。

其他数据:`heihua.ts`(黑话)· `anchors.ts`(硬数据)· `pitfalls.ts`(避坑)· `data/modes.json`(人设+红线)· `web/public/9ba/`(9吧原图,本地化绕过防盗链)· `corpus/`(原始语料,人读)。

检索原理:关键词 + 中文 2-gram 字面打分(标题加权)取 top5 注入 LLM(目前非 embedding;可按需升级为向量/混合检索)。

## 构建 / 测试
```bash
cd web && npm run build      # 产出 web/dist(静态站,可部署 Vercel/Netlify/任意静态托管)
node tests/runCases.mjs      # 5 个考生 case → tests/cases.md
```
> 部署静态站后,对话功能需另行部署一个可访问的 server(及其 LLM 引擎)。

## 文档
- [ARCHITECTURE.md](ARCHITECTURE.md) — 架构 / 模式 / 数据层 / 里程碑
- [corpus/](corpus/) — 985吧锐评原始语料(人读)
- [tests/findings.md](tests/findings.md) — 测试发现 & 内容待补

## 免责 & 版权
- 9吧图片/锐评为贴吧网友公开发布内容,仅作学习研究示意,已标注来源;如涉侵权请提 issue 删除。
- 本项目与张雪峰本人/其团队、百度贴吧均无关联。
