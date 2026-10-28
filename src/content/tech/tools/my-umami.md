---
title: '使用 Umami 网站统计'
description: '记录一次从技术选型到实际部署 Umami 的过程。'
publishDate: '2026-10-28'
slug: 'tools/my-umami'
tags:
  - Umami
  - Vercel
  - Supabase
language: 'Chinese'
draft: true
rss: false
heroImage: { src: '.\images\my-umami\cover.png', color: '#4A90E2' }
---
<blockquote style="border-left: 4px solid #4d6bfe; background-color: #f0f4ff; padding: 12px 16px; margin: 16px 0;">

**TL;DR**本次记录搭建选型、配置记录，各位可以参考。注意部署平台和 Umami 版本更新很快，涉及安装命令、连接参数和界面位置时，仍以使用版本的官方文档为准。

</blockquote>

## 前言

博客搭建已经有6个多月了，发了这么多的文章QAQ评论的确少的可怜，虽然说不影响我继续更新，但是内心还是想看看有多少人访问。
之前觉得这些统计之类的东西搭建部署应该很麻烦，构建很多东西，但其实参考网上教程加上ai辅助弄下来很快就构建好使用了。已经把自己主要的几个网站全部加入到统计队列中了，方便直观一目了然，可以查看访问者浏览器，系统，设备，国家，构建历史流量曲线等等。
![alt text](images/my-umami/image.png)


###  Umami 是什么

Umami 是一个开源的网站访问分析工具,是谷歌分析的开源且注重隐私的替代方案,轻量级的 Google Analytics 替代。可以把它理解成一个更轻量、更现代、也更适合个人站和小项目的统计方案。它不依赖那种非常重的后台逻辑，界面也比较清爽，拿来看日常访问数据很舒服。接入后，可以在后台查看页面浏览量、访客、访问来源、国家地区、设备和浏览器等数据，也能对特定按钮或操作记录自定义事件。


### 为什么是 Umami

给博客加统计系统，能选的工具其实不少。我主要想知道有多少人访问、哪些文章比较受欢迎，以及访问来源、设备、地区和浏览器的分布，不需要一开始就配复杂的埋点。相比功能繁多的分析平台，我更想要一个界面干净、数据够看，也能自己管理的数据统计系统，最后选择了 Umami。

部署好以后，在网站中加入一段统计脚本，就可以在后台查看访问趋势和各项数据。一个 Umami 实例也能管理多个网站，每个网站使用各自的 Website ID，博客和其他小项目都能放在一起查看。这些数据能帮助我了解整体访客特征，但不等于识别每个访客的真实身份，或者建立跨网站的个人画像。

#### 不蒜子、Google Analytics 相比:

| 方案 | 主要用途和特点 | 对我这次需求的适用程度 |
| --- | --- | --- |
| 不蒜子 | 接入简单，常用于在页面上展示浏览量、访客数等计数 | 如果只想在博客页脚显示访问数字就很方便；但我还想查看来源、设备、地区和历史趋势 |
| Google Analytics | 功能全面，适合广告效果、转化和复杂用户行为分析，也能与 Google 生态联动 | 能满足需求，但后台和配置需要更多学习，对我目前查看基础访问数据的用途来说偏重 |
| Umami | 开源、界面简洁，提供访问趋势、页面、来源、设备等分析，也支持自部署 | 功能覆盖当前需求，同时能自己选择部署平台和数据库，更符合我的使用习惯 |

不是其他方案不能用。不蒜子更适合轻量展示它本质上更像一个计数器,Google Analytics 更适合需要深入分析和营销联动的场景,用不到这么复杂的；我目前需要的是方便日常查看、还能长期保存和管理数据的统计后台，因此 Umami是最好的选择。

首先是**功能够用，查看直观**。页面浏览量（PV）、访客数（通常称为 UV）、热门页面和访问来源，基本覆盖了个人博客的日常需求。后台的曲线和分类统计，也比只有一个累计数字更方便观察变化。

其次是**开源并支持自部署**。部署在哪里、什么时候更新、是否迁移，以及数据库如何备份，都有自己选择的空间。使用自己管理的数据库，也方便后续导出和保留统计记录。

还有一点是**更容易控制统计范围**。基础统计不需要为了查看流量就启用一套复杂的广告追踪流程，我可以先记录必要的访问事件，再根据实际需求增加功能。

当然，自部署也意味着要自己关注更新、数据库备份和服务可用性，并不会天然比托管服务更稳定。这次使用 Vercel 和 Supabase，底层仍依赖云平台，只是 Umami 项目、数据库和迁移方式由自己管理。

#### 部署方式怎么选

确定使用 Umami 后，还要决定程序和数据库放在哪里。我整理了几种常见方式：

