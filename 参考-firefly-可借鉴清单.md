# JIABlog 参考 firefly：差异对照与可借鉴清单

> 对照对象
> - 我的站：`F:\JIABlog` —— astro-theme-pure 4.1.2，`astro-pure` 以**本地包**形式 vendored 在 `packages/pure`（**可以随意改源码，这是你比 firefly 用户最大的优势**）
> - 参考站：`C:\Users\JXT\Desktop\firefly` —— Firefly v6.7.13，Astro + Svelte 5 + Tailwind v4 + Expressive Code
>
> 一句话结论：**firefly 赢在功能广度，你赢在底子干净。你最该从它那儿拿的不是"更多组件"，而是三样工程基建：图片管线、构建期校验、内容分层。**
> 同时你自己有 2 处严重的性能债，光是修掉它们，你的站就会比 firefly 更快。

---

## 一、总体对照

| 维度 | JIABlog（你） | firefly（参考） | 判断 |
| --- | --- | --- | --- |
| 模板底子 | astro-theme-pure 4.1.2，依赖本地包 | 自研 Firefly 主题 | 你的可塑性更高 |
| 样式方案 | UnoCSS | Tailwind v4 + Stylus | **别换**，换了是纯负债 |
| 内容集合 | 6 个：blog / tech / daily / monthly / docs / update | 2 个：posts / spec | 你更细，firefly 更简单 |
| 内容量 | ~36 篇 tech + 月记 + 文档 | ~120 篇（算法 / UE / C# / Dart / 图形学 / 网络 / OS / LeetCode / RC） | **firefly 的"目录分层"值得学** |
| 搜索 | Pagefind ✅ | Pagefind | 打平 |
| 评论 | Waline ✅ | 5 种可切换 | 你的够用 |
| 代码高亮 | Shiki + 自定义 transformer（标题/语言/复制/折叠） | Expressive Code | **打平**，不必换 |
| 数学公式 | KaTeX ✅ | KaTeX + mhchem | 小改进点 |
| 图片管线 | sharp 可用，但**未设格式/质量** | 集中配置 avif/webp + quality + 防盗链 | ⚠️ **你最该抄的一块** |
| OG 社交图 | 全站共用一张 `social-card.jpg` | satori 按文章动态生成 1200×630 | ⭐ 强烈建议抄 |
| 页面过渡 | 无（Astro prefetch 兜底） | Swup 局部容器刷新 | 可选，收益中等 |
| 多语言 | 只有语言切换 UI | 5 语言完整 i18n | **不必抄** |
| 扩展组件 | Tabs / Steps / Timeline / Spoiler / MDX ✅ | Mermaid、图片网格、GitHub 卡片、加密文章、阅读时长、分享海报、Bangumi、相册 | ⭐ 挑 3 个抄 |
| 构建体积 | 🔴 **dist 111.8 MB** | — | 🔴 **必修** |
| 依赖一致性 | 🟠 双锁文件 + node_modules 版本漂移 | `only-allow pnpm` 锁死 | 🟠 建议修 |

---

## 二、P0：真实存在的问题

### P0-1 🔴 图片没压缩，dist 111.8 MB（最严重）

实测数据：

```
dist 总计                  111.8 MB
└─ _astro                  99.7 MB   ← 罪魁祸首
   ├─ .png    45.8 MB (10 个)
   ├─ .jpg    27.7 MB (22 个)
   ├─ .woff   16.8 MB (22 个)   ← 见 P0-2
   ├─ .webp    8.1 MB (42 个)
   └─ .js/.css  0.4 MB          ← 真正的代码只有 0.4 MB

单文件 top 5：
  cover.gYSUvu-2.png           15,709 KB   ← 15.7 MB 一张封面
  lxgw-wenkai-latin-300-normal 11,873 KB
  cover.CXhG9BUS.jpg           10,429 KB
  cover.BOs55l1J.png           10,349 KB
  cover.gKnzqsNV.jpg            5,483 KB

源头：src/content/** 里的图片原始体积合计 75.3 MB
```

