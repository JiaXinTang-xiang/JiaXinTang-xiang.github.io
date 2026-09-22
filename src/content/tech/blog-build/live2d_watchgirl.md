---
title: '给博客加一个 Live2D 看板娘'
description: '从一张 PSD 到会跟着鼠标看、还能聊天的看板娘：模型制作、接入 Astro、以及踩过的坑'
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
heroImage: { src: './images/live2d_watchgirl/cover.jpg', color: '#96bede' }
---

## 前言

一直想给博客左下角放个会动的看板娘。以前觉得 Live2D 门槛很高——要会建模、要装 Cubism Editor、还得手工绑骨骼。实际走一遍下来发现，现在有工具能把「分层 PSD → 可动的 Live2D 模型」这一步全自动化，剩下的就是在网页里加载和调教。

这篇记录完整过程：从原图做成模型、在 Astro 里加载、踩到的坑，最后顺手接了个 AI 对话进去。

阅读前说明：本文假设你已经有一个**分层 PSD**。如果没有，可以先看 [see-through](https://github.com/shitagaki-lab/see-through)——它能把一张插画拆成带 alpha 的分层 PSD，正好是这条流水线的入口。

## 一、先把图做成 Live2D 模型

### 1.1 图层怎么分

这一步最关键，**图层命名直接决定模型能不能动**。工具靠图层名来判断「这是眼睛、这是嘴、这是头发」，名字不对就绑不上。

常用命名对照：

| 图层名 | 内容 | 必填 | 作用 |
|---|---|---|---|
| `face` | 脸部基底 | ◎ | 所有锚点的基准 |
| `eyewhite` | 白眼球（左右） | ○ | 会被自动左右分离 |
| `irides` | 虹膜（左右） | ○ | 视线移动、瞳孔缩放的对象 |
| `eyelash` | 睫毛 | ○ | |
| `eye_close` | 闭眼差分 | ○ | 眨眼时交叉淡入 |
| `eyebrow` | 眉毛（左右） | ○ | |
| `mouth_open` / `mouth_close` | 开口 / 闭口差分 | ○ | 口型靠这两个 |
| `nose` `ears` `neck` | | | |
| `topwear` `bottomwear` `handwear` | 上衣 / 下装 / 手臂 | | |
| `front hair` / `back hair` | 前发 / 后发 | | 发束物理 |

> **划重点**：如果你想让嘴巴能动，`mouth_open` 和 `mouth_close` **必须是两个独立图层**。只有一层的话，后面嘴巴是张不开的（我在第三节会讲这个坑）。

### 1.2 导出模型

我用的是 PSD2Live，拖入 PSD 就能自动完成网格切分、变形器、物理摆动，导出成 Cubism 运行时格式（`.moc3` + `.model3.json` + 贴图）。

导出时有两个参数值得权衡：

- **`meshSpacing`（网格间距）**：越小网格越密，变形越平滑，文件越大。我实测过 16 和 40 两个值——16 导出 5.2MB，40 只要 174KB，**差 30 倍**。静态看几乎没区别，影响的是转头时脸部变形的平滑度。
- **`atlasSize`（贴图图集尺寸）**：我对比过 1024 和 4096 两版，把图集里的部件逐个量了一遍，**每个部件的像素尺寸完全一样**（243×220、196×251、97×475……），非透明像素总数也只差 1%。也就是说 4096 那版只是把 25 个部件排成一行、93% 是空白，**并没有提升分辨率**。

结论：图集尺寸别盲目拉大，真正决定清晰度的是**源图本身的分辨率**。

## 二、在 Astro 里加载模型

### 2.1 引入运行库

Live2D 需要三个脚本（官方 Core + PixiJS + PixiJS 的 Live2D 插件）。放在组件里直接引 CDN 最省事：

```html
<script is:inline src='https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'></script>
<script is:inline src='https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js'></script>
<script is:inline src='https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'></script>
```

> **提示**：这三个都在境外，国内访问可能不稳定。我就遇到过加载失败——所以后来给对话入口做了兜底（见 4.4）。

### 2.2 关键：模型画布 ≠ 角色轮廓

这是最容易踩的坑，我一开始就在这栽了。

导出的模型有**一张 1024×1024 的画布**，但角色只占中间一小条。实测这份模型：

```
角色实际占用的区域（画布坐标）
x 365.8 ~ 647.5     宽 281.7
y  16.9 ~ 1023.3    高 1006.4
```

也就是说**画布中心根本不是角色中心**。如果你按「画布中心 = 角色中心」去摆位置，一开始就会偏。

我的做法是运行时直接量轮廓——遍历所有 drawable 的顶点取包围盒。模型空间两轴都是 `[-0.5, 0.5]`，映射到整张画布：

```js
const measureContent = (model) => {
  const { coreModel, originalWidth: w, originalHeight: h } = model.internalModel
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (let i = 0; i < coreModel.getDrawableCount(); i += 1) {
    if (coreModel.getDrawableOpacity(i) <= 0) continue
    const positions = coreModel.getDrawableVertexPositions(i)
    for (let k = 0; k < positions.length; k += 2) {
      minX = Math.min(minX, positions[k]); maxX = Math.max(maxX, positions[k])
      minY = Math.min(minY, positions[k + 1]); maxY = Math.max(maxY, positions[k + 1])
    }
  }

  return {
    left: (minX + 0.5) * w,
    top: (0.5 - maxY) * h,
    width: (maxX - minX) * w,
    height: (maxY - minY) * h
  }
}
```

拿到真实轮廓后，等比缩放居中就行：

```js
const FIT_RATIO = 0.96   // 留点余量，头发摆动不会被容器边缘切掉

const fitContent = (model, content) => {
  const width = container.clientWidth
  const height = container.clientHeight
  const scale = Math.min(width / content.width, height / content.height) * FIT_RATIO

  model.scale.set(scale)
  model.anchor.set(0, 0)                       // 锚点取画布左上角，方便算
  model.x = (width - content.width * scale) / 2 - content.left * scale
  model.y = (height - content.height * scale) / 2 - content.top * scale
}
```

> **踩坑记录**：我最初的写法是 `model.scale.set(fitScale * 1.75)` 再按画布中心对齐。结果就是**头顶和脚各被切掉一半**——因为 1.75 倍的额外放大让画面越出了容器，而画布中心又不是角色中心，上下裁掉的量还不一样。后来改成量轮廓才正常。

### 2.3 这时候为什么看着糊

顺带说一个反直觉的点：模型刚接上去时我觉得特别糊，一度以为是导出质量不行。

后来量了一下才知道：**贴图是 1:1 对应画布的，角色本体高约 1006px**。也就是说贴图精度足够显示到 1000px 高——而我当时把整个角色塞进 380px 高的容器里，只用了 38% 的分辨率。

**想让它清晰，放大看板娘就行，不用重新导出。**

## 三、让它动起来

### 3.1 鼠标跟随

`pixi-live2d-display` 给了个很方便的 `focus(x, y)`。但要注意它的两个特点：

**一是它只取方向，不看距离。** 内部实现是：

```js
let radian = Math.atan2(ty, tx)
focusController.focus(Math.cos(radian), -Math.sin(radian))
```

所以你把监听挂在 `window` 上、坐标超出画布也完全没问题，角色照样朝着鼠标方向看。想让整页跟随就这么写：

```js
window.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect()
  model.focus(event.clientX - rect.left, event.clientY - rect.top)
})
```

**二是它的方向是「画布左上角 → 目标点」算的，不是「模型中心 → 目标点」。** 这个差异在「让视线归位」的时候会咬人：我原本写了 `model.focus(容器中心)` 想让它看正前方，实测算出来是 `focus = (-0.756, 0.654)`，对应 `ParamAngleX ≈ -22.7°`、`ParamAngleY ≈ +19.6°`——脑袋一直歪着，甚至因为伪 3D 视差整个偏出画布。

归位要绕开 `focus()`，直接让焦点控制器归零：

```js
model.internalModel.focusController?.focus(0, 0)
```

### 3.2 表情和动作

模型里带的 `motion3.json` 和 `exp3.json` 直接按名字调用即可：

```js
model.motion('Nod')        // 动作：点头
model.expression('微笑')    // 表情
model.expression('普通')    // 复位
```

我做了一个待机循环：鼠标不在页面上时每隔几秒随机换个表情、偶尔配个动作；鼠标回到页面就收手。这样看板娘不会一直僵着一张脸。

### 3.3 嘴巴：一个真实的坑

我想让她「嘴唇微张」，这样嘴型一直看得见。结果发现**走表情这条路根本改不动嘴**——眼睛和眉毛都变了，嘴纹丝不动。

原因在 `pixi-live2d-display` 的更新流程里：

```js
update(dt, now) {
  const motionUpdated = this.motionManager.update(this.coreModel, now)
  model.saveParameters()
  expressionManager?.update(model, now)   // 表达式在这里写 ParamMouthOpenY
  this.updateFocus()
  model.update()                          // ← 形变在这里算
  model.loadParameters()                  // ← 然后把参数还原了
}
```

`loadParameters()` 在结尾把参数还原了，所以表达式写进去的值撑不到下一帧的形变计算。

**解决办法是在 `beforeModelUpdate` 里每帧直接写参数**——这个事件正好在 `model.update()` 之前触发，写完立刻就算形变：

```js
model.internalModel.on('beforeModelUpdate', () => {
  mouthValue += (mouthTarget - mouthValue) * 0.12
  if (mouthValue > 0.001) coreModel.setParameterValueById('ParamMouthOpenY', mouthValue)
})
```

实测有效：嘴巴的网格高度从 3.8px 撑到 10.7px，而且**渲染后保持不变**（走表达式那条路渲染后会被打回 3.7px）。

> **注意**：这个方法能救「整张嘴是一个网格」的情况。但如果你的 PSD 只有一层 `mouth`，没有 `mouth_open` 差分，那嘴巴张开的幅度有限——**根治办法还是回第一步，把差分图层补上。**

## 四、接一个 AI 对话

看板娘会动之后，就想让她能聊天。这部分比模型简单，但有两个必须做对的地方。

### 4.1 API Key 绝对不能放前端

静态博客没有后端，如果你在浏览器代码里写 API Key，**任何人打开 F12 都能拿走**。

正确做法是加一个服务端代理。本项目部署在 Vercel，用 Astro 的按需渲染单独开一条路由就够了——**不需要把整站改成 SSR**：

```ts
// src/pages/api/chat.ts
export const prerender = false   // 只让这一条路由变成 Serverless Function
```

### 4.2 环境变量要用 astro:env

这里我踩了一个坑：**Astro 不会把 `.env` 的值塞进服务端的 `process.env`**。我按常规写了 `process.env.AI_API_KEY`，结果接口一直报「没配置」。

正确做法是在 `astro.config.ts` 里声明 schema，然后从 `astro:env/server` 读：

```ts
// astro.config.ts
env: {
  schema: {
    AI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true })
  }
}
```

```ts
// src/pages/api/chat.ts
import { AI_API_KEY } from 'astro:env/server'
```

`access: 'secret'` 保证它只在服务端可见。声明成 `optional` 是为了缺变量时不让**构建**直接挂掉，改由接口在运行时返回一句能看懂的报错。

改完我 build 之后搜了整个产物：**前端静态文件和服务端函数包里都找不到密钥**，说明它是运行时读取的——以后换 key 只要改环境变量重新部署，不用动代码。

### 4.3 让 AI 知道你正在看哪篇文章

这是我觉得最有价值的一个功能。访客问「这篇文章讲了什么」时，AI 能答上来。

做法是前端抓正文，服务端拼接：

```js
const pageContext = () => {
  const node = document.getElementById('content')
  const text = node ? (node.innerText || '').trim() : ''
  return { pageTitle: document.title, pageText: text.slice(0, 1200) }
}
```

> **注意**：正文里可能被人塞进「忽略之前的指令」之类的话。所以**框住正文的那段说明必须由服务端拼**，不能让前端直接构造 system 消息——否则等于把系统提示词交给访客改。我这里前端只传原文，服务端负责加框和截断。

另外 `innerText` 会触发浏览器布局计算，长文章上不便宜，所以一页只抓一次缓存起来。

### 4.4 入口要有兜底

这个坑比较隐蔽：**我的对话面板原本只能靠「点看板娘」打开，而那个点击监听是写在模型加载成功之后的。**

也就是说——只要 Live2D 没加载出来（CDN 被墙、没有 WebGL、模型 404），对话框就**彻底打不开**了。

修法是把「打开对话」这件事和模型解耦，先注册、不依赖模型：

```js
// 不依赖模型：模型挂了也要能点开
const openChat = () =>
  container.dispatchEvent(new CustomEvent('live2d:tap', { bubbles: true }))

container.addEventListener('click', openChat)
container.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openChat()
})
```

同时在加载失败时给一个看得见的兜底按钮——因为模型挂了的话，画面上根本没有角色可以点。

顺便：容器加 `role="button" tabindex="0"`，纯键盘用户才能打开对话。

## 踩坑清单

按踩到的顺序整理一遍，方便对照：

| 现象 | 原因 | 解法 |
|---|---|---|
| 头顶和脚各被切掉一半 | 缩放按画布中心算，而画布中心 ≠ 角色中心 | 量 drawable 顶点取真实轮廓 |
| 看板娘特别糊 | 整身塞进小容器，只用了 38% 贴图分辨率 | 放大显示尺寸，不用重导模型 |
| 视线归位后脑袋歪着 | `focus()` 按「画布左上角 → 目标点」算方向 | 直接 `focusController.focus(0, 0)` |
| 表情能改眼睛、改不了嘴 | `loadParameters()` 在形变后还原了参数 | 在 `beforeModelUpdate` 里每帧写参数 |
| 嘴巴张不开 | PSD 只有一层 `mouth`，没有开/闭差分 | 回 PSD 补 `mouth_open` / `mouth_close` |
| 接口一直报「没配置 key」 | Astro 不会把 `.env` 灌进 `process.env` | 用 `astro:env/server` |
| 模型挂了对话就打不开 | 点击监听写在模型加载成功之后 | 把入口监听提到加载之前 |

最后一条如果没发现，等到哪天 CDN 抽风，访客看到的就是「左下角一行报错，对话框打不开」——所以强烈建议加上。

## 小结

整条链路其实是三段独立的活：

1. **做模型**——PSD 分层和命名决定上限，导出参数权衡体积与精度
2. **接入网页**——核心就一句「量真实轮廓再摆位置」，其余是调细节
3. **接 AI**——关键是把密钥挡在服务端，别写进前端

比想象中简单。真正的门槛还是在第一步的原图和分层质量，代码部分工具已经帮你做完大半了。

如果只想先跑起来看效果，完全可以跳过 AI 那节，第二节加载完就已经有个会跟鼠标的看板娘了。
