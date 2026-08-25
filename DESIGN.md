# DESIGN.md — Misaka Blog

## 1. Objective

这是一个现代二次元个人博客：第一眼有明确的角色与世界观，进入文章后则安静、清楚、适合长时间阅读。视觉质量应达到可作为个人品牌长期使用的完成度；二次元元素负责建立记忆点，不以牺牲正文可读性为代价。

## 2. Product Context

- **What the product does:** 发布、组织和检索中文长文，并让站主在后台管理文章、标签与站点背景。
- **Who it's for:** 喜欢技术、ACG 与个人创作内容的中文读者，以及需要用浏览器完成写作和发布的独立站主。
- **Adjacent brands (feel like these):** Linear 的界面克制、Bangumi 的 ACG 语境、少数派的中文长文可读性。
- **Distant brand (do not feel like this):** Bilibili 主站；它的信息密度和强运营感不适合个人博客的沉浸阅读。
- **Cultural register:** 现代、轻二次元、技术化；角色感来自构图与细节，不依赖堆叠萌系装饰。

## 3. Visual Foundations

### 3a. Color

- **Neutral scale:** `--n-0: #FFFFFF`, `--n-50: #F7F8FC`, `--n-100: #ECEEF6`, `--n-300: #B8BDCC`, `--n-500: #73798C`, `--n-700: #343849`, `--n-900: #171923`, `--n-950: #0D0F16`。
- **Accents:** `--accent-primary: #6D5DFB`（电气紫，仅图形级：填充、焦点环、标记），`--accent-secondary: #2BC8B7`（薄荷青），`--accent-character: #FF6B9A`（角色粉，仅用于极少量角色细节和收藏状态）。
- **Text accents:** 文本与链接不使用图形级 accent（`#6D5DFB` 在页面底色上仅 4.3:1，达不到正文标准）。浅色主题文本级 accent 为 `--accent-ink: #5041DB`（页面底色上 6.3:1），深色主题为 `--accent-ink-dark: #9A8BFF`（深色表面上 6.3:1）；标签文字浅色用 `#137E73`、深色用 `#57D9CB`。
- **Semantic:** `--success: #168A67`, `--warning: #B56B12`, `--error: #D4475D`, `--info: #3976D8`；深色主题下语义色整体提亮一档并复检对比度。
- **Dark ramp:** 深色主题是规范的一部分，不由实现自由发挥：页面 `#0D0F16`、表面 `#171923`、墨色 `#F7F8FC`、次墨色 `#D8DAE4`、弱化 `#A5AABC`、accent 柔底 `#292449`；深色下同步 `color-scheme: dark` 与表单控件配色。
- **Borders & shadows:** 分隔线与边框使用墨色透明度而非实色灰——浅色 `rgb(23 25 35 / 0.08)`、深色 `rgb(247 248 252 / 0.10)`，使线条在背景图上自然融合；阴影分两级：浮层柔影 `0 8px 30px rgb(13 15 22 / 0.08)` 与滚动后的头部投影，深色下阴影加深而非加亮。
- **Usage rules:** `--accent-ink` 系承担链接、正文强调和当前导航；`--accent-primary` 承担填充、焦点环与唯一主操作；青色只编码标签/系统状态；角色粉每屏最多出现一次。背景图上方始终叠加可配置遮罩，正文不直接压在复杂图像上。

### 3b. Typography

- **Brand display face:** `ui-rounded, "Hiragino Maru Gothic ProN", "Microsoft YaHei", sans-serif`，600/700，仅用于站名、品牌标记和界面一级标题；字距 `-0.025em`。该栈在 Windows/Android 回退后失去圆体性格，因此圆体只承担品牌识别，不承担阅读层标题。
- **Editorial display face:** `"Songti SC", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif`，600，用于文章列表标题与文章页标题。衬线标题与黑体正文的对比是阅读层编辑感的来源；衬线不可用时回退正文黑体，不允许浏览器合成粗体。
- **Body face:** `"Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`，400/500；即使网络字体不可用也保持中文排版稳定。
- **Utility face:** `"SFMono-Regular", "Cascadia Code", Consolas, monospace`，400/600，用于日期、代码、快捷键和短标签；日期、归档与数据数字启用 `font-variant-numeric: tabular-nums`。
- **Type scale:** `12 / 14 / 16 / 18 / 22 / 30 / 42 / 64`；正文桌面端 `17px/1.85`，移动端 `16px/1.8`。
- **CJK typesetting:** 标题启用 `text-wrap: balance` 避免孤字短行；引号悬挂（`hanging-punctuation: first`）与中西文自动间距作为渐进增强；正文使用全角弯引号 `""''`；中文不使用斜体，强调使用粗体或引号。
- **Weight discipline:** 正文只用 400，界面标签 500，标题 600/700；不使用 800/900，也不以大面积粗体制造层级。

