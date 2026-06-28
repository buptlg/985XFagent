# Case 测试发现 & 待办

> 来源:`node tests/runCases.mjs`(5 个考生画像);最新一次见 `tests/cases.md`。

## 检索质量
- ✅ 已修:**单字误命中**(山东→山大、误顶"哈工不玩丁字裤")。改为 **2-gram 匹配 + 标题加权(×3) + 阈值 1.2**。
- ✅ 精准命中:河南650(哈工尖班693/江苏666/C9三类)、620临床(9吧十年观点/临床悔/华科临八)、同济大类(后悔同济巨类/C9三类)、山东计算机(专业不选计算机/计算机寒冬/宇宙机/机械爆火)。

## 内容空白(待用户"再扒"时补)
- 🔲 **法学**:语料库无任何法学帖 → "金融 vs 法学"只能答金融侧。
- 🔲 **文科生专属**:现有金融跌落多是理科/经管视角,缺文科向(法学/师范/汉语言/新传/汉硕)。
- 🔲 保研 / 电气 / 微电子 / 选调个人案例:补充可增强对应 query。
- 🔲 北邮 / 两电一邮:用户母校相关,可单独补一组。

## mock vs 真模型
- mock 为模板拼装,**双人设语气分化已验证**(985斗蛐蛐 / xf 张雪峰·方法论:致敬框架+扮演口吻,带风格复刻声明)。
- `data/modes.json` 的 persona/style 真正生效需接 Ollama 后,用本脚本回归测试。

## 复跑方式
```
node scripts/feedToJson.mjs   # 若改过 feed.ts
# 重启 server(PowerShell):Start-Process node server/index.mjs -WorkingDirectory <根>
node tests/runCases.mjs       # 重新生成 tests/cases.md
```
