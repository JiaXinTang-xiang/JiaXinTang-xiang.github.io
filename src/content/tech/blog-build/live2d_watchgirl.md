---
title: 'Live2D 学习与新形象见面'
description: '从一张 PSD 到会跟着鼠标看、还能聊天的看板娘：模型制作、接入 Astro，以及过程中的一些经验'
publishDate: '2026-09-22'
updatedDate: '2026-09-22'
tags:
  - 博客
  - 技术分享
  - Live2D
  - Astro
language: 'Chinese'
draft: false
slug: 'blog-build/live2d-watchgirl'
heroImage: { src: 'https://picr2.jiaxin404.top/posts/tech/blog-build/live2d-watchgirl/live2d-watchgirl-cover.webp', color: '#96bede', inferSize: true }
---

## 前言

之前一直想给博客左下角放一个会动的看板娘，效果应该会非常好看。后来查了一下资料，发现 Live2D 的门槛似乎很高：需要会建模、拆分 PSD、安装 Cubism Editor，还要手动绑定骨骼。

不过在现在的 AI 时代，已经有一些开源工具可以把「分层 PSD → 可动的 Live2D 模型」这一步自动化，剩下的主要是在网页中加载和调试，方便了很多。这里记录一下我的学习路线和实际过程。

## 路线

目前lived大致有两条路线：

1. **传统路线**：使用 Photoshop 分层，再用 Live2D Cubism Editor 手动制作，部署网页。
2. **开源工具路线**：使用 See-Through 自动分层，再交给 PSD2Live 生成模型，部署网页。

## 一、先把图片做成 Live2D 模型

### 1.1 准备分层 PSD

制作分层 PSD，主要有以下几种方式：