根因：`astro.config.ts` 的 `image` 段只写了

```ts
image: {
  responsiveStyles: true,
  service: { entrypoint: 'astro/assets/services/sharp' },
  domains: ['ghchart.rshah.org'],
  remotePatterns: [{ protocol: 'https', hostname: 'ghchart.rshah.org' }]
}
```

**没有指定 `format` 和 `quality`**。结果是 15.7 MB 的 PNG 原图被原样复制进产物，并且每张衍生图（多尺寸 webp）都是从这张巨图重新编码出来的——所以 `_astro` 才会膨胀到 99.7 MB。

实际后果：
- Vercel 免费额度 100 GB/月，单篇 15 MB 封面 ≈ **6600 次浏览就打满**
- 首次访问该文章要下 15 MB，移动端基本等于不可用
- 每次构建都要处理 75 MB 源图，构建时间被白白拉长

**firefly 的做法**（`firefly/src/utils/image-utils.ts` + `siteConfig.imageOptimization`）——把"输出格式 / 压缩质量 / 防盗链域名"收进一处配置，再统一喂给 `<Image>`：

```ts
imageOptimization: {
  formats: "webp",          // "avif" | "webp" | "both"
  quality: 85,
  noReferrerDomains: [],    // 解决 i0.hdslb.com 之类防盗链 403
}
```

**给你的落地方案（两步都要做，第一步收益最大）**

1. **源头批处理**（治本）。把 `src/content/**` 那 75 MB 原图统一处理成"长边 1600px、webp q82"，总量能压到 3–5 MB。可以照 `firefly/optimize_images.py` 写个一次性脚本，或直接用 sharp 批处理。
2. **构建期兜底**。给所有封面渲染处显式指定 `format='webp' quality={82}`——要过一遍 `astro-pure` 的 `PostPreview`、你自己的 `src/layouts/ContentPost.astro`、以及首页 `src/pages/index.astro`。

顺带一起处理的：`src/assets/image.png`（1.6 MB）、`src/assets/head.jpg`（736 KB）、`src/assets/title_49.jpg`（129 KB）也都会进产物。

### P0-2 🔴 LXGW 文楷字体白送 16.8 MB

`src/assets/styles/global.css` 第 2–3 行：

```css
@import '@fontsource/lxgw-wenkai/300.css';
@import '@fontsource/lxgw-wenkai/500.css';
```

这是**非 variable 版本 × 2 个字重**，产物里 22 个 `.woff` 合计 **16.8 MB**，比全站所有 JS+CSS（0.4 MB）大 40 倍。中文全字库字体就是这么恐怖。

**改法（择一）**：
- 换 `@fontsource-variable/lxgw-wenkai`（变体字重，一个文件搞定）
- 只保留 400 单字重
- 干脆用系统字体栈（`firefly` 只用了 `@fontsource-variable/jetbrains-mono` + `@fontsource/roboto`，加起来远小于此）

配合 `font-display: swap`，避免字体阻塞首屏。

### P0-3 🟠 双锁文件 + 依赖版本漂移

```
package.json          声明  astro ^5.16.6
node_modules/astro    实际  5.18.0        ← 漂移
bun.lock              206 KB
package-lock.json     432 KB             ← 两个锁文件
```

两个锁文件 = 两套依赖真值来源，谁最后安装谁说了算，典型症状就是"本地能跑、CI 挂掉"。firefly 用一行 `"preinstall": "npx only-allow pnpm"` 从根上堵死。

**建议**：你 `package.json` 里的 `yijiansilian` 脚本用的是 `bun lint && bun sync && …`，说明实际用 bun —— 那就删掉 `package-lock.json`，保留 `bun.lock`，并加：

```json
"packageManager": "bun@1.x.x",
"preinstall": "npx only-allow bun"
```

同时把 firefly 有、你缺的两条脚本补上，让构建链路显式化：

```json
"build": "astro build && npx -y pagefind --site dist",
"new-post": "node scripts/new-post.js"
```