### 3c. Spacing & rhythm

- **Base unit:** `4px`。
- **Spacing scale:** `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px`。
- **Whitespace:** 桌面首页区块间距至少 `80px`；文章正文最大宽度 `720px`；正文段落间距约 `1.1em`。移动端页面左右留白 `20px`。

### 3d. Component seeds

- **Button:** 三种变体：实心主操作、细边框次操作、纯文本操作；高度至少 `44px`，圆角 `10px`，每个视区最多一个实心主操作。
- **Card / container:** 文章条目优先采用无阴影的横向排版与细分隔线；需要浮于背景图之上的容器使用半透明实色和 `12px` 圆角，不使用统一的卡片网格。
- **Iconography:** 使用一致的 1.75px 线性图标；不用 emoji 充当导航或标题装饰。
- **Character motif:** 角色视觉以可替换背景图、局部裁切和一枚抽象“电流发夹”标记构成；标记由两段偏移折线组成，可用于加载状态、当前导航和引用块。
- **Theme controls:** 背景图、遮罩强度、焦点位置与浅色/深色主题均可配置；所有预设必须保证正文表面达到对比度标准。读者可在页脚切换主题（跟随系统/浅色/深色，localStorage 记忆），站主配置仅作为读者未选择时的默认；页面以内联脚本在首帧前应用读者偏好，不允许主题闪烁。
- **Article details:** 文章页标配标题锚点链接、代码块复制按钮、外部链接新标签标记与文末「上一篇/下一篇」导航；阅读进度为文章页专属的 2px accent 细线，随滚动单向推进，不使用循环动画。
- **Scrollbar:** 全站滚动条为透明轨道上的细胶囊滑块（10px 槽 + 3px 透明边），静止时使用墨色透明度（浅色 `rgb(23 25 35 / 0.20)`、深色 `rgb(247 248 252 / 0.24)`），悬停呈现电气紫；Chromium/Safari 走伪元素方案，Firefox 使用 `scrollbar-width`/`scrollbar-color` 标准方案（标准属性会使 Chromium 伪元素悬停态失效，两者不混用）；代码块等常暗表面使用亮墨色滑块。
- **Footer:** 页脚固定为单行克制布局：版权与动力声明、订阅入口（RSS）、回到顶部；不堆放社交图标墙。

## 4. Accessibility

- **Text contrast:** 正文对背景至少 4.5:1，大字和 UI 至少 3:1；背景配置保存前进行可读性预览。文本级 accent 在浅/深主题下分别使用 `--accent-ink` 与 `--accent-ink-dark`，图形级 `#6D5DFB` 不作为小字文本色；新增或调整任一 token 时在两种主题下复检。
- **Motion:** 动效集中在首次加载的背景聚焦与标记闪烁，时长 `180–500ms`；`prefers-reduced-motion: reduce` 下全部关闭。
- **Focus indicators:** 可交互元素显示 `2px` 电气紫外环与 `2px` 间隔，不移除浏览器焦点而不给替代。
- **Alt text policy:** 装饰性背景使用空替代文本并由 CSS 呈现；文章信息图描述结论，内容插图描述人物、动作及与正文有关的场景。
- **Targets and structure:** 点击目标至少 `44×44px`；文章使用唯一 H1 和顺序标题层级；键盘可完成后台主要流程与主题切换。

## 5. Voice & Tone

- **Register:** 对话式、技术化，偶尔轻巧，但不卖萌。
- **Sentence rhythm:** 正文长短句混合；界面文案短句、明确动词。
- **Words this brand uses:** “发布文章”、“继续阅读”、“保存草稿”、“背景预览”。
- **Words this brand refuses:** “赋能”、“无缝”、“开启旅程”、“极致体验”、“解锁潜能”。
- **Address:** 面向读者使用“你”，后台操作尽量省略主语，直接说明动作。

## 6. Implementation Practices

