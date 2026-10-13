# 梦境重构 · Dream Reframe

> 把一段醒来后即将遗忘的梦，重构成可以被看见的画面，和一组可以直接喂给文生图模型的视觉提示词。

**在线体验**：https://960668.github.io/dream-reframe/

![首屏](assets/shot-hero.png)

## 这是什么

你刚醒来，脑子里还残留着一些画面：会呼吸的书架、退潮的瓷砖地、一道没有尽头的玻璃楼梯。你随手把它打出来——顺序是乱的，因果是缺的，五分钟之后它就会消失。

**梦境重构**不解释这个梦意味着什么，它做四件事：

1. **解析**：从混乱的口述里抽出核心意象、情绪基调、关键场景
2. **还原**：把素材重新组织成 2-5 个画面，每个画面带情绪和身体感
3. **视觉化**：为每个画面写一段英文提示词，并生成一条统一的**风格锚点**，保证几张图看起来出自同一个梦
4. **出图（可选）**：接上免费的文生图模型（智谱 CogView-3-Flash / 硅基流动 Kolors），在页面里直接把每个画面变成图，单张可重新生成

即使不出图，提示词也可以一键复制到 Midjourney / 即梦 / Stable Diffusion，或导出为 JSON 留档。

![重构结果](assets/shot-result.png)

## 一键出图

在「模型设置 → 出图」里选一个带出图能力的服务商：

| 服务商 | 出图模型 | 费用 | 备注 |
|---|---|---|---|
| 智谱 GLM | `cogview-3-flash` | **免费** | 注册只要手机号，推荐首选 |
| 硅基流动 | `Kwai-Kolors/Kolors` | 输出免费 | 需先完成实名认证；支持 negative_prompt |
| OpenAI | `gpt-image-1` | 付费 | 浏览器不能直连，仅本机 + 代理可用 |

行为说明：

- 默认**重构完成后自动出图**，逐张串行生成（免费模型有并发限制，串行最稳）
- 关掉「自动出图」后，每个画面下有「生成这张」按钮，想出哪张点哪张
- 已经生成的画面可以点「换一张」单独重生成，不影响其他画面
- 单张失败（限流、内容审核）不会中断整批，失败的卡上会写明原因，点「重试」即可
- 没有出图能力的服务商（如 DeepSeek）照常可用：文字链路不变，提示词拿去别处出图

## 风格锚点的实际效果

下面两张图来自同一个梦境的两个画面，提示词完全由上面的链路生成，没有人工修改。注意它们共享同一条风格锚点，所以色调、质感、影调是一致的——这就是跨画面一致性的解法。

**画面 01 · 潮水退去**

![画面 01](assets/demo-shot-01.png)

**画面 04 · 字回到海里**

![画面 04](assets/demo-shot-04.png)

> 两条提示词的完整原文在 `src/sample.js` 里，可以直接复制去复现。

## 快速开始

不需要安装任何依赖，只要 Node 18+。

```bash
git clone https://github.com/<你的用户名>/dream-reframe.git
cd dream-reframe
node server.mjs        # 或者 npm start
```

打开 <http://127.0.0.1:8080>：

1. 展开「模型设置」，选服务商（DeepSeek / 智谱 / Kimi / 通义 / 硅基流动 / OpenAI，或任意 OpenAI 兼容接口）
2. 粘贴你的 API Key，保存
3. 描述一个梦，点「重构这个梦」

没有 Key 也能玩：点「看示例效果」可以走完整个交互流程（页面会明确标注这是示例数据）。

## 关于密钥

- 应用**不内置任何密钥**，也不会把你的 Key 发到除模型服务商以外的任何地方
- Key 只存在你这台设备的浏览器 `localStorage` 里，换浏览器要重填
- 提交到 GitHub 的代码里没有任何密钥，可以放心开源

> 为什么要 `server.mjs`：部分服务商没有开放浏览器跨域（CORS），页面直连会被浏览器拦截。这个零依赖的本地脚本把请求从本机转发出去。如果你的服务商允许直连，页面上「经本地代理转发」不勾选也能用。

## 目录结构

```
dream-reframe/
├── index.html            # 单页入口
├── assets/
│   └── styles.css        # 全部视觉
├── src/
│   ├── app.js            # 入口：状态、事件、流程编排
│   ├── config.js         # 服务商预设（只有公开信息，无密钥）
│   ├── image.js          # 文生图客户端：双形状容错、错误归因、超时
│   ├── llm.js            # 最小 OpenAI 兼容客户端：SSE 解析、错误归因、JSON 容错
│   ├── pipeline.js       # 链路：解析+编排画面 → 视觉提示词 → 出图（可选）
│   ├── prompts.js        # 提示词模板 —— 产品的核心资产（含出图约束 IMAGE_GUARD）
│   ├── render.js         # 渲染层（全部 DOM API，模型输出不经 innerHTML）
│   └── sample.js         # 示例数据
├── server.mjs            # 零依赖本地服务：静态文件 + 接口转发
└── docs/
    ├── PRD.md            # 产品说明：要解决什么、为什么这样解决
    ├── PROMPTS.md        # 提示词调参手册：改哪一行、怎么验证
    └── ROADMAP.md        # 后续计划
```

