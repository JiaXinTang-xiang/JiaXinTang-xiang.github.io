---
title: '从网页到安卓 App'
description: '记录使用 Vue 3、Supabase 与 Capacitor 搭建过程。'
publishDate: '2026-10-03'
slug: 'blog-build/vocab-app'
tags:
  - Vue
  - Vite
  - Supabase
  - Capacitor
  - Android
  - Vercel
  - 英语学习
language: 'Chinese'
draft: false
rss: false
heroImage: { src: './images/vocab-app/cover.jpg', color: '#f48120' }
---

## 前言

最近在朋友的影响下，做了一个面向手机使用的 CET-4 背词应用。最初的想法很简单：把四级单词分成 45 天，每天打开做一组练习单词。

但真正开始使用后，需求很快就不再是“做一个能答题的网页”了。我希望它既能在浏览器里直接打开，也能安装成 Android App；既允许游客立即使用，也能在登录后跨设备同步；还要有每日文章、错词本、真实英语发音、敲单词模式和适合手机操作的导航，后续还想做成一个小程序来使用，想法有点多，后面也是去网上找了一些类似的，发现已经做得很好了，已经没有什么可进步优化空间，但是在朋友的催促下，以及自己对于单词网页部署也有一些兴趣和好奇，还有做一个属于自己的单词库也很好的。

本文记录这次搭建的总体过程。它不是一份只介绍最终代码的教程，而是把选型、重构、失败尝试和后续计划一起保留下来，方便以后继续扩展 CET-6 或其他学习模块。

项目地址：

