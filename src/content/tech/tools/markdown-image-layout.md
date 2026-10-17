---
title: 'Markdown 写作与高级样式实用教程'
description: '从基础语法到图片尺寸、对齐、多图网格、表格、提示框、折叠内容和任务列表，整理一套可以直接复制的 Markdown 写作模板。'
publishDate: '2026-10-17'
tags:
  - Markdown
  - 博客
  - 写作技巧
language: 'Chinese'
draft: true
rss: false
slug: 'tools/markdown-image-layout'
heroImage: { src: './images/markdown-image-layout/demo-cover.jpg', color: '#24292e' }
---

## 前言

Markdown 的基础语法很简单，但真正写博客时，常常还会遇到图片大小、图片对齐、多图并列、表格美化、提示框和折叠内容等问题。本文把常用写法集中整理在一起，代码可以直接复制到文章中，再替换文字和图片路径即可。

本文会区分三种写法：

- **标准 Markdown**：跨平台最稳定；
- **Markdown 扩展**：某些编辑器支持，换平台前要测试；
- **HTML/CSS**：控制能力最强，适合本站这种自建博客。

这篇文章使用《Ubuntu 常用命令大全》的封面作为演示图片。相同图片重复出现只是为了展示排版效果，实际写作时换成自己的图片即可。

## 一、Markdown 基础语法

### 1. 标题

```markdown
# 一级标题
## 二级标题
### 三级标题
```

正文中建议从 `##` 开始写，因为文章标题已经由 frontmatter 的 `title` 生成。

### 2. 强调、删除线和行内代码

```markdown
**加粗文字**

*斜体文字*

~~删除线文字~~

使用 `npm run build` 构建项目。
```

效果：**加粗文字**、*斜体文字*、~~删除线文字~~，以及 `npm run build`。

### 3. 链接

```markdown
[Astro 官方文档](https://astro.build/)
```

