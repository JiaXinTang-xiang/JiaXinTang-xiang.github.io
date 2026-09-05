---
title: '飞书 CLI 安装与使用：让 AI Agent 操作我的知识库'
description: '安装、配置并授权飞书 CLI；从终端使用、权限补充，到飞书知识库和文档的常用操作。'
publishDate: '2026-08-21'
tags:
  - 飞书
  - AI Agent
  - 知识库
language: 'Chinese'
draft: false
slug: 'feishu-cli'
heroImage: { src: './images/feishu_cli/cover.jpg', color: '#1b2229' }
---

## 前言

最近想把自己的知识笔记迁移到飞书里整理整理成一个可以持续维护的知识库。普通的飞书网页当然能完成这件事，但当笔记要反复创建目录、补充章节、查询文档、整理任务时，接入 AI Agent 直接帮我管理和修改，何乐而不为呢。

[飞书 CLI](https://open.feishu.cn/document/no_class/mcp-archive/feishu-cli-installation-guide.md) 就是为这个场景准备的命令行工具。它不是一个独立的桌面软件，也没有需要双击打开的 GUI；它运行在 PowerShell、Windows Terminal 或 CMD 里。完成一次应用配置和用户授权后，因此通过Agent 就可以通过它操作我已经有权限访问的飞书资源。可见[我的知识库](https://jiaxin404.feishu.cn/wiki/V1e8w3kLyiLSAYkflaIcSUJdnpg)

本文以 **Windows** 为例记录完整流程，并整理一些我实际用到的命令。命令和权限会随版本更新，遇到不一致时以[官方文档](https://open.larkoffice.com/document/mcp_open_tools/feishu-cli-let-ai-actually-do-your-work-in-feishu.md)为准。


> 这套工具权限很大：文档、知识库、云盘、日历、消息等都可能被授权。不要把 App Secret、Access Token、设备授权码或带 `user_code` 的授权链接提交到 Git，也不要随意把它们发给别人。

## 一、准备环境

### 1. 安装 Node.js

飞书 CLI 通过 npm 安装，所以先准备 Node.js。建议直接安装 [Node.js LTS](https://nodejs.org/zh-cn/download/) 版本，Windows 下载 `.msi` 后按默认选项安装即可。

重新打开 PowerShell，验证 Node 和 npm：

```powershell
node -v
npm -v
```

能看到版本号就说明环境变量已经生效。若提示“不是内部或外部命令”，一般是终端没有重开，或 Node.js 安装时没有加入 PATH。

> Go 1.23+ 和 Python 3 只在从源码构建相关组件时才需要；直接用 npm 安装 CLI 不需要额外安装它们。

### 2. 打开终端

Windows 里按 `Win + X`，选择 **终端** 或 **PowerShell**；也可以在任意文件夹空白处右键，选择“在终端中打开”。

后面所有 `lark-cli` 命令都在这个窗口里输入。所谓“打开飞书 CLI”，本质上就是打开终端后运行一条 `lark-cli ...` 命令，例如：

```powershell
lark-cli --help
```

它会列出可用能力，并不是打开一个图形界面。

## 二、安装飞书 CLI 和 Skill

在 PowerShell 中执行：

```powershell
# 安装命令行工具
npm install -g @larksuite/cli

# 安装官方 Skill（让 Agent 知道如何正确调用飞书能力）
npx -y skills add https://open.feishu.cn --skill -y
```

第一条安装可执行命令，第二条安装配套的 Agent 技能说明。两条都建议执行，尤其是准备让 Codex、Claude Code 一类 Agent 帮忙操作飞书时。

安装完成后验证：

```powershell
lark-cli version
lark-cli --help
```

如果 `lark-cli` 找不到，先关闭并重新打开终端；仍然不行可检查 npm 的全局目录是否在 PATH：

```powershell
npm prefix -g
```

## 三、配置自己的飞书应用

CLI 需要关联一个飞书开放平台应用，首次使用运行：

```powershell
lark-cli config init --new
```

命令会给出一个浏览器授权/配置链接。打开链接，按页面提示登录飞书、创建或选择应用、确认权限；完成后回到终端等待命令结束即可。
这个步骤配置的是“应用是谁”。后面的登录步骤配置的是“CLI 代表哪位飞书用户操作”，两者缺一不可。


## 四、登录并授权用户身份

### 1. 推荐方式

```powershell
lark-cli auth login --recommend
```

它会根据推荐权限发起登录。终端出现验证链接时，在浏览器打开并确认授权；完成后终端会结束登录流程。

检查登录状态：

```powershell
lark-cli auth status
lark-cli whoami
```

我期望看到的是：

```text
identity: user
tokenStatus: ready / valid
available: true
```

其中 `user` 表示命令会以自己的身份访问自己的文档、知识库和日历；`bot` 则是应用机器人身份，它默认看不到用户个人云盘中的内容。涉及个人资料时，命令后显式加 `--as user` 最稳妥。

```powershell
lark-cli calendar +agenda --as user
```


## 五、常用命令

### 1. 查看帮助

不知道参数时不要猜，直接查看本机当前版本的帮助：

```powershell
lark-cli --help
lark-cli docs --help
lark-cli wiki --help
lark-cli calendar --help
```

每个业务能力会继续有自己的子命令和参数说明。CLI 的功能不少，先从文档、知识库、日历这几个最常用的模块开始就够了。

### 2. 查看日程

```powershell
lark-cli calendar +agenda --as user
```

返回 `"ok": true` 说明调用成功；若 `data` 是空数组，只代表当前查询范围内没有日程，不是登录失败。

### 3. 读取飞书文档

飞书文档链接中一般能找到文档 token。例如文档地址是：

```text
https://xxx.feishu.cn/docx/ABCDefghijk
```

那么 `ABCDefghijk` 就是文档 token。可按关键词读取：

```powershell
lark-cli docs +fetch --doc "ABCDefghijk" --scope keyword --keyword "OpenCV" --detail simple --as user
```

这很适合让 Agent 先看现有文章，再补充指定章节。对包含很多内容的长文，不要一上来整篇覆盖，按章节读取和更新更容易检查、也更不容易误改。

### 4. 给文档追加一个章节

CLI 的文档编辑通常使用飞书 Docx XML。建议把要追加的内容放到当前目录的 XML 文件，再执行追加：

```powershell
lark-cli docs +update `
  --doc "ABCDefghijk" `
  --command append `
  --content "@opencv-chapter.xml" `
  --as user
```

PowerShell 的反引号 `` ` `` 是换行符；嫌麻烦也可以把命令写成一行。XML 里的引号、代码块较多，使用 `@文件名.xml` 比直接在命令行粘贴一大段内容稳定得多。

写入后再查一次关键词验证：

```powershell
lark-cli docs +fetch --doc "ABCDefghijk" --scope keyword --keyword "OpenCV" --detail simple --as user
```

```powershell
lark-cli wiki --help
```

## 六、让 AI Agent 操作飞书

配置好之后，可以直接把目标说清楚。例如：

```text
在我的飞书知识库中新建一个“视觉学习”总文档；
先写前言和 OpenCV 章节，不要覆盖已有内容；
写完后用关键词验证，并把链接发给我。
```

一个可靠的 Agent 工作流应该是：

1. 先读取现有结构和相关文档；
2. 给出或确认修改范围；
3. 小批次写入，优先“追加”而不是整篇覆盖；
4. 写完后读取/关键词检索确认结果；
5. 返回可打开的飞书链接。

删除文档、移动大量节点、改变权限属于高风险操作，应该先让我确认。对于日常写笔记、创建小节，也尽量要求 Agent 使用我的 `user` 身份，以免文档被机器人账号创建，后续权限和归属不好处理。

### 更新

```powershell
lark-cli update
```

它会更新 CLI 以及配套 AI Skills。更新后如遇参数变化，优先运行 `lark-cli --help` 看当前版本的说明。

## 小结

对我来说最好的是把它接给 AI Agent：让 Agent 读已有内容、按章节整理长文，也方便我把知识库迁移到wiki,因为以后打算把这里作为我的知识主阵地，不用担心一些配置问题导致网页构建失败，当然了博客还是会保持更新的，放一些有意思的文章，不至于全部都是知识教程，看着都不想看了。目前wiki还不是很好，后面再慢慢完善吧，毕竟框架搭好了，后续只要写就行。