> 说明：Pagefind 目前是靠 `packages/pure/index.ts` 第 98–110 行的 `astro:build:done` 钩子 `spawn('npx -y pagefind …')` 兜着的——能用，但在 CI 上属于隐性依赖（需要在构建环境联网拉 npx 包）。显式写进 `build` 更稳。

### P0-4 🟠 仓库根目录的垃圾文件

```
{config.title}         0 字节   ← 某次 shell 花括号没转义留下的
.codex                 0 字节
astro.config.ts.backup 4.5 KB
src/layouts/*.backup   5 个
src/pages/**/*.backup  4 个
```

零字节文件直接删。9 个 `.backup` 进了版本库，交给 git 管历史就够了，建议清掉并加进 `.gitignore`：

```
*.backup
```

---

## 三、✅ 复核结论：这几处**不要改**

我原本怀疑你的 slug 路由有问题，逐个核对源码后**确认是好的**，记在这里避免你（或未来的我）白改一遍：

`packages/pure` 用的 `astro` glob loader，其 `generateIdDefault`（`node_modules/astro/dist/content/loaders/glob.js` 第 9–20 行）的逻辑是：

```js
function generateIdDefault({ entry, base, data }) {
  if (data.slug) return data.slug;          // ← frontmatter 有 slug 就用它
  return getContentEntryIdAndSlug(...).slug; // ← 否则用去掉扩展名的文件名
}
```

也就是说 **`post.id` 本身已经是"优先 slug、其次文件名（无扩展名）"**。所以：

| 文件 | 写法 | 是否 OK |
| --- | --- | --- |
| `src/pages/blog/[...id].astro` | `post.data.slug \|\| post.id` | ✅ 冗余但无害 |
| `src/pages/tech/[id].astro` | 只用 `post.id` | ✅ 正确（slug 已在 id 里） |
| `src/pages/daily/[...id].astro`、`monthly/[...id].astro` | 只用 `post.id` | ✅ 正确 |
| `src/pages/archives/index.astro` | `/${e.collection}/${e.id}` | ✅ 正确 |
| `src/pages/rss.xml.ts` | `/${post.collection === 'blog' ? 'blog' : post.collection}/${post.id}` | ✅ 正确 |

先用 slug 的 `tech/[id].astro` 反而比显式写 `post.data.slug || post.id` 的 blog 路由更简洁。

**唯一的遗留风险**（不是 bug，是维护隐患，可选处理）：`slug` 现在同时充当"内容 ID / URL / 路由参数"三重身份，且**没有作唯一性校验**——将来若两篇文章写了同一个 slug，构建会静默覆盖，不会报错。如果哪天内容多到 100+ 篇，可以考虑在 `astro.config.ts` 加一个构建期校验钩子扫一遍重复 slug。现在 36 篇，不做也行。

---

## 四、P1：firefly 有、你确实值得抄的（按性价比排序）

### ⭐ 1. 每篇文章动态生成 OG 社交预览图（收益最大）

参考：`firefly/src/pages/og/[...slug].png.ts`（354 行，逻辑很直白，可直接移植）

用 `satori` 把标题 + 描述 + 日期 + 作者 + 头像合成 1200×630 PNG，按 slug 静态产出，响应头带 `Cache-Control: immutable`。

你现在 `src/components/BaseHead.astro` 第 16 行是全站共用一张 `config.socialCard` —— 分享到微信、X、Telegram，任何一篇文章都是同一张图。

**落地要点**：
- 你已有 `sharp`，需要新增 `satori`（firefly 用的是 `^0.25.0`）
- 最麻烦的是中文字体：firefly 的做法是**运行时**从 Google Fonts 拉 Noto Sans SC 的 woff2。建议改成本地缓存一份字体文件再喂给 satori，避免构建依赖外网（你本地网络不一定稳定）
- 建好之后把 `BaseHead.astro` 的 `socialImageURL` 改成"有 OG 图用 OG 图、否则回落 socialCard"