效果：[Astro 官方文档](https://astro.build/)。

### 4. 列表

```markdown
- 无序列表项目一
- 无序列表项目二

1. 有序列表第一步
2. 有序列表第二步
```

效果：

- 无序列表项目一
- 无序列表项目二

1. 有序列表第一步
2. 有序列表第二步

### 5. 引用、分隔线和代码块

````markdown
> 这是一段引用，适合记录结论或摘录。

---

```bash
sudo apt update
sudo apt install git
```
````

代码块的语言标记可以使用 `bash`、`python`、`javascript`、`json`、`yaml` 等，本站会自动进行语法高亮。

### 6. 表格

```markdown
| 命令 | 作用 |
| --- | --- |
| `pwd` | 显示当前目录 |
| `ls` | 查看目录内容 |
```

效果：

| 命令 | 作用 |
| --- | --- |
| `pwd` | 显示当前目录 |
| `ls` | 查看目录内容 |

表格对齐方式也可以设置：

```markdown
| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| 文本 | 文本 | 文本 |
```

### 7. 任务列表

任务列表属于 GFM 扩展，当前博客支持：

```markdown
- [x] 整理文章结构
- [ ] 补充图片
- [ ] 发布文章
```

效果：

- [x] 整理文章结构
- [ ] 补充图片
- [ ] 发布文章

## 二、图片文件和路径

### 1. 推荐的目录结构

一篇文章的图片放在文章目录下独立的文件夹中：

```text
src/content/tech/tools/
├── markdown-image-layout.md
└── images/
    └── markdown-image-layout/
        ├── demo-cover.jpg
        ├── step-01.png
        └── step-02.png
```

正文使用相对路径：

```markdown
![图片说明](images/markdown-image-layout/demo-cover.jpg)
```

不要写电脑上的绝对路径：

```text
D:/Pictures/demo.jpg
/home/user/Pictures/demo.jpg
```

绝对路径只在自己的电脑上有效，换电脑或发布到网站后就会失效。

### 2. 文件命名建议

图片文件名建议使用小写英文、数字、连字符或下划线，例如：

```text
cover.jpg
install-step-01.png
config_before.png
```

尽量避免空格、中文、括号和特殊字符。文件名越简单，不同编辑器、GitHub、PDF 导出工具之间越不容易出现路径问题。

## 三、最基本的图片写法

### 1. 标准 Markdown 图片

```markdown
![Ubuntu 常用命令文章封面](images/markdown-image-layout/demo-cover.jpg)
```

效果：

![Ubuntu 常用命令文章封面](images/markdown-image-layout/demo-cover.jpg)

这里的 `alt` 是替代文字，用于图片加载失败、无障碍阅读和搜索引擎理解图片内容。它不是鼠标悬停提示。

### 2. 图片说明

如果需要写更完整的图注，可以使用 `figure` 和 `figcaption`：

```html
<figure>
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    width="720"
    alt="Ubuntu 常用命令文章封面"
  />
  <figcaption>图 1：Ubuntu 常用命令大全的文章封面。</figcaption>
</figure>
```

也可以直接在 Markdown 图片下面写一行文字：

```markdown
![Ubuntu 常用命令文章封面](images/markdown-image-layout/demo-cover.jpg)

*图 1：Ubuntu 常用命令大全的文章封面。*
```

当前博客会为单独成段的 Markdown 图片自动生成 `figure` 和图注，图注内容来自 `alt`。因此同一张图不需要同时写两套说明，以免重复。

### 3. 鼠标悬停提示

`alt` 不会产生鼠标提示。需要提示文字时可以增加 `title`：

```html
<img
  class="zoomable"
  src="images/markdown-image-layout/demo-cover.jpg"
  alt="Ubuntu 常用命令文章封面"
  title="点击图片可以放大"
/>
```

`alt` 和 `title` 的用途不同：`alt` 是图片的替代描述，`title` 是浏览器可能显示的悬停提示。

## 四、图片大小和缩放

### 1. Markdown 扩展写法：`=200x`

本站支持在图片路径末尾加尺寸参数来快速调整大小，等号前需要有一个空格：

```markdown
![示例图片](images/example.png =200x)
![示例图片](images/example.png =200x300)
![示例图片](images/example.png =x300)
![示例图片](images/example.png =300px)
```

含义如下：

| 写法 | 含义 |
| --- | --- |
| `=200x` | 宽度为 200px，高度按比例缩放 |
| `=200x300` | 宽度 200px，高度 300px |
| `=x300` | 高度上限为 300px，宽度按比例缩放；窄屏时整体缩小 |
| `=300px` | 本站的高度简写，与 `=x300` 相同 |

例如只指定高度 120px，宽度会自动按原比例缩小：

![封面缩到 120px 高](images/markdown-image-layout/demo-cover.jpg =x120)

> 这是本站通过自定义解析器支持的扩展语法，不是标准 Markdown。GitHub、Typora 等平台可能不会生效，写跨平台文章时建议改用下面的 HTML 写法。

### 2. HTML 设置固定宽度

HTML 是控制图片大小更稳定的方式：

```html
<img
  class="zoomable"
  src="images/markdown-image-layout/demo-cover.jpg"
  width="720"
  alt="Ubuntu 常用命令文章封面"
/>
```

只设置 `width` 时，高度一般会按原图比例显示。也可以用 CSS：

```html
<img
  class="zoomable"
  src="images/markdown-image-layout/demo-cover.jpg"
  style="width: 60%; max-width: 100%; height: auto;"
  alt="Ubuntu 常用命令文章封面"
/>
```

效果：

<p style="text-align: center;">
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    style="width: 60%; max-width: 100%; height: auto;"
    alt="Ubuntu 常用命令文章封面"
  />
</p>

其中：

- `width: 60%`：图片宽度占正文区域的 60%；
- `max-width: 100%`：防止图片超出手机屏幕；
- `height: auto`：保持原始比例。

### 3. 同时设置宽度和高度

```html
<img
  class="zoomable"
  src="images/markdown-image-layout/demo-cover.jpg"
  width="720"
  height="438"
  alt="Ubuntu 常用命令文章封面"
/>
```

宽高比例不一致时图片会变形，因此只有在明确知道原图比例，或者确实需要裁剪时才同时指定两者。普通截图更建议只设置宽度。

不建议使用下面这些写法：

```html
<img src="images/example.png" width="200x" />
<img src="images/example.png" style="zoom: 20%;" />
```

`width="200x"` 不是规范的 HTML 属性值，`zoom` 也可能影响页面布局和图片点击放大。

## 五、图片位置和对齐

### 1. 居中

推荐使用包裹元素控制对齐：

```html
<p style="text-align: center;">
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    width="600"
    alt="Ubuntu 常用命令文章封面"
  />
</p>
```

也可以使用旧式写法：

```html
<p align="center">
  <img class="zoomable" src="images/example.png" width="600" alt="示例图片" />
</p>
```

`<center>` 在不少平台仍然有效，但已经是旧式 HTML，不建议作为新文章的默认写法。

### 2. 右对齐

```html
<p style="text-align: right;">
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    width="400"
    alt="Ubuntu 常用命令文章封面"
  />
</p>
```

### 3. `align="left"` 的区别

```html
<img
  class="zoomable"
  src="images/example.png"
  width="320"
  align="left"
  alt="示例图片"
/>
```

`align="left"` 主要会产生图文环绕效果，后面的文字可能绕在图片旁边。它不适合普通的“图片单独占一行”排版，也容易影响后续段落。需要图片单独居中或右对齐时，应使用外层 `<p>` 或 `<div>`。

### 4. `#pic_center` 为什么没有效果

```markdown
![图片](images/example.png#pic_center)
```

`#pic_center` 是某些博客平台自定义识别的片段标记，不是 Markdown 标准语法。Astro、GitHub 等渲染器不会自动把它转换成居中样式，所以在本站没有效果。对齐请使用 HTML 或 CSS。

## 六、两图、三图和相册

### 1. Markdown 表格：兼容性最好

需要图片说明时，表格最直接：

```markdown
| 安装前 | 安装后 |
| --- | --- |
| ![安装前](images/article/before.png) | ![安装后](images/article/after.png) |
| 修改前的界面 | 修改后的界面 |
```

三张图：

```markdown
| 第一步 | 第二步 | 第三步 |
| --- | --- | --- |
| ![步骤一](images/article/step-01.png) | ![步骤二](images/article/step-02.png) | ![步骤三](images/article/step-03.png) |
| 打开设置 | 修改参数 | 保存结果 |
```

适合发布到多个平台、做前后对比和展示操作步骤。图片比例差异很大时，不要为了并列而强行压缩。

### 2. 两图、三图：整排等高

本站保留 `markdown-image-grid` 这套 class 名，内部使用 Flex 布局。图片宽度按原比例计算，不占等宽格子、不裁剪，也不在图片内部填充空白。只修改外层的 `--img-h`，就能调整整组图片高度。

```html
<div class="markdown-image-grid markdown-image-grid--2" style="--img-h: 220px;">
  <img class="zoomable" src="images/article/step-01.png" alt="步骤一" />
  <img class="zoomable" src="images/article/step-02.png" alt="步骤二" />
</div>
```

三图一排：

```html
<div class="markdown-image-grid markdown-image-grid--3" style="--img-h: 200px;">
  <img class="zoomable" src="images/article/step-01.png" alt="步骤一" />
  <img class="zoomable" src="images/article/step-02.png" alt="步骤二" />
  <img class="zoomable" src="images/article/step-03.png" alt="步骤三" />
</div>
```

两图模板放两张，三图模板放三张。屏幕较窄、整排放不下时，所有图片会一起缩小到相同高度，保持一排。`--img-h` 是希望显示的高度上限，不会为了达到它而撑破页面。手写 HTML 图片保留 `class="zoomable"`，就能点击放大。

例如想把这一组改成 120px 高，只改一个数字：

```html
<div class="markdown-image-grid markdown-image-grid--3" style="--img-h: 120px;">
  <img class="zoomable" src="images/article/step-01.png" alt="步骤一" />
  <img class="zoomable" src="images/article/step-02.png" alt="步骤二" />
  <img class="zoomable" src="images/article/step-03.png" alt="步骤三" />
</div>
```

### 3. 相册模板

```html
<div class="markdown-image-grid markdown-image-grid--gallery" style="--img-h: 200px;">
  <figure>
    <img class="zoomable" src="images/gallery/photo-01.jpg" alt="照片一" />
    <figcaption>照片一</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="images/gallery/photo-02.jpg" alt="照片二" />
    <figcaption>照片二</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="images/gallery/photo-03.jpg" alt="照片三" />
    <figcaption>照片三</figcaption>
  </figure>
</div>
```

相册不固定每行张数：横图宽一些、竖图窄一些，当前行放不下下一张就换行。同一相册内的照片高度一致，最后一行保持自然宽度并居中，不拉伸填满。极窄屏幕放不下最宽的一张时，整个相册统一降低高度。

效果（复用已有文章封面和本月照片，演示横图和竖图的不同宽度）：

<div class="markdown-image-grid markdown-image-grid--2" style="--img-h: 180px;">
  <img class="zoomable" src="../../monthly/picture/26_09/image18.png" alt="车内星空贴纸" />
  <img class="zoomable" src="../../monthly/picture/26_09/image19.png" alt="车内手办" />
</div>

<div class="markdown-image-grid markdown-image-grid--3" style="--img-h: 180px;">
  <img class="zoomable" src="../../monthly/picture/26_09/image6.png" alt="飞机窗外" />
  <img class="zoomable" src="../../monthly/picture/26_09/image15.png" alt="飞机座位" />
  <img class="zoomable" src="../../monthly/picture/26_09/image16.png" alt="飞机上的风景" />
</div>

<div class="markdown-image-grid markdown-image-grid--gallery" style="--img-h: 180px;">
  <figure>
    <img class="zoomable" src="images/markdown-image-layout/demo-cover.jpg" alt="Ubuntu 文章封面" />
    <figcaption>Ubuntu 文章封面</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="../../monthly/picture/26_09/image3.png" alt="苏州竖幅照片" />
    <figcaption>竖幅照片保持原比例，宽度自然变窄。</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="../../monthly/picture/26_09/image2.png" alt="苏州横幅照片" />
    <figcaption>横幅照片宽一些，高度仍然相同。</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="../../monthly/picture/26_09/image4.png" alt="苏州竖幅照片" />
    <figcaption>按可用宽度自动换行。</figcaption>
  </figure>
</div>

## 七、图片样式：圆角、阴影和边框

HTML 的 `style` 可以添加简单效果：

```html
<p style="text-align: center;">
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    style="width: 60%; max-width: 100%; border-radius: 10px; box-shadow: 0 0 10px #b9b9b9;"
    alt="带圆角和阴影的 Ubuntu 封面"
  />
</p>
```

常用 CSS 属性：

| 属性 | 作用 |
| --- | --- |
| `width` | 设置宽度 |
| `height` | 设置高度 |
| `max-width` | 限制最大宽度 |
| `height: auto` | 保持原始比例 |
| `border-radius` | 设置圆角 |
| `box-shadow` | 添加阴影 |
| `border` | 添加边框 |

不要给截图随意设置 `object-fit: cover`，它会裁剪图片内容。只有明确需要统一相册比例时才使用裁剪。

## 八、表格高级样式

### 1. Markdown 表格对齐

```markdown
| 名称 | 年龄 | 职业 |
| :--- | :---: | ---: |
| 张三 | 25 | 工程师 |
| 李四 | 30 | 设计师 |
```

当前博客会统一给 Markdown 表格添加边框、间距、斑马纹和悬停效果，因此通常不需要在每张表格上重复写 CSS。

### 2. HTML 表格

需要自定义表头颜色或精确控制时，可以使用 HTML：

```html
<table style="text-align: center; border-collapse: collapse;" border="1">
  <tr style="background-color: #f2f2f2;">
    <th>模块</th>
    <th>状态</th>
    <th>备注</th>
  </tr>
  <tr>
    <td>登录系统</td>
    <td>✅ 完成</td>
    <td>无异常</td>
  </tr>
  <tr>
    <td>报表中心</td>
    <td>🚧 开发中</td>
    <td>预计本周上线</td>
  </tr>
</table>
```

HTML 表格控制能力更强，但代码更长，跨平台效果也更依赖渲染器。普通数据表优先使用 Markdown 表格。

## 九、彩色文本和标记

### 1. 彩色文本

Markdown 本身没有颜色语法，HTML 可以实现：

```html
<span style="color: green;">✅ 成功</span>
<span style="color: red;">❌ 失败</span>
<span style="color: orange;">⚠️ 警告</span>
```

效果：<span style="color: green;">✅ 成功</span>、<span style="color: red;">❌ 失败</span>、<span style="color: orange;">⚠️ 警告</span>。

### 2. 高亮文字

更通用的 HTML 写法是：

```html
<mark>重点内容</mark>
```

效果：<mark>重点内容</mark>。

有些编辑器支持：

```markdown
==重点内容==
```

但这不是所有 Markdown 渲染器都支持。当前文章中需要稳定显示时，优先使用 `<mark>`。

## 十、引用和提示框

### 1. 普通引用

```markdown
> 这是一段普通引用。
>
> 可以写多行内容。
```

效果：

> 这是一段普通引用。
>
> 可以写多行内容。

### 2. 在引用中使用颜色

```markdown
> 💡 <span style="color: #00bfa5;">提示：</span> 先确认图片路径是否正确。
>
> ⚠️ <span style="color: orange;">警告：</span> 不要使用电脑绝对路径。
```

效果：

> 💡 <span style="color: #00bfa5;">提示：</span> 先确认图片路径是否正确。
>
> ⚠️ <span style="color: orange;">警告：</span> 不要使用电脑绝对路径。

HTML/CSS 可以让提示更醒目，但不建议给每一段普通文字都加颜色。颜色应当表示状态、提醒或重点。

## 十一、折叠内容

`details` 和 `summary` 适合隐藏较长的补充说明、代码或不需要默认展开的内容：

```html
<details>
  <summary>点击展开详细内容</summary>

  这里是隐藏的内容，可以放文字、图片或代码块。
</details>
```

效果：

<details>
  <summary>点击展开详细内容</summary>

  这里是隐藏的内容，可以放文字、图片或代码块。
</details>

折叠内容属于 HTML，现代浏览器支持良好，但部分导出工具可能会默认展开或忽略交互效果。

## 十二、Emoji 和图标

直接输入 Emoji 是最稳定的方式：

```markdown
🔥 热门功能
💻 开发中
📦 模块封装
📈 数据分析
```

效果：

🔥 热门功能  
💻 开发中  
📦 模块封装  
📈 数据分析

GitHub 风格的 Emoji 名称，例如 `:rocket:`、`:warning:`，并不是所有 Markdown 渲染器都支持。为了跨平台，建议直接使用 Unicode Emoji。

常用分类可以这样选择：

| 用途 | Emoji 示例 |
| --- | --- |
| 成功 | ✅ ✔️ ☑️ |
| 失败 | ❌ ✖️ 💥 |
| 提示 | 💡 🤔 🧠 |
| 警告 | ⚠️ ❗ 🚫 |
| 技术 | ⚙️ 🧩 🛠️ |
| 进度 | 🚀 📈 ⏳ |
| 文件 | 📁 📦 📝 |

## 十三、组合排版示例

下面是一段把图片、标题、表格和更新时间组合起来的示例：

```html
<div align="center">
  <h2>📊 项目进度报告</h2>

  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    style="width: 60%; max-width: 100%; border-radius: 8px; box-shadow: 0 0 6px #ccc;"
    alt="项目进度报告示例封面"
  />

  <table style="margin: 1rem auto; text-align: center;" border="1">
    <tr>
      <th>模块</th>
      <th>负责人</th>
      <th>状态</th>
    </tr>
    <tr>
      <td>数据接入</td>
      <td>张三</td>
      <td>✅ 完成</td>
    </tr>
    <tr>
      <td>权限管理</td>
      <td>李四</td>
      <td>🚧 开发中</td>
    </tr>
  </table>

  <p style="color: #666;">更新时间：2026-10-16</p>
</div>
```

实际效果：

<div align="center">
  <h2>📊 项目进度报告</h2>
  <img
    class="zoomable"
    src="images/markdown-image-layout/demo-cover.jpg"
    style="width: 60%; max-width: 100%; border-radius: 8px; box-shadow: 0 0 6px #ccc;"
    alt="项目进度报告示例封面"
  />
  <table style="margin: 1rem auto; text-align: center;" border="1">
    <tr>
      <th>模块</th>
      <th>负责人</th>
      <th>状态</th>
    </tr>
    <tr>
      <td>数据接入</td>
      <td>张三</td>
      <td>✅ 完成</td>
    </tr>
    <tr>
      <td>权限管理</td>
      <td>李四</td>
      <td>🚧 开发中</td>
    </tr>
  </table>
  <p style="color: #666;">更新时间：2026-10-16</p>
</div>

## 十四、当前博客中的图片放大

本站已经启用了 Medium Zoom。标准 Markdown 图片会自动获得点击放大效果：

```markdown
![可以点击放大的图片](images/article/example.png)
```

手写 HTML 图片时，需要增加 `class="zoomable"`：

```html
<img
  class="zoomable"
  src="images/article/example.png"
  alt="可以点击放大的图片"
/>
```

如果忘记这个 class，图片仍然可以显示，但不会进入本站的放大功能。

## 十五、常见问题排查

| 表现 | 常见原因 | 处理方式 |
| --- | --- | --- |
| 图片空白或裂开 | 路径错误、文件不存在 | 从当前 Markdown 文件位置重新检查相对路径 |
| 本地正常，网站异常 | 使用了绝对路径 | 改成相对路径或公开图床 URL |
| GitHub 或 PDF 显示失败 | 文件名包含空格、中文或括号 | 重命名为小写英文和连字符 |
| `#pic_center` 无效 | 平台私有标记 | 改用 HTML/CSS 对齐 |
| `=200x` 没生效 | 等号前漏了空格，或平台不支持 | 本站写 `![图](url =200x)`，跨平台改用 `<img width="200">` |
| 图片变形 | 宽高比例不一致 | 只设置宽度，或使用 `height: auto` |
| 图片超出手机屏幕 | 没有限制最大宽度 | 添加 `max-width: 100%` |
| HTML 图片不能放大 | 缺少 `zoomable` class | 给 `<img>` 增加 `class="zoomable"` |
| 图片模糊 | 原图分辨率太低或压缩过度 | 换更清晰的原图，控制图片体积 |
| 后面的文字绕在图片旁边 | 使用了 `align="left"` 或浮动布局 | 改用外层 `<p>` 控制整行对齐 |

## 十六、最终推荐模板

### 单图

```markdown
![图片说明](images/article/example.png =x300)
```

只改 `300` 就能调整高度，宽度按比例变化，默认居中。也支持 `![图片说明](images/article/example.png =300px)`，其中 `300px` 在本站表示高度。去掉尺寸参数就恢复默认显示。

### 单图 + 宽度 + 居中

```html
<p style="text-align: center;">
  <img
    class="zoomable"
    src="images/article/example.png"
    style="width: 70%; max-width: 100%; height: auto;"
    alt="图片说明"
  />
</p>
```

### 两图并列

```html
<div class="markdown-image-grid markdown-image-grid--2" style="--img-h: 220px;">
  <img class="zoomable" src="images/article/one.png" alt="图片一" />
  <img class="zoomable" src="images/article/two.png" alt="图片二" />
</div>
```

### 三图并列

```html
<div class="markdown-image-grid markdown-image-grid--3" style="--img-h: 200px;">
  <img class="zoomable" src="images/article/one.png" alt="图片一" />
  <img class="zoomable" src="images/article/two.png" alt="图片二" />
  <img class="zoomable" src="images/article/three.png" alt="图片三" />
</div>
```

### 多张全部并列在一排

```html
<div class="markdown-image-grid markdown-image-grid--row" style="--img-h: 200px;">
  <img class="zoomable" src="images/article/one.png" alt="图片一" />
  <img class="zoomable" src="images/article/two.png" alt="图片二" />
  <img class="zoomable" src="images/article/three.png" alt="图片三" />
  <img class="zoomable" src="images/article/four.png" alt="图片四" />
  <img class="zoomable" src="images/article/five.png" alt="图片五" />
</div>
```

`--row` 不限图片张数，所有图片保持一排；放不下时整组统一降低高度。图片越多，每张显示得越小，手机上尤其明显。

这些 class 由本站提供，编辑器自己的 Markdown 预览不一定加载它们。博客效果请通过 `npm run dev` 后的本地网页查看。`=x300`、`=300px` 也属于本站扩展，编辑器预览可能显示为普通文字。

如果编辑器支持 HTML 内联样式，还可以直接写 Flex，并把高度集中在外层设置：

```html
<div class="markdown-image-grid markdown-image-grid--row" style="--img-h: 200px; display: flex; flex-wrap: nowrap; gap: 12px; overflow-x: auto;">
  <img class="zoomable" src="images/article/one.png" alt="图片一" style="flex: 0 0 auto; width: auto; max-width: none; height: var(--image-render-height, var(--img-h)); margin: 0;" />
  <img class="zoomable" src="images/article/two.png" alt="图片二" style="flex: 0 0 auto; width: auto; max-width: none; height: var(--image-render-height, var(--img-h)); margin: 0;" />
</div>
```

本站会统一缩小整排以适应正文宽度；未加载本站脚本的预览会保持指定高度，放不下时横向滚动。预览器如果会过滤 `style`，这套内联写法也不会生效，此时应使用博客本地网页核对效果。

### 相册：自动并列、放不下换行

```html
<div class="markdown-image-grid markdown-image-grid--gallery" style="--img-h: 200px;">
  <figure>
    <img class="zoomable" src="images/article/one.png" alt="图片一" />
    <figcaption>图片一说明</figcaption>
  </figure>
  <figure>
    <img class="zoomable" src="images/article/two.png" alt="图片二" />
    <figcaption>图片二说明</figcaption>
  </figure>
</div>
```

以上多图模板都只改外层的 `--img-h` 数字，例如 `200px` 改成 `260px`。`--2`、`--3` 和 `--row` 保持一排，`--gallery` 自动换行；不同宽高比的图片仍然等高。无需图注时，可以去掉 `figure` 和 `figcaption`，直接放多张 `<img>`。

## 小结

可以按下面的规则选择写法：

| 需求 | 推荐写法 |
| --- | --- |
| 普通图片 | Markdown 图片语法 |
| 只想快速改尺寸 | 本站用 `![图](url =200x)` 或 `=x300`，跨平台改用 HTML |
| 控制大小和对齐 | HTML `<img>` + 外层 `<p>` 或 `<div>` |
| 两图、三图和相册 | 本站等高图片模板，修改 `--img-h` |
| 需要跨平台发布 | Markdown 表格 |
| 需要点击放大 | Markdown 图片，或 HTML 图片加 `class="zoomable"` |
| 需要提示或补充内容 | `<details>`、引用和 `<mark>` |

最重要的原则是：图片使用相对路径，文件名保持简单；标准 Markdown 负责内容，HTML/CSS 负责精确排版，平台扩展语法只在确认兼容后使用。