| 方式 | 适合的情况 | 需要关注的地方 |
| --- | --- | --- |
| Zeabur 模板部署 | 想通过现成模板快速启动应用 | 确认模板包含哪些服务，以及平台费用、持久化和备份方式 |
| Vercel + 在线数据库 | 已经使用 GitHub、Vercel，希望沿用源码自动构建的工作流 | 需要单独配置数据库，处理连接池、迁移和版本兼容；这是我本次采用的方案 |
| Docker Compose 自托管 | 已有云服务器、NAS 或家庭服务器，希望统一管理应用和数据库容器 | 需要维护主机、数据卷、网络和数据库备份 |
| 源码手动部署 | 已有 Node.js 运行环境，希望直接管理程序的构建和运行 | 需要自己安装依赖、配置进程管理、域名和 HTTPS，并处理后续升级 |

如果你不想反复纠结，我给一个很直接的建议：想最快跑起来：Zeabur、Vercel、Railway 这类平台型方案更省事,想把数据和服务握在自己手里：Docker Compose 自托管最合适,想完全掌控整个运行环境：源码手动部署也可以,如果是我自己来落地，大概率还是会这样选：
有服务器，优先 Docker Compose 自托管
没空管服务器，又想尽快上线，就选 Vercel 或 Zeabur
只有在我明确想完全掌控运行环境的时候，才会选源码部署
说到底，统计系统这种东西，真正重要的从来不是“它能不能显示几个数字”，而是：
它是不是长期可用、是不是足够稳定、数据是不是最终掌握在你自己手里。
从这个角度看，Umami 依然是很值得折腾的一种选择。

### 零成本部署

本来以为只是给网页加一段脚本，实际搭建时还是要先想清楚官方托管和自部署的区别，再决定运行平台、数据库和域名等等。

网上的教程基本上都是使用docker方式，经常看到推荐 Docker Compose 的文章。它的优点是把应用运行环境和依赖准备好，还可以用一份配置同时启动 Umami 和 PostgreSQL。对于已经有 VPS、NAS 或家庭服务器的人来说比较方便。

官方也是推荐一键docker部署，方便又快速。由于我没有服务器，docker方式不可行。尝试从源码构建。

源码部署也是官方支持的安装方式。区别主要在于谁负责安装依赖、构建程序和运行服务：

| 对比 | Docker Compose | 源码部署到 Vercel |
| --- | --- | --- |
| 需要的运行环境 | 能运行 Docker 的主机 | Vercel 的应用构建和运行环境 |
| 安装依赖 | 通常由镜像构建过程处理 | Vercel 按仓库配置安装并构建 |
| 数据库 | 可以一并运行 PostgreSQL 容器 | 连接 Supabase 等外部数据库 |
| 更新方式 | 更新镜像并重建容器 | 更新 GitHub 源码并重新部署 |
| 维护重点 | 主机、容器、磁盘和数据库备份 | 平台配置、版本兼容、数据库连接和备份 |

之前一度把“Vercel 不能直接运行 Docker Compose”理解成“Vercel 不能部署 Umami”，这个判断不准确。**Vercel 不能直接按 Docker Compose 的方式部署，并不影响使用它支持的 Next.js 源码部署流程。** 具体构建方式仍要和所用 Umami 版本匹配。

于是我直接Fork Umami 官方源码到自己的 GitHub 仓库

需要用到数据库，接下来就是问题，但之前用过Supabase数据库可以白嫖，

Supabase 和 PostgreSQL 不是两种互斥的数据库，这一点刚开始也容易混淆：PostgreSQL 是数据库系统，Supabase 则是提供托管 PostgreSQL 等功能的平台。于是选择 Supabase，就是使用它托管的 PostgreSQL，不是用一种完全不同的数据库替代 PostgreSQL。

对我来说，主要是省去自己安装数据库、维护数据库主机和处理磁盘持久化的工作。Umami 通过 PostgreSQL 连接字符串访问数据库，不需要调用 Supabase 的前端 SDK，也不需要给 Umami 配 Supabase 的公开 API Key。

