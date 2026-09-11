---
title: 'GitHub 个人主页美化指南'
description: '从零打造个性化的 GitHub 个人主页'
publishDate: '2026-05-15'
updatedDate: '2026-05-19'
tags:
  - 博客
  - 技术分享
language: 'Chinese'
draft: false
slug: 'blog-build/about-me-git'
heroImage: { src: './images/about_me_git/cover.jpg', color: '#24292e' }
---


## 前言

今天花了点时间优化了 GitHub 个人主页，操作也就几步不麻烦，分享记录下来方便以后查阅，也希望对你有帮助。[我的主页](https://github.com/jiaxintang-xiang)。


## 1. 创建同名仓库

新建一个仓库，**仓库名必须和你的 GitHub 用户名完全一致**。比如我的用户名是 `JiaXinTang-Xiang`，仓库名就填 `JiaXinTang-Xiang`。

记得勾选 **Add a README file**，创建成功后 GitHub 会提示这是一个个人主页专属仓库。


## 2. 编辑 README.md 美化主页

用 Markdown 写自我介绍、技能标签、项目展示：

```markdown
# Hi there, I'm JiaXinTang-Xiang 
About Me
你好，我是xxx
欢迎来我的主页~

---

## 🛠️ Tech Stack

- **语言**: Python, TypeScript, C
- **前端**: React, Astro, UnoCSS
- **工具**: VS Code, Neovim, Git, Docker
```

多用 emoji、分割线、链接，让页面整洁好看。


## 3. 常用美化组件

### GitHub 统计卡片

使用 [github-readme-stats](https://github.com/anuraghazra/github-readme-stats)：

```markdown
![GitHub Stats](https://github-readme-stats.vercel.app/api?username=JiaXinTang-Xiang&show_icons=true&theme=transparent)
```

### 常用语言统计

```markdown
![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=JiaXinTang-Xiang&layout=compact&theme=transparent)
```


### 动态活动图

```markdown
![GitHub Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=JiaXinTang-Xiang&theme=github)
```

记得把 `JiaXinTang-Xiang` 换成你自己的 GitHub 用户名。

## 4. 保存生效

提交修改后回到个人首页，刷新即可看到美化效果 ✅


## 5. 制作🐍 贪吃蛇贡献图

原理：用 GitHub Actions 自动生成贪吃蛇 SVG 动画，显示在你的个人首页 README 里。

### 创建配置文件

在你的主页仓库中创建路径 `.github/workflows/snake.yml`，填入以下内容：

```yaml
name: Generate Snake

on:
  schedule:
    - cron: "0 0 * * *"   # 每天 UTC 0 点自动运行
  workflow_dispatch:        # 允许手动触发

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Snake
        uses: Platane/snk@v3
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            dist/github-contribution-grid-snake.svg
            dist/github-contribution-grid-snake-dark.svg?palette=github-dark

      - name: Push to output branch
        uses: crazy-max/ghaction-github-pages@v3
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

提交保存后，进入仓库 **Actions** 标签 → 左侧点击 **Generate Snake** → 右侧 **Run workflow** → **Run workflow**。等约 1 分钟，运行变绿 ✅成功。


###  放到 README.md 显示

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/JiaXinTang-Xiang/JiaXinTang-Xiang/output/github-contribution-grid-snake-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/JiaXinTang-Xiang/JiaXinTang-Xiang/output/github-contribution-grid-snake.svg">
  <img alt="github contribution grid snake" src="https://raw.githubusercontent.com/JiaXinTang-Xiang/JiaXinTang-Xiang/output/github-contribution-grid-snake.svg">
</picture>
```

把 `JiaXinTang-Xiang` 换成你自己的用户名。

### 完成效果

- ☀️ 白天模式：浅色贪吃蛇
- 🌙 黑夜模式：深色贪吃蛇
- ⏰ 每天自动更新，吃掉你的贡献格子 🐍

## 小结

本文，从基础准备到具体组件配置，提供了简单易操作的完整指南，无需复杂技术，新手也能快速上手，轻松打造专属的个性化 GitHub 个人主页。贪吃蛇贡献图看着也是比较好玩，更多的组件感兴趣的朋友可以自行探索。

总之，整个流程梳理下来就是：建同名仓库 → 写 Markdown → 加统计卡片/徽章 → 配 GitHub Actions 贪吃蛇。一个小时就能搞定一个漂亮的个人主页。
