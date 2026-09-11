---
title: 'Astro 搭建 Waline 评论区'
description: '从零搭建 Waline 评论系统，支持邮件提醒'
publishDate: '2026-05-30'
updatedDate: '2026-05-30'
tags:
  - 博客
  - 技术分享
  - Astro
language: 'Chinese'
draft: false
slug: 'blog-build/waline-jia'
heroImage: { src: './images/waline_jia/cover.jpg', color: '#24292e' }
---

## 前言

在搭建博客的时候，一个评论系统可以帮助你和读者进行互动。Waline 是一个轻量、功能丰富的评论系统，支持 Markdown、邮件提醒、表情包等功能。

Waline 可以基于多种数据库以及 Vercel 搭建，虽然需要后端，但项目本身做了很好的封装，用户不需要了解任何内容，只需要跟着流程走下来就好。其安装教程为 [官方文档](https://waline.js.org/guide/get-started/)，全部手把手进行即可。

也可以使用 Giscus 作为评论系统，见 [这个教程](https://vitepress.yiov.top/plugin)。

本教程主要是根据官网教程来，这里只是大概步骤，想要搭建的读者看这个教程，自行跳转（[官方文档](https://waline.js.org/guide/get-started/)），建议看 B 站视频有手把手更好。

> **提示**：LeanCloud 已于 2026 年 1 月停止新用户注册，2027 年 1 月将正式关闭服务。本教程推荐使用 [TiDB Cloud](https://tidbcloud.com) 作为替代方案。

## 第一步：创建 TiDB 数据库

Waline 需要一个数据库来存储评论数据。本教程使用 [TiDB Cloud](https://tidbcloud.com)，免费提供 5GB 额度。基于这个 [教程](https://waline.js.org/guide/deploy/tidb.html)。

### 注册并创建实例

1. 访问 [TiDB Cloud](https://tidbcloud.com) 注册登录
2. 登录后会自动创建 TiDB 实例，点击 **cluster0** 进入实例

### 创建数据库表

进入实例后，左侧选择 **SQL Editor**，依次将以下 SQL 语句粘贴并执行（每贴一句点运行按钮 Run 一下或 `Ctrl + Enter`），源码见 [waline.tidb](https://github.com/walinejs/waline/blob/main/assets/waline.tidb)。

```sql
CREATE DATABASE IF NOT EXISTS waline DEFAULT CHARACTER SET utf8mb4;
```

```sql
USE waline;
```

```sql
CREATE TABLE `wl_Comment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commentId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) DEFAULT NULL,
  `comment` text,
  `ip` varchar(100) DEFAULT NULL,
  `userAgent` text,
  `url` varchar(255) DEFAULT NULL,
  `nick` varchar(255) DEFAULT NULL,
  `mail` varchar(255) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `pid` varchar(255) DEFAULT NULL,
  `rid` varchar(255) DEFAULT NULL,
  `sticky` tinyint DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT '',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isAdmin` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `wl_Comment_commentId_index` (`commentId`),
  KEY `wl_Comment_userId_index` (`userId`),
  KEY `wl_Comment_status_index` (`status`),
  KEY `wl_Comment_url_index` (`url`)
);
```

```sql
CREATE TABLE `wl_Counter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) DEFAULT NULL,
  `ip` varchar(100) DEFAULT NULL,
  `url` varchar(255) NOT NULL DEFAULT '',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `times` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `wl_Counter_url_index` (`url`)
);
```

```sql
CREATE TABLE `wl_Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `display_name` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(255) NOT NULL DEFAULT '',
  `type` varchar(50) NOT NULL DEFAULT '',
  `label` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `github` varchar(255) DEFAULT NULL,
  `twitter` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `google` varchar(255) DEFAULT NULL,
  `weibo` varchar(255) DEFAULT NULL,
  `qq` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `2fa` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `wl_Users_email_index` (`email`),
  KEY `wl_Users_display_name_index` (`display_name`)
);
```

### 获取连接信息

1. 点击左侧 **Overview** 进入首页
2. 点击右上角 **Connect** 获取连接信息
3. **Connect with** 选择 **General**
4. 点击 **Reset password** 生成新密码
5. 记住以下信息：`Host`、`Port`、`Database`、`User`、`Password`

## 第二步：部署 Waline 到 Vercel

1. 在 GitHub 上 Fork [Waline 仓库](https://github.com/walinejs/waline)
2. 登录 [Vercel](https://vercel.com)，点击 **Add New → Project**
3. 导入你 Fork 的 Waline 仓库
4. 在 **Environment Variables** 中添加 TiDB 连接信息：

```bash
TIDB_HOST=你的TiDB Host
TIDB_PORT=4000
TIDB_DB=waline
TIDB_USER=你的TiDB User
TIDB_PASSWORD=你的TiDB Password
```

5. 点 **Deploy**，等待部署完成
6. 部署完成后，访问 `https://你的服务地址/ui/` 注册第一个账号（**第一个注册的自动成为管理员**，务必在部署后直接先行登录）

## 第三步：在 Astro 中集成

### 安装客户端库

```bash
npm install @waline/client
```

### 创建 Comment 组件

创建 `src/components/waline/Comment.astro`：

```astro
---
import '@waline/client/style'
const { class: className } = Astro.props
---

<comment-component>
  <div id='waline' class={`not-prose ${className}`}>
    Comment seems to stuck. Try to refresh?✨
  </div>
</comment-component>

<script>
  import { init as walineInit } from '@waline/client'

  const walineConfig = {
    server: 'https://你的waline服务地址.vercel.app',
    emoji: ['weibo', 'alus', 'bilibili', 'qq'],
    additionalConfigs: {
      locale: {
        placeholder: '欢迎留言~(支持Markdown语法)'
      }
    }
  }

  class Comment extends HTMLElement {
    constructor() {
      super()
    }

    connectedCallback() {
      const walineInstance = walineInit({
        el: '#waline',
        serverURL: walineConfig.server,
        reaction: [],
        dark: 'html.dark',
        pageview: true,
        comment: true,
        ...walineConfig.additionalConfigs
      })
      walineInstance?.update()
    }
  }

  customElements.define('comment-component', Comment)
</script>

<style>
  :global(.dark) #waline {
    --waline-bg-color: var(--card-bg);
    --waline-bg-color-light: var(--btn-plain-bg-hover);
  }
  :global(.wl-count) { color: var(--waline-dark-grey); }
  :global(.wl-editor) { padding: 0.35em 0.5em; width: calc(100% - 2em); }
  :global(.wl-edit) { color: var(--waline-dark-grey); }
  :global(#wl-edit)::placeholder { color: var(--waline-dark-grey); }
  :global(.wl-panel) { margin: .5em 0; border: none; }
</style>
```

### 配置 site.config.ts

在 `site.config.ts` 中启用 Waline 并填入你的服务地址：

```ts
waline: {
  enable: true,
  server: 'https://你的waline服务地址.vercel.app',
  showMeta: false,
  emoji: ['bilibili', 'weibo'],
  additionalConfigs: {
    pageview: true,
    comment: true,
    locale: {
      placeholder: '欢迎评论！(留下邮箱可以收到回复通知，无需登录)',
    }
  }
}
```

### 在布局中引入

在需要评论的布局组件中引入 Comment 组件：

```astro
import { Comment } from '@/components/waline'

// 在模板中使用
<Comment class='mt-3 sm:mt-6' />
```

## 第四步：配置邮件提醒

Waline 支持邮件提醒，当有人回复你的评论时会收到邮件通知。参考 [Waline 文档](https://waline.js.org/guide/features/notification.html) 搭建。

在 Waline 的 Vercel 项目中添加环境变量，以 QQ 邮箱为例：

```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=你的QQ邮箱授权码
SMTP_SECURE=TRUE
SITE_NAME=你的博客名
SITE_URL=https://你的博客地址
AUTHOR_EMAIL=你的QQ邮箱@qq.com
```

> **注意**：`SMTP_PASS` 不是 QQ 邮箱密码，需要在 QQ 邮箱 → 设置 → 账户 → 开启 SMTP 服务后生成的**授权码**。

添加环境变量后，重新部署 Waline 项目即可。[我的管理界面 ](https://waline-jiaxin.vercel.app/ui/)

## 后记

以上就是完整的 Waline 集成过程，从 TiDB 数据库创建到邮件提醒配置一共四步。评论系统上线后，读者不需要注册任何账号就可以留言，体验还是比较友好的。

如果在搭建过程中遇到问题，欢迎在评论区留言交流。