## 几个设计取舍

**为什么先出画面，再出提示词，而不是一口气生成？**  
提示词必须建立在稳定的画面结构之上。把两步拆开，第二步只需要处理「画面语言」，第一次的失误不会污染第二次的结果，也更容易定位是哪一步出了问题。

**为什么解析和编排画面合并成一次调用？**  
它们共享同一份上下文，拆开只会多付一次延迟和一次输入 token，换不到质量提升。画面之后才拆，因为视觉提示词需要的是结构化结果，而不是自然语言。

**为什么用「身体感」而不是「运镜」？**  
这是最重要的一次修正。最初我让模型输出「景别 + 运镜」，结果是：读起来全都像奇幻短片，不像梦。原因是**分镜、景别、运镜是电影语法，是导演的组织方式，不是梦的组织方式**。梦里没有机位，没有推拉摇移，你记得的是「水在退但脚是干的」「影子比我先走」这类身体感。

所以画面字段从 `camera` 换成了 `sensation`，视角与构图推迟到第二段由模型根据画面内容决定。同时系统提示词里补上了梦的运作方式：场景无过渡切换、物理不成立、身份漂移、情绪与画面错配、清晰度不均匀、不给梦一个结局。**只有负向约束（不要解梦、不要编造意象）是不够的，必须正面写出「梦的语法是什么」。**

**为什么要「风格锚点」？**  
跨画面一致性是文生图最难的问题之一。把媒介、色调、光线、质感固定成一条字符串，拼进每个画面的提示词，是成本最低、效果最稳的做法。视觉提示词的规则里还额外要求锚点往「梦境质感」走——颗粒、柔焦与超清晰并存、轻微透视畸变、来处不明的光源——而不是干净考究的影棚感。

**为什么出图是可选的、串行的、可单张重来的？**  
出图和文字是两条独立的链路。文字链路必然要跑，出图是可选的一步——你可能只想拿提示词去 Midjourney。串行而非并行，是因为免费出图模型普遍有并发限制，同时发四张的结果往往是四张一起被限流；单张失败不中断整批，把成功的留下，失败的单独重试，比全部作废有用。这是实际用免费接口跑出来的教训，不是拍脑袋。

**为什么模型输出走 `textContent`，不走 `innerHTML`？**  
模型输出是不可信输入。它可能包含被诱导出的 HTML，直接插入就是 XSS。这条线在代码里是硬约束。

## 想调风格？改这里

提示词是产品的核心资产，全部集中在 `src/prompts.js`，改完刷新页面即可生效，不需要动 UI 或链路代码。

完整的调参方法见 **[docs/PROMPTS.md](docs/PROMPTS.md)**：四个控制点的分工、症状到行号的对照表、以及三个可以直接照抄的实验。这里只列最短版本：

| 位置 | 管什么 |
|---|---|
| `src/prompts.js` → `ANALYZE_SYSTEM` | 文字像不像梦（标题、画面、身体感） |
| `src/prompts.js` → `VISUAL_SYSTEM` | 画面像不像梦（风格锚点、英文提示词） |
| `src/prompts.js` → `IMAGE_GUARD` | 出图质感：防乱码文字、防过度干净（支持 negative_prompt 的接口单独下发） |
| `src/pipeline.js` → `temperature` | 发散程度：解析段 `0.85`，视觉段 `0.6` |
| `src/config.js` → `PROVIDERS` | 换模型（同一份提示词换模型，效果可能天差地别） |

一条经验：**能用正向描述就不要写「不要」。** 每多一条「不要 X」，模型对 X 的关注度反而上升。

出图侧的完整旋钮说明（含「画面太干净/有人脸崩坏/风格跳」的症状对照表）在手册第六节。

要加一个新字段（比如「听觉」），需要同步改三处：`ANALYZE_SYSTEM` 的 JSON 结构、`pipeline.js` 的 `normalizeAnalysis`、`render.js` 的渲染函数。漏掉后两处，模型的输出会掉进虚空。

改完提示词记得同步更新 `src/sample.js` 的示例数据；如果连示例提示词一起改了，README 里那两张成片图也要重新生成，否则「可直接复现」这句话就不成立了。

## 局限