- **Token format:** 设计值以 CSS 变量定义，并映射为 Tailwind CSS 主题；页面样式只使用 Tailwind 工具类，动态背景焦点等计算值允许使用行内样式。
- **Component library convention:** 优先自建小型、语义化组件；仅在无障碍交互复杂时采用无样式 primitives，不引入整套视觉组件库。
- **Image treatment rules:** 博客不设文章封面。背景图和正文图片均由外部图床托管；后台只录入并保存 HTTPS 背景 URL，不提供上传或代理存储，正文图片直接使用 Markdown 图床链接。背景配置在 D1 保存 URL、焦点、遮罩、主色 hex 与启用状态；背景加载前先铺主色占位，图片就绪后淡入（≤500ms），建议使用 AVIF/WebP 与 `image-set()` 响应式源。文章内容图保持原始比例。
- **Friend links:** 友情链接采用纵向编辑式列表，不使用卡片网格；每项展示 favicon、站名、简介与域名。默认读取目标站根目录 `/favicon.ico`，失败时显示站名首字母，并允许后台覆盖自定义 HTTPS 图标 URL。
- **Grid system:** 桌面首页为固定状态栏下的非对称两栏：左侧 `320px` 悬浮辅助栏，依次包含个人资料卡、常用标签和文章归档；右侧为弹性宽度文章列表，每页默认 8 篇。移动端改为固定标题栏与单列文档流，顺序为个人资料、文章、分页、常用标签、文章归档；文章页正文居中，目录在宽屏成为侧栏。
- **Motion rules:** `cubic-bezier(0.22, 1, 0.36, 1)`，交互 `180–240ms`、场景转换最多 `500ms`，禁止弹跳和无目的循环动画。客户端导航与主题切换优先使用 View Transitions（React Router 的 `viewTransition`），不支持的浏览器直接无过渡降级。
- **Responsive floor:** 以 `375px` 为最小验收宽度；背景主体焦点可单独配置移动端位置。
- **Content limits:** 个人简介桌面默认最大高度 `160px`、移动端 `144px`，溢出时渐隐并提供“展开/收起”；常用标签与月份归档桌面最多各 8 项，移动端最多各 6 项，超出后链接至完整页面。
- **Feeds & sharing:** 站点提供 RSS/Atom 订阅与 sitemap；分享卡片（OG）使用固定模板排版文章标题与站名，不依赖外部截图服务。
- **Performance budget:** 速度是质感的一部分：首屏 LCP 目标 ≤2.5s（4G 节流），网络字体子集化且 `font-display: swap`，背景图建议 ≤400KB，首屏不加载与阅读无关的脚本。

## 7. Anti-Patterns

- **No 紫蓝渐变英雄区。** 电气紫是功能强调色，不作为泛 SaaS 式全屏渐变背景；渐变只允许出现在 2px 进度线、标记描边等功能性细节上，不作为任何面积背景或按钮填充。
- **No 六宫格功能卡片。** 博客内容以文章流和编辑层级组织，不把每篇文章包装成同质卡片。
- **No emoji 导航与标题。** 二次元辨识度来自一致的角色视觉系统，而不是随机表情符号。
- **No 玻璃拟态覆盖所有表面。** 半透明仅用于背景上的导航和信息层，正文采用稳定实色底。
- **No 动漫素材拼贴。** 一个主要背景视觉就足够；头像、贴纸、角标不得同时争夺注意力。
- **No 空泛欢迎语。** 首页首句应说明博客写什么，例如“记录前端、Cloudflare 与偶尔出现的二次元观察”。
- **No 自动轮播。** 背景和精选文章由用户主动切换，避免干扰阅读和可访问性。

## 8. Decision-Making

1. **可读性优先。** 背景、角色或品牌色与正文冲突时，先调整遮罩和表面，再考虑保留装饰。
2. **内容优先。** 首页首屏必须让访客立即看到最近文章或清晰入口，角色视觉不得把文章推到折叠线以下。
3. **一个视觉主角。** 每个页面只允许背景或排版构图中的一个成为主视觉；文章列表不预留封面区域。
4. **二次元但不幼态。** 采用画面语言和微妙符号，不采用大量粉彩、贴纸与撒娇式文案。
5. **明确胜过聪明。** 后台操作、错误和空状态直接说明结果与下一步。
6. **少依赖、易维护。** Cloudflare 原生能力优先，只有重复出现三次以上的模式才抽象。

## 9. Workflow

1. 阅读 Objective、Product Context 与 Voice & Tone，明确页面唯一主要任务。
2. 先写真实中文内容结构，再决定背景或角色视觉如何服务它。
3. 按 Visual Foundations 应用颜色、字体、间距和组件规则。
4. 验证自定义背景在桌面、移动端及浅/深主题下的裁切与对比度，并复检两种主题下文本级 accent 的对比度。
5. 设计正常、加载、空、错误和权限不足状态，并保证键盘操作。
6. 执行 Anti-Patterns 棱镜，删除卡片堆叠、泛渐变和无意义装饰。
7. 在 `375px`、`768px` 和宽屏检查布局，再做对比度与减少动效检查。
8. 最后确认 Workers、D1 与外部图片加载失败时的降级路径不会破坏公开文章阅读。