- 在线网站：[https://en-app.jiaxin404.top/](https://en-app.jiaxin404.top/)
- GitHub：[JiaXinTang-xiang/English-APP](https://github.com/JiaXinTang-xiang/English-APP)


## 一、为什么是Vue

开始时，我让gpt做一个简单的显示单次功能,发现JavaScript页面代码已经很多，并且感觉有点乱,随着功能增加，代码很容易变成“所有事情都放在一个文件里”，不好管理，自己也很难去看懂，去网上搜索了一下发现有Vue框架，Vue的优势不只是语法更现代，而是可以把页面、组件、状态和服务分层管理。

例如
- 页面放在 `src/views/`；
- 公共外壳放在 `src/layouts/`；
- 音频、存储和云同步放在 `src/services/`；
- 学习进度与训练状态放在 `src/stores/learning.js`；
- 路由集中放在 `src/router/index.js`。

这样以后增加 CET-6、词书管理或新的训练模式时，不必再次推翻整个项目。

## 什么是Vue

Vue是一套用于构建用户界面的‌渐进式 JavaScript 框架‌。简单说，它就是帮前端开发者更高效地做出网页和 App 界面的工具。‌
它的核心思路是‌数据驱动‌：你只需要维护数据，Vue 会自动帮你把数据变化同步到页面上，不用再像传统开发那样手动操作 DOM 元素。这解决了页面复杂时“数据和视图同步”的维护难题。目前Vue 3是当前最新主版本，包含Teleport、Suspense、多根元素模板等新特性及非兼容变更，组合式API特性已兼容至Vue 2.7版本。

### 特点
易用

在有HTML，CSS，JavaScript的基础上，快速上手。
Vue.js的API参考了AngularJS、Knockout、Ractive.js、Rivets.js，但对于其他框架的参考不仅是参考，其中也包含了许多Vue.js的独特功能。

灵活

简单小巧的核心，渐进式技术栈，足以应付任何规模的应用。

性能

。。。


## 路线

开始开发前，我收集阅读了一组关于 Vue、Vue Router、Capacitor、Android 构建、Preferences、Supabase 和 Vercel 的资料，了解功能和作用。


| 分类 | 学到的内容 | 在本项目中的用途 |
|------|------------|------------------|
| Vue 3 | 组件、响应式状态、页面拆分 | 把大页面拆成首页、学习、文章和个人中心 |
| Vue Router | 路由、Hash History、页面导航 | 让不同功能拥有独立页面，并兼容静态部署和 Android WebView |
| Capacitor | Web 项目接入原生 Android | 复用 Vue 页面生成 APK |
| Preferences | Android 端持久化数据 | 保存游客进度和音频设置 |
| Supabase | Auth、PostgreSQL、RLS | 邮箱登录、用户数据隔离和多设备同步 |
| Vercel | GitHub 自动构建和环境变量 | 部署网页版本 |
| Cloudflare | DNS 和自定义域名 | 将独立域名指向 Vercel |

因此,最终采用的技术组合Vue 3+ Vite +Capacitor Android，并且用Supabase 保存账号数据、Vercel 负责部署。

这一步不是某一段代码，而是先确认整体架构：前端、数据库、网页部署和 Android 打包并不是四套项目，可以围绕同一份 Vue 代码组合起来。

## 四、 Vue Router 重建框架

重构后的应用不再只有一个页面，而是拆成了多个独立 View：

```text
src/
├── layouts/
│   └── AppShell.vue
├── router/
│   └── index.js
├── services/
│   ├── audio.js
│   ├── cloudSync.js
│   ├── identity.js
│   ├── storage.js
│   └── supabase.js
├── stores/
│   └── learning.js
└── views/
    ├── HomeView.vue
    ├── WordsView.vue
    ├── ArticlesView.vue
    ├── SetupView.vue
    ├── QuizView.vue
    ├── WrongBookView.vue
    ├── StatisticsView.vue
    ├── AccountView.vue
    └── AuthView.vue
```

路由使用 `createWebHashHistory()`。地址中会出现 `#`，视觉上不如普通 History 路由干净，但它对 Vercel 静态页面、PWA 和 Capacitor WebView 更稳，不需要为每个页面额外配置服务器回退规则。

## 七、搭建 Supabase 数据库


### 为什么是  Supabase Cloud

 Supabase是一个开源的后端即服务（BaaS）平台，基于 PostgreSQL 数据库构建，被称为开源版 Firebase‌，以开源关系型数据库PostgreSQL为核心，提供数据库、认证、存储、实时订阅及无服务器函数等集成服务。最重要的是免费，开源使用。由于需要登录、数据库和多设备同步等功能，但自己暂时不想自己维护后端服务器，这个平台刚好满足我的需要。

Supabase Cloud 已经提供：

- 邮箱验证码和密码登录；
- PostgreSQL 数据库；
- JavaScript SDK；
- Row Level Security；
- 可直接供网页调用的 API。

如果自建 Supabase，仍然需要一台长期在线、有公网访问能力的服务器，还要处理升级、备份、HTTPS 和安全问题。对当前阶段来说，Vercel 部署前端、Supabase Cloud 提供后端服务已经够用了。

### 1. 创建项目

在 Supabase Dashboard 创建 Cloud 项目，区域选择离主要用户较近的新加坡。创建完成后，在 API 设置中获取：

- Project URL；
- Publishable key，也就是可以在启用 RLS 后用于浏览器的公开密钥。

前端通过环境变量读取配置：

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

这里不能把 `secret` 或 `service_role` 密钥放进网页环境变量。所有以 `VITE_` 开头的值都会进入前端构建产物，用户能够查看，因此只能使用 Publishable/Anon key，并依靠 RLS 保护数据库。

### 2. 建立数据表

当前使用四张主要表：

| 表名 | 用途 |
|------|------|
| `profiles` | 用户资料与昵称 |
| `word_progress` | 每个单词的正确、错误和错词状态 |
| `day_progress` | 每天的完成时间和复习节点 |
| `user_settings` | 发音、自动播放和键盘音效等设置 |

`word_progress` 使用 `user_id + level + word` 作为联合主键。这样既能区分用户，也提前为 CET-6 等其他词书保留了 `level` 字段。

### 3. 启用 RLS

只使用公开 key 并不代表数据库可以公开读写。真正的数据隔离来自 Row Level Security。每张用户表都启用了 RLS，并限制用户只能访问 `auth.uid()` 与自己 ID 相同的记录。

策略的核心形式如下：

```sql
create policy "word progress own rows"
on public.word_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

执行 SQL 时曾遇到：

```text
policy "profiles own row" for table "profiles" already exists
```

这是因为相同策略已经创建过，又重复执行了 `create policy`。后来在建表脚本中先加入：

```sql
drop policy if exists "profiles own row" on public.profiles;
```

再重新创建策略，使脚本可以重复执行。需要注意，`drop policy` 属于修改数据库对象的操作，Supabase 会提示包含 destructive operations。这里删除的是旧策略并立即按相同目标重建，不是删除学习数据，但执行前仍然应该确认对象名称和作用范围。

## 八、统一网页与 Android 的存储

为了避免业务代码到处判断“现在是网页还是 App”，项目建立了统一的 `storage.js`：

```text
getItem / setItem / removeItem / getJson / setJson
                    ↓
         自动判断当前运行平台
          ↙                    ↘
浏览器 LocalStorage       Capacitor Preferences
```

学习状态只调用统一接口。在 Android 中第一次读取时，如果发现 Preferences 里还没有数据，还会尝试把旧的 LocalStorage 内容迁移过去。

这种封装很重要。以后更换存储实现，或者给某些数据增加加密时，只需要改服务层，不必重写所有页面。

## 九、部署到 Vercel 与绑定域名

网页版本部署在 Vercel。流程为：

1. 将项目推送到 GitHub；
2. 在 Vercel 中导入仓库；
3. 设置构建命令和输出目录；
4. 添加 Supabase 环境变量；
5. 触发部署；
6. 在 Cloudflare 中配置 DNS；
7. 将 `en-app.jiaxin404.top` 绑定到 Vercel 项目。

环境变量中：

- Project URL 属于普通配置，可以选择 Config；
- Publishable key 虽然允许出现在浏览器中，仍可以在 Vercel 中按团队管理习惯保存；
- Secret key 绝不能配置给这个纯前端项目。

部署完成后，GitHub 主分支有新提交时，Vercel 会自动重新构建和发布。这比手动上传 `dist/` 更适合持续开发。


## 十、PWA 与 Android APK

网页端保留了 PWA 能力，包括 manifest、应用图标、Service Worker、安装状态检测和“安装到手机”按钮。支持的 Android 浏览器可以把网页添加到桌面，以接近原生 App 的方式打开。

与此同时，项目还通过 Capacitor 生成真正的 Android 工程。`capacitor.config` 指向 Vite 的 `dist` 目录，构建流程为：

```bash
npm run android:sync
npm run android:apk
```

其中 `android:sync` 会先构建网页，再把产物和原生插件同步到 Android 项目；`android:apk` 最后调用 Gradle 生成 Debug APK。

当前 APK 输出位置为：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Debug APK 可以复制到 Android 手机安装测试。正式发布前还需要生成签名的 Release APK 或 AAB，并进一步测试权限、离线存储、返回键、不同屏幕尺寸和系统版本。

## 十一、重新设计英语发音与反馈音

音频是这次开发中反复调整最多的部分之一。


## 总结

这次开发从“做一个背单词网页”开始，最后涉及了前端框架、移动端适配、本地存储、用户认证、数据库安全、云端部署、PWA、Android 构建和音频兼容。

真正有价值的不只是完成了多少功能，而是逐步形成了一套可以继续扩展的结构：Vue 负责组织应用，统一服务层隔离平台差异，Supabase 保存账号数据，Vercel 和 Cloudflare 负责网页访问，Capacitor 让同一份代码进入 Android。

第一版仍有不少可以优化的地方，但框架已经不再局限于一个四级背词页面。以后加入 CET-6、新词书、新训练方式和更完整的数据分析，都可以在现有结构上继续生长。

## 十二、参考开源项目

[TypeWords](https://typewords.cc) 和
[qwerty-learner](https://github.com/RealKai42/qwerty-learner)。

| 项目 | 地址 | 特点与参考价值 |
|------|------|----------------|
| TypeWords | [官网](https://typewords.cc) · [GitHub](https://github.com/zyronon/TypeWords) | 通过键盘输入背单词、练听写和默写，提供完整的网页产品体验；其沉浸式输入、音频组织和交互反馈值得学习。该项目曾登上 GitHub Trending，并冲到 Vue 分类第一。 |
| qwerty-learner | [GitHub](https://github.com/RealKai42/qwerty-learner) | 将英语学习与键盘练习结合，词书、章节、发音、设置栏和简洁训练界面都很有参考价值。 |
| qwerty-learner-vscode | [GitHub](https://github.com/RealKai42/qwerty-learner-vscode) | qwerty-learner 同一作者开发的 VS Code 版本，可以在编辑器中练习单词，也常被称为“VS Code 摸鱼版”。它展示了同一套学习思路如何迁移到不同载体。 |