- 出图直接从浏览器调用服务商接口，所以只能用允许跨域直连的服务商（上面的表格里都标了）；想要完全不受限，需要一个服务端，见 Roadmap
- 出图的一致性靠提示词级别的风格锚点，不是模型级别的（LoRA / 参考图），跨画面的人物面部一致性没有保证
- 梦境记录不做云端留存，这是一次性的工具，不是档案库

## Roadmap

见 [docs/ROADMAP.md](docs/ROADMAP.md)。下一优先级是**梦境档案**：登录 + 云数据库，把每晚的梦攒成一本可翻的册子。

## 发布到 GitHub

### 0. 先配好 git 身份

这一步不能跳。没有身份，提交会挂在一个匿名账号下，**GitHub 上不会算到你的贡献记录里**，招聘方点进 commit 也看不到作者是谁。

```bash
git config --global user.name "你的名字"
git config --global user.email "你的 GitHub 邮箱"
```

邮箱建议用 GitHub 账户里设置的那个（Settings → Emails），否则头像和贡献图都不会关联。

### 1. 在 GitHub 上建一个空仓库

浏览器打开 https://github.com/new ，仓库名 `dream-reframe`。

**不要勾选** "Add a README file"、"Add .gitignore"、"Choose a license"——本地已经有了，勾了会导致 push 冲突。

### 2. 关联并推送

推荐用 HTTPS + Token，因为你这台机器还没有 SSH 密钥：

```bash
cd /Users/mac/WorkBuddy/2026-10-13-14-57-46/dream-reframe
git remote add origin https://github.com/<你的用户名>/dream-reframe.git
git push -u origin main
```

推送时会要求输入账号密码。**密码栏要填 Personal Access Token，不是你的 GitHub 登录密码**：

1. 打开 https://github.com/settings/tokens
2. Generate new token → 勾选 `repo` 权限 → 生成后复制
3. 粘到密码栏（终端里不会显示字符，这是正常的）

Mac 上第一次输入后会被 Keychain 记住，之后不用再输。

<details>
<summary>或者：装 gh CLI，一条命令建仓库 + 推送（推荐长期使用）</summary>

```bash
brew install gh
gh auth login          # 按提示选 HTTPS，浏览器授权
cd /Users/mac/WorkBuddy/2026-10-13-14-57-46/dream-reframe
gh repo create dream-reframe --public --source=. --push
```

好处是不用手动建仓库、不用管理 Token，`gh` 会自动处理凭据并写进 Keychain。

</details>

<details>
<summary>或者：用 SSH（需要先生成密钥）</summary>

你这台机器目前没有 SSH 密钥。生成并添加：

```bash
ssh-keygen -t ed25519 -C "你的 GitHub 邮箱"   # 一路回车
pbcopy < ~/.ssh/id_ed25519.pub                # 复制公钥
```

然后打开 https://github.com/settings/keys → New SSH key → 粘贴 → 保存。

```bash
git remote add origin git@github.com:<你的用户名>/dream-reframe.git
git push -u origin main
```

</details>

### 3. 打开自动部署（这一步别跳过）

仓库里已经放好了 `.github/workflows/deploy.yml`。推上去之后：

1. 进入仓库 **Settings → Pages**
2. 把 **Source** 从 "Deploy from a branch" 改成 **"GitHub Actions"**
3. 回到 **Actions** 标签页，看到 "Deploy to GitHub Pages" 跑完（约 1 分钟）

地址就是 `https://<你的用户名>.github.io/dream-reframe/`。以后每次 push 到 main 都会自动更新。

**这一步比仓库本身重要。** 面试官不会 clone 你的代码跑一遍，但会点开一个链接试用。README 第一段放上这个地址，效果远好于十页代码。

### 4. 收尾

- 把 `src/config.js` 里的 `REPO_URL` 改成你的仓库地址，页脚链接才会生效
- 把 README 顶部的「在线体验」地址换成真实的 Pages 地址
- 在仓库 **About** 里填一句话简介，并把 `assets/shot-result.png` 设为 social preview（分享到微信/Twitter 时显示这张图）

### 部署后注意：没有本地代理了

Pages 是纯静态托管，`server.mjs` 跑不起来，所以**勾选「经本地代理转发」会失效**。好在主流服务商都允许浏览器直连，实测结果：

| 服务商 | 浏览器直连 |
|---|---|
| DeepSeek / 智谱 / Kimi / 通义 / 硅基流动 | 支持 |
| OpenAI | 不支持，需服务端代理 |

所以部署后请使用上表前五个之一。选了不支持直连的服务商，设置面板会直接给出提示，不会让你撞一次错误才发现。

## License

MIT。把 `LICENSE` 里的署名换成你自己的名字。