1. 从头设计人物，并亲自绘制和拆分图层；也可以找一张图片，再手动分层。
2. 如果不想自己拆分，可以在网上寻找已经分好层的素材，但要注意素材的使用许可。
3. 委托画师绘制一张适合制作 Live2D 的角色图，并提前说明需要分层 PSD。
4. 使用开源项目 [See-Through](https://github.com/shitagaki-lab/see-through)，让 AI 自动把图片拆分成带透明通道的分层 PSD。这种方式最快、最省事，但自动处理后通常还会有瑕疵，需要用 Photoshop 进行微调。

如果没有 Photoshop，也可以使用在线的 [Photopea](https://www.photopea.com/) 进行修图。

### 1.2 图层怎么分

这一步最关键，**图层命名直接决定模型能不能正常绑定和运动**。工具会根据图层名称判断「这是眼睛、这是嘴、这是头发」，名称不正确就可能无法自动识别。

常用命名对照如下：

| 图层名                                | 内容               | 必填 | 作用                     |
| ------------------------------------- | ------------------ | ---: | ------------------------ |
| `face`                                | 脸部基底           |    ◎ | 所有锚点的基准           |
| `eyewhite`                            | 白眼球（左右）     |    ○ | 会被自动左右分离         |
| `irides`                              | 虹膜（左右）       |    ○ | 视线移动、瞳孔缩放的对象 |
| `eyelash`                             | 睫毛               |    ○ | —                        |
| `eye_close`                           | 闭眼差分           |    ○ | 眨眼时交叉淡入           |
| `eyebrow`                             | 眉毛（左右）       |    ○ | —                        |
| `mouth_open` / `mouth_close`          | 开口 / 闭口差分    |    ○ | 口型靠这两个图层切换     |
| `nose` / `ears` / `neck`              | 鼻子 / 耳朵 / 脖子 |    — | —                        |
| `topwear` / `bottomwear` / `handwear` | 上衣 / 下装 / 手臂 |    — | —                        |
| `front hair` / `back hair`            | 前发 / 后发        |    — | 可用于头发摆动           |

> **划重点**：如果想让嘴巴能动，`mouth_open` 和 `mouth_close` 必须是两个独立图层。只有一层的话，后面嘴巴的张合效果会受到很大限制。

分层完成后，建议先在 Photoshop 或 Photopea 中检查：被前景遮住的部分是否补全、透明区域是否清理干净，以及图层名称是否准确。自动分层的结果不要直接导入软件使用，先修一遍通常会得到更好的效果。

### 1.3 导出模型

#### 传统方式：Live2D Cubism Editor

可以从[Live2D Cubism Editor 下载页面](https://www.live2d.com/zh-CHS/cubism/download/editor/)获取软件，然后一个部分一个部分地制作模型和绑定骨骼。

这种方式比较费时费力，但能够深入理解 Live2D 的网格、参数、变形器和物理摆动。入门学习时可以参考[《Live2D 新手教程：制作全流程讲解跟练！》](https://www.bilibili.com/video/BV1Mx42117Rq/?share_source=copy_web&vd_source=bdf868f0b6b5796e62e2f37335e80320)。

#### 使用 PSD2Live

使用 PSD2Live 时，拖入 PSD 就能自动完成网格切分、变形器和物理摆动，最后导出 Cubism 运行时格式（`.moc3`、`.model3.json` 和贴图）。对于想快速做出模型、又不想手动拆分和调整参数的人来说，这个工具很方便。

请支持原作者：[psd2live](https://github.com/tsunehimatoi/psd2live)。也可以从改良版 [Auto_Vtb_beta](https://github.com/lTwTlol/Auto_Vtb_beta) 下载已经打包好的版本，解压后即可使用。

导出时有两个参数值得权衡：

- **`meshSpacing`（网格间距）**：数值越小，网格越密，变形越平滑，文件也越大。我实测过 16 和 40 两个值：16 导出后约 5.2 MB，40 只有约 174 KB，体积相差约 30 倍。静态显示时几乎看不出区别，主要影响转头时脸部变形的平滑度。
- **`atlasSize`（贴图图集尺寸）**：我对比过 1024 和 4096 两个版本，把图集里的部件逐个测量后发现，每个部件的像素尺寸完全一样（243×220、196×251、97×475……），非透明像素总数也只相差约 1%。也就是说，4096 的版本只是把 25 个部件排成一行，其中约 93% 是空白，并没有直接提升源图分辨率。

结论是：图集尺寸不要盲目拉大，真正决定清晰度的还是**源图本身的分辨率**。

## 二、在 Astro 中加载模型

### 2.1 引入运行库

Live2D 需要三个脚本：官方 Core、PixiJS，以及 PixiJS 的 Live2D 插件。放在组件中直接通过 CDN 引入是最省事的方式：

```html
<script
  is:inline
  src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"
></script>
<script is:inline src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js"></script>
<script
  is:inline
  src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js"
></script>
```

> **提示**：这三个资源都在境外，国内访问可能不稳定。正式部署时可以考虑自托管、配置备用 CDN，或者在加载失败时提供降级方案。

### 2.2 注意模型画布与角色轮廓

导出的模型通常有一张完整画布，但角色只占其中一部分。以我这份模型为例，画布是 1024×1024，角色实际占用区域大约是：

```text
角色实际占用的区域（画布坐标）
x 365.8 ~ 647.5     宽 281.7
y  16.9 ~ 1023.3    高 1006.4
```

因此，**画布中心不一定等于角色中心**。如果直接按照画布中心摆放，角色可能会出现偏移或被裁切的问题。更稳妥的做法是在运行时遍历 drawable 的顶点，计算角色的真实包围盒，再根据包围盒进行缩放和居中。

### 2.3 为什么看着糊

模型刚接入时，我也觉得画面特别糊，一度以为是导出质量不够。后来测量后才发现：贴图是按 1:1 对应画布的，角色本体高度约为 1006 px，也就是说贴图精度足够显示到约 1000 px 高；而我当时把整个角色塞进了 380 px 高的容器，只使用了约 38% 的分辨率。

**想让它清晰，优先放大看板娘的显示尺寸即可，不一定要重新导出模型。**

## 三、让模型动起来

### 3.1 鼠标跟随

`pixi-live2d-display` 提供了 `focus(x, y)` 方法，可以让模型朝鼠标方向看。它主要根据方向计算，并不严格依赖鼠标距离，因此可以把监听挂在 `window` 上：

```js
window.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect()
  model.focus(event.clientX - rect.left, event.clientY - rect.top)
})
```

需要注意的是，`focus()` 使用的是「画布左上角 → 目标点」的方向，而不是「模型中心 → 目标点」。如果想让视线回到正前方，可以直接把焦点控制器归零：

```js
model.internalModel.focusController?.focus(0, 0)
```

### 3.2 表情和动作

模型中如果带有 `motion3.json` 和 `exp3.json`，可以按名称调用动作和表情：

```js
model.motion('Nod')
model.expression('微笑')
model.expression('普通')
```

我做了一个待机循环：鼠标不在页面上时，每隔几秒随机切换表情，偶尔播放一个动作；鼠标回到页面后就停止自动切换。这样看板娘不会一直保持同一张脸。

### 3.3 嘴巴张合

如果想让嘴唇保持微张，最好在 PSD 阶段准备 `mouth_open` 和 `mouth_close` 两个差分图层。只有一个 `mouth` 图层时，嘴巴的张合幅度会非常有限；这类问题通常不能只靠网页端代码彻底解决，根治办法还是回到 PSD 中补齐差分图层。

## 四、接入 AI 对话

看板娘会动之后，就可以继续让她聊天。这部分比模型制作简单，但有几个地方必须做对。

### 4.1 API Key 绝对不能放在前端

静态博客没有传统意义上的后端。如果直接把 API Key 写在浏览器代码里，任何人打开开发者工具都可以拿走它。

正确做法是增加一个服务端代理。本项目部署在 Vercel 时，可以使用 Astro 的按需渲染路由单独提供一个 Serverless Function，不需要把整站都改成 SSR：

```ts
// src/pages/api/chat.ts
export const prerender = false
```

### 4.2 使用 `astro:env` 管理环境变量

Astro 不会把 `.env` 中的值直接当成前端变量使用。服务端密钥应在 `astro.config.ts` 中声明 schema，再从 `astro:env/server` 读取：

```ts
// astro.config.ts
env: {
  schema: {
    AI_API_KEY: envField.string({
      context: 'server',
      access: 'secret',
      optional: true
    })
  }
}
```

```ts
// src/pages/api/chat.ts
import { AI_API_KEY } from 'astro:env/server'
```

`access: 'secret'` 可以保证密钥只在服务端可见。声明为 `optional` 后，即使部署环境暂时没有配置密钥，也不会在构建阶段直接失败，而是可以由接口在运行时返回更容易理解的错误。

### 4.3 让 AI 知道正在查看哪篇文章

访客询问「这篇文章讲了什么」时，如果 AI 能读取当前文章正文，回答会更有针对性。前端可以只负责抓取正文，服务端再拼接提示词：

```js
const getPageContext = () => {
  const node = document.getElementById('content')
  const pageText = node ? (node.innerText || '').trim() : ''

  return {
    pageTitle: document.title,
    pageText: pageText.slice(0, 1200)
  }
}
```

正文内容可能包含访客插入的提示词，因此不能让前端直接构造 system 消息。前端只传文章原文，服务端负责加边界、截断内容并生成最终提示词。这样可以降低提示词注入带来的风险。`innerText` 会触发布局计算，长文章不宜反复读取，实际使用时可以在一页中缓存一次结果。

### 4.4 给对话入口增加兜底

「打开对话」这件事不应该依赖 Live2D 模型是否加载成功。如果 CDN 访问失败、浏览器没有 WebGL，或者模型文件 404，而打开对话的点击监听又写在模型加载成功之后，那么对话框也会完全打不开。

因此应该先注册一个与模型解耦的入口：

```js
const openChat = () => {
  container.dispatchEvent(new CustomEvent('live2d:tap', { bubbles: true }))
}

container.addEventListener('click', openChat)
container.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openChat()
})
```

同时，在模型加载失败时提供一个可见的备用按钮。容器也可以加上 `role="button"` 和 `tabindex="0"`，这样使用键盘的用户同样可以打开对话。

## 相关资料

- [Live2D Cubism Editor 下载页面](https://www.live2d.com/zh-CHS/cubism/download/editor/)
- [Live2D 新手教程：制作全流程讲解跟练！](https://www.bilibili.com/video/BV1Mx42117Rq/?share_source=copy_web&vd_source=bdf868f0b6b5796e62e2f37335e80320)
- [一张图，制作 Live2D](https://www.bilibili.com/video/BV1by8N6kEQp/?spm_id_from=333.337.search-card.all.click&vd_source=5dedb30d6360efbc60e09176831af1d3)
- [一张图片生成 Live2D](https://www.bilibili.com/video/BV1Mx42117Rq?spm_id_from=333.788.videopod.sections&vd_source=5dedb30d6360efbc60e09176831af1d3)

## 资料与项目地址

- 一键拆分 PSD：[See-Through](https://modelscope.cn/studios/ljsabc/See-Through)
- PS 修图网站：[Photopea](https://www.photopea.com/)
- See-Through 原项目：[GitHub](https://github.com/shitagaki-lab/see-through)
- PSD2Live 原项目：[GitHub](https://github.com/tsunehimatoi/psd2live)
- 相关项目：[Anime2.5DRig](https://github.com/852wa/Anime2.5DRig)
- 打包下载：[Auto-live2D-beta](https://github.com/lTwTlol/Auto-live2D-beta)
- 另一个打包版本：[Auto_Vtb_beta](https://github.com/lTwTlol/Auto_Vtb_beta)

AI 网页分层可能不够理想。如果想要更好的效果，可以尝试在本地部署 See-Through。分层完成后，也不要直接导入软件，最好先在 Photoshop 中清理多余部分并修正细节，效果会更好。

## 小结

整体上没有想象中那么难。真正的门槛还是第一步的原图和分层质量，代码部分已经有工具帮忙完成了大半。但最终还是完成了，主要是打通路线和知识，后续更方便优化和调整，总体效果看起来还行，后续可以换装，换其他pose，参考原图模板弄一些二创之类的，嘿嘿嘿。