于是确定了用 **GitHub 保存源码，Vercel 部署 Umami，Supabase 提供 PostgreSQL 数据库**的方案，统计服务使用自己的子域名：[analytics.jiaxin404.top](https://analytics.jiaxin404.top/)。这样零成本搭建方案就确定好了。
。使用 Vercel 运行开源 Umami、使用自己的 Supabase 项目保存数据，同样是在管理自己的 Umami 实例，只是底层服务器仍然由云平台维护。

最终结构

```text
GitHub：my-umami 仓库
    │
    └── Vercel：Umami 独立项目
            │
            ├── 绑定 analytics.jiaxin404.top
            └── 连接 Supabase PostgreSQL

Vercel：JIABlog 博客项目
    │
    └── 访客浏览器加载 Umami 脚本
            └── 向 analytics.jiaxin404.top 发送访问事件
```

## 三、在 Supabase 创建数据库

### 1. 先创建 Organization

<https://supabase.com/>

1. 注册并登录。
2. 点击 New project。
3. 创建项目，例如：
Project name: umami
Database password: 使用 Supabase 自动生成的密码
Region: 尽量选择和 Vercel 接近的区域
4. 创建完成后，进入项目。
5. 点击左侧 Connect。
6. 选择 PostgreSQL 连接字符串。
对于 Vercel 这种无服务器环境，优先尝试 Transaction pooler，一般是 6543 端口：
postgresql://postgres.项目ID:数据库密码@xxxx.pooler.supabase.com:6543/postgres
密码中如果有特殊字符，必须进行 URL 编码。例如：
@ 变成 %40

# 变成 %23

? 变成 %3F
不要把真实数据库密码发到聊天中。
如果使用 Transaction pooler 后出现 Prisma、prepared statement 或连接错误，再改用 Supabase 的 Session pooler，通常是 5432 端口。



## 四、Fork Umami 并导入 Vercel

### 1. Fork 官方仓库

打开 [Umami 官方仓库](https://github.com/umami-software/umami)，点击右上角 **Fork**，复制到自己的 GitHub 账号下。

你现在看到：
Multiple applications detected
请选择：
app · Next.js
不要选择：
packages/mcp · Node.js
配置如下：
Project Name: umami
Root Directory: /
Framework Preset: Next.js
Root Directory 保持仓库根目录，不要填：
packages/mcp
Vercel 仓库中已有 vercel.json，会自动使用 Umami 要求的 pnpm 安装方式。通常不需要手动修改 Build Command。

添加 Vercel 环境变量
添加：
DATABASE_URL=你的Supabase连接字符串
APP_SECRET=随机生成的一长串字符串

## 五、给 Umami 项目配置环境变量


## 七、绑定自己的域名和 HTTPS

### 1. 给 Umami 项目添加域名

在 Vercel 项目中打开：
Settings → Domains → Add
输入：
analytics.jiaxin404.top
Vercel 会显示 DNS 配置要求。
到域名服务商添加 Vercel 要求的记录。常见形式是：
类型：CNAME
主机记录：analytics
记录值：Vercel 提供的目标地址
不要自行猜记录值，以 Vercel 页面显示的为准。



## 八、登录 Umami，创建博客网站

首次安装且数据库初始化正常时，默认账号通常是：

```text
用户名：admin
密码：umami
```
进入后台后，先在账户资料或用户设置里修改默认密码。界面位置可能随版本变化，找到当前账号的修改密码入口即可。
填入：
```text
Settings → Websites → Add website
```
```text
Name：JiaXin Blog
Domain：jiaxin404.top
```


## 九、接入 Astro 博客

我的博客是 Astro 项目，`src/components/BaseHead.astro` 中已经预留了两项配置：

```astro
---
const umamiScriptURL = import.meta.env.PUBLIC_UMAMI_SCRIPT_URL
const umamiWebsiteID = import.meta.env.PUBLIC_UMAMI_WEBSITE_ID
---

{
  umamiScriptURL && umamiWebsiteID && (
    <script
      async
      src={umamiScriptURL}
      data-website-id={umamiWebsiteID}
      data-do-not-track='true'
    />
  )
}
```
Production 环境添加变量，保存后到：

```text
Deployments → Redeploy
```

Astro 静态页面中的这些值会在构建时写入页面。只保存变量、不重新构建，已经上线的 HTML 里不会凭空多出统计脚本。如果还需要本地测试，可在项目根目录的 `.env` 中配置相同的公开变量。数据库密钥不需要放到博客项目中，`.env` 也不要提交到 GitHub。


## 相关链接

- Umami 官网：[umami.is](https://umami.is/)
- Umami 文档：[docs.umami.is](https://docs.umami.is/)
- 官方仓库：[umami-software/umami](https://github.com/umami-software/umami)
- 我的 Fork：[JiaXinTang-xiang/my-umami](https://github.com/JiaXinTang-xiang/my-umami)
- Vercel 控制台：[vercel.com/dashboard](https://vercel.com/dashboard)
- Supabase 控制台：[supabase.com/dashboard](https://supabase.com/dashboard)
- [Umami 官方安装文档](https://docs.umami.is/docs/install)
- [Umami 环境变量说明](https://docs.umami.is/docs/environment-variables)
- [Umami 官方仓库](https://github.com/umami-software/umami)
- [Supabase PostgreSQL 连接说明](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Vercel 环境变量文档](https://vercel.com/docs/environment-variables)
- [本次参考的 Vercel + Supabase 部署文章](https://route360.dev/post/umami-supabase/)
- [我的 Umami 后台](https://analytics.jiaxin404.top/)

## 小结



这次最费时间的其实不是加统计脚本，而是分清每个平台负责什么：GitHub 保存源码，Vercel 运行 Umami，Supabase 托管 PostgreSQL，博客浏览器通过脚本发送事件。

对我这种没有额外服务器、已经使用 GitHub 和 Vercel 管理博客的情况，这套方案比较顺手。代价是需要自己处理版本更新、连接配置和数据库维护，不能把官方托管版的省心也一并算进去。

后面先观察实际统计情况，再继续精简这篇记录、补充截图和维护经验。