### ⭐ 2. 阅读时长 + 摘要（15 行代码，照抄即可）

参考：`firefly/src/plugins/remark-reading-time.mjs`、`remark-excerpt.js`

firefly 的阅读时长插件只有 15 行：

```js
export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = toString(tree)
    const readingTime = getReadingTime(textOnPage)
    data.astro.frontmatter.minutes = Math.max(1, Math.round(readingTime.minutes))
    data.astro.frontmatter.words = readingTime.words
  }
}
```

你的 `astro.config.ts` 里已经挂了 `remarkMath`，配置结构完全兼容，直接把文件放进 `src/plugins/` 再追加到 `markdown.remarkPlugins` 就行。

需要新增依赖：`reading-time`、`mdast-util-to-string`。

你的文章里有很多长篇教程（`camera_calibration.md` 363 行、`waline_jia.md` 269 行），加上"约 X 分钟"对读者是真有用的。

### ⭐ 3. 内容分层：给 tech 拆目录

你现在 `src/content/tech/` 是 **23 个 .md 平铺**，只有 `tags` 一个维度。firefly 是按主题分目录：

```
posts/algorithm/01_sorting.md
posts/cpp_deep_dive/04_move_semantics.md
posts/ue_cpp/14_gas_ability_system.md
posts/leetcode_notes/70.climbing-stairs.md
```

你的 tech 内容其实天然已经成组了：**ROS/RC 小车**（`lsn10_carto`、`wheeltec_nav2`、`t265_ros2`、`orb_slam3`）、**视觉/模型**（`maix_yolo`、`yolo-uv-setup`、`opencv_scr`、`sam_bot`、`camera_calibration`）、**Linux/工具链**（`About-Ubuntu-command`、`sogou_install`、`ubuntu_tools`、`Codex_install`）、**博客建设**（`waline_jia`、`about-my-blog`、`about-my-notes`、`use-git`）。

配合 `astro-pure` 的 `getUniqueTagsWithCount`，把 `tech/[...page].astro` 侧栏从"只有 tags"升级成"分类 + tags 两级"。

> 注意：glob loader 的 id 会带上**目录**（`ros/lsn10_carto`），URL 会从 `/tech/lsn10_carto` 变成 `/tech/ros/lsn10_carto`。**外部链接和 RSS 会失效**，要么一次性做完，要么用 frontmatter 的 `slug` 钉住旧路径（你的 loader 天然支持这个，见第三节）。

### ⭐ 4. Mermaid 图表

参考：`firefly/src/plugins/remark-mermaid.js` + `rehype-mermaid.mjs` + `mermaid-render-script.js`

你的 tech 里有 SLAM 框架、RC 消息总线、异步状态机——**这类内容纯文字讲不清**。firefly 的插件已经做好了"每页只注入一次渲染脚本，避免重复内联 16 KB JS"的优化，可直接移植。

依赖 `hastscript` 和 `unist-util-visit` **你都已经装了**（在 `package.json` 里），几乎是零成本。

### 5. 图片网格图集

参考：`firefly/src/plugins/remark-image-grid.js`

你的 `src/content/monthly/picture/26_05/` 有 3 张图、`26_07/` 有 2 张、`about-my-notes/` 有 7 张，现在只能一张张竖排。firefly 用 directive 语法（`:::grid`）排成网格，观感提升明显，而且**对你的月记这种图集型内容特别合适**。

### 6. 文章"最后更新"提醒

参考：`firefly/src/config/siteConfig.ts` 的 `showLastModified: true` + `outdatedThreshold: 30`

你每篇文章都认真填了 `updatedDate`，但文章页没有任何"本文最后更新于 X，已超过 30 天"的提示。低成本、提升专业度。

### 7. 分享海报 / 二维码

参考：`firefly/src/components/misc/SharePoster.svelte` + `qrcode` 依赖

中文技术博客圈子（BlogClub 之类互推）对分享海报有真实需求。你已经有 Waline 的互动基础，加这个顺理成章。

### 8. 一行 mhchem（没需求就跳过）

