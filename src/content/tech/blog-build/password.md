---
title: 'Astro 文章密码保护'
description: '为 Astro 博客添加文章密码保护功能，简单实现内容加密，本文密码为1234'
publishDate: '2026-06-01'
slug: 'blog-build/password'
tags:
  - 文章保护
  - 技术分享
  - Astro
language: 'Chinese'
draft: false
password: '1234'
heroImage: { src: './images/password/cover.jpg', color: '#24292e' }
---

## 前言

有些文章可能包含一些私密内容，或者你只想让特定的人看到。这时候就需要一个密码保护功能。

本文介绍如何为 Astro 博客添加一个轻量级的密码门禁组件。原理很简单：在文章的 frontmatter 中设置密码，前端显示密码输入框，输入正确后才能查看内容。

> **注意**：这是前端比对方案，密码和内容都在 HTML 源码中，适合博客场景。如需更高安全性，需要配合后端服务。

### 为什么选择前端方案？

实现文章加密有两条路：

| 方案 | 前端门禁（本文） | 后端加密 |
|------|-----------------|---------|
| 原理 | JS 隐藏内容，输入密码后显示 | 构建时 AES 加密，前端解密 |
| 安全性 | 低，源码可见 | 高，源码中是密文 |
| 实现复杂度 | 简单，一个组件 | 复杂，需改构建流程 |
| 破坏性 | 无，不改现有组件 | 高，动渲染链路 |
| 依赖 | 无 | 需要加密库 |

选前端方案的理由：

1. **Astro 是静态站点** — 没有后端，真加密需要引入 Edge Function 或 SSR，增加部署复杂度
2. **改动最小** — 只加一个包装组件，不影响现有布局和内容渲染流程
3. **博客场景够用** — 私密文章主要是防止普通访客随意查看，不需要军事级安全
4. **体验好** — 即时响应，不需要等待解密过程

如果你的文章确实包含敏感信息（密码、密钥等），建议直接不要发布，而不是依赖前端加密。

## 实现思路

整体思路分为三步：

1. **扩展 Schema** — 在 content schema 中添加 `password` 字段
2. **创建组件** — 写一个 `PasswordGate.astro` 组件
3. **集成布局** — 在文章布局中包裹组件

### 工作流程

```
文章 frontmatter 设置 password
        ↓
content.config.ts 中的 schema 识别这个字段
        ↓
BlogPost.astro / ContentPost.astro 读取 data.password
        ↓
PasswordGate 组件判断有密码 → 渲染锁定界面
        ↓
不设置 password → 组件直接渲染内容，无任何影响
```

## 第一步：扩展 Content Schema

在 `src/content.config.ts` 中，为需要加密的 collection 添加 `password` 字段：

```ts
schema: ({ image }) =>
  z.object({
    // ... 其他字段
    comment: z.boolean().default(true),
    password: z.string().optional(),  // 新增
    slug: z.string().optional()
  })
```

`password` 是可选的，不设置就不加密，完全不影响现有文章。

## 第二步：创建 PasswordGate 组件

创建 `src/components/PasswordGate.astro`：

```astro
---
interface Props {
  password?: string
}
const { password } = Astro.props
---

{password ? (
  <div class='password-gate'>
    <div class='password-gate__locked' id='password-gate-locked'>
      <div class='password-gate__icon'>🔒</div>
      <p class='password-gate__hint'>本文为加密文章，请输入密码查看</p>
      <div class='password-gate__form'>
        <input
          type='password'
          id='password-gate-input'
          class='password-gate__input'
          placeholder='请输入密码'
          autocomplete='off'
        />
        <button
          id='password-gate-btn'
          class='password-gate__btn'
          type='button'
          data-password={password}
        >
          解锁
        </button>
      </div>
      <p class='password-gate__error' id='password-gate-error'></p>
    </div>
    <div class='password-gate__content' id='password-gate-content' style='display:none;'>
      <slot />
    </div>
  </div>
) : (
  <slot />
)}
```

组件逻辑：

- 有 `password` → 渲染锁定界面，内容隐藏
- 无 `password` → 直接渲染内容

### 客户端验证脚本

```js
<script>
  const btn = document.getElementById('password-gate-btn')
  const input = document.getElementById('password-gate-input')

  if (btn && input) {
    const unlock = () => {
      const pwd = input.value.trim()
      if (!pwd) return
      // 从 data 属性读取密码
      if (pwd === btn.dataset.password) {
        document.getElementById('password-gate-locked').style.display = 'none'
        document.getElementById('password-gate-content').style.display = 'block'
      } else {
        document.getElementById('password-gate-error').textContent = '密码错误'
        input.value = ''
      }
    }

    btn.addEventListener('click', unlock)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock()
    })
  }
</script>
```

密码通过 `data-password` 属性嵌入到按钮中，客户端 JS 读取并比对。

## 第三步：集成到布局

在 `BlogPost.astro` 和 `ContentPost.astro` 中引入组件：

```astro
---
import PasswordGate from '@/components/PasswordGate.astro'
---

<!-- 包裹文章内容 -->
<PasswordGate password={data.password}>
  <slot />
</PasswordGate>
```

这样所有文章都会经过密码检查，没有设置密码的文章正常显示。

## 使用方式

在文章的 frontmatter 中添加 `password` 字段即可：

```yaml
---
title: '私密文章'
password: 'your-password'
---
```

不设置 `password` 的文章完全不受影响，和之前一样正常显示。

## 样式定制

组件使用了 CSS 变量，自动适配深色/浅色主题：

```css
.password-gate__locked {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.password-gate__input {
  border: 1px solid hsl(var(--input));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.password-gate__btn {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

你可以根据自己的主题风格调整这些样式。

## 后记

这个方案实现简单，改动量小，不会破坏现有组件和布局。对于博客来说，这种程度的保护已经够用了。

如果需要更高的安全性，可以考虑：
- 使用 Vercel Edge Function 做服务端验证
- 对文章内容进行 AES 加密
- 结合用户系统做权限控制

但对于个人博客，简单好用才是最重要的。