`firefly/astro.config.mjs` 第 14 行 `import "katex/dist/contrib/mhchem.mjs"` 让 KaTeX 支持化学式。等你写材料/电池相关内容再加，现在跳过。

---

## 五、P2：可以看，但我建议**不要**抄

| firefly 的东西 | 为什么别抄 |
| --- | --- |
| Swup 页面过渡 | 你的 `BaseLayout.astro` 已有 spotlight + 粒子 + 阅读进度三个全局 `<script>`，Swup 的局部容器刷新会和它们抢生命周期；且需要引入 `@swup/astro` 并重排容器 id，改造面不小 |
| Tailwind v4 迁移 | 与 astro-pure 的 UnoCSS preset 全面冲突，等于重写全站样式 |
| 5 语言 i18n | 你只有中文内容，抄了是纯维护负担。已有 `LanguageToggle.astro` 够用 |
| 5 种评论系统切换 | Waline 已跑通，多接是增加攻击面和配置量 |
| Wallpaper 切换（100+ 张壁纸） | 把 100+ 张 webp 塞进 `src/assets`，dist 会再涨几十 MB。**先做完 P0-1、P0-2 再谈** |
| Live2D / Spine 看板娘 | 纯装饰，体积大、拖首屏 |
| `pagefind.yml` 独立配置 | 你现在走 astro-pure 内部 spawn，够用；等 P0-3 把 build 脚本显式化之后再考虑 |

---

## 六、一个"反借鉴"提醒：你自己的特效层该重构了

`src/layouts/BaseLayout.astro` 有 **653 行**，其中约 **400 行**是点击触发 8 种粒子（星星/圆点/心形/花瓣/圆环/光晕/轨迹）+ 光标 spotlight + 标题光晕 + 双击爆发，**全部内联在这个布局的 `<script>` 里，每个页面都会重新下发一遍**。

firefly 同类效果是拆成独立组件的（`SakuraEffect.astro`、`TypewriterText.astro`、`FloatingControls.astro`），并且各自带开关。你这边的具体问题：

1. `mousemove` 上带着 50ms 节流做 **DOM 节点增删**（轨迹点），`mouseover` 上做冒泡委托 → 移动端和低端机会掉帧
2. 每篇文章 hover 到标题就生成 8 个粒子 → 正常滚动阅读时很容易误触，反而干扰阅读
3. `prefers-reduced-motion` 的判断位置在 `spotlight` 之前就 `return` 了，导致"阅读进度条"以下的效果全被跳过——逻辑对，但 653 行里看不出边界，后人改起来容易踩坑
4. `cover.gYSUvu-2.png` 那 15.7 MB 的封面带来的加载延迟，**远大于**这些粒子带来的愉悦感

**建议**：整体抽成 `src/components/SparkleEffect.astro`，用 `requestIdleCallback` 延迟挂载，并在 `src/site.config.ts` 里加开关：

```ts
effects: {
  sparkle: true,   // 嫌吵时一键关掉，不用去 653 行里挖
}
```

---

## 七、行动顺序（建议照这个来）

```
第 1 步（半天）  P0-1 图片批处理 + P0-2 字体换 variable
                 → dist 从 111.8 MB 降到 10 MB 以内，这一步性价比最高

第 2 步（1 小时）P0-3 锁文件收敛 + build 脚本显式化（顺手 npm run check 验证）
第 3 步（30 分钟）P0-4 删垃圾与 backup 文件

第 4 步（1 天）  OG 动态社交图（firefly 里收益最大的单项功能）
第 5 步（半天）  阅读时长 + 摘要 + Mermaid（三个都能照抄，改动局部）
第 6 步（可选）  tech 分目录重组 + 图片网格 + 过期提醒
第 7 步（可选）  特效层重构为独立组件 + 加开关
```

做完第 1 步，你的站就在"快"这件事上超过 firefly 了——**firefly 的强项是功能广度，不是性能**。而第 4、5 步做完，功能差距也基本追平。
