---
title: 'Git的常见使用'
description: '介绍一些常见的git命令'
publishDate: '2026-04-28'
slug: 'tools/use-git'
tags: ['git', '学习']
draft: false
heroImage: { src: './images/use-git/cover.jpg', color: '#1b2229' }
---


## 前言

本篇内容写作的初衷，是记录下平常git的使用操作。帮助 Git 初学者，了解关于 Git 的大多数的基本操作的，正常的 git clone 之后的add, commit, push 操作对于个人开发已经够用了。但是遇到了更加复杂的需求，难免会束手无策。


## 初始化 Github SSH

Github 更新后，Github 的不支持使用账号密码的身份验证，转为了使用个人访问令牌或者 SSH 的方式，使用 SSH 是非常方便的解决。SSH 生效的原理是，在本地生成的公钥私钥对，其中的公钥被上传至 Github，而在 SSH 之后，本地与 Github 建立安全连接，从而进行相关的操作。

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

根据提示点击即可

```bash
cat ~/.ssh/id_rsa.pub
```

这里查看密钥，复制到github上面就行了。Ctrl + H显示隐藏文件

​
## 常用小连招

### 1. 基础工作流

```bash
# 1. 先拉取远程最新代码，避免冲突
git pull
# 2. 本地修改代码
git add .
git commit -m "本次修改描述"
# 3. 推送到远程仓库
git push
```

### 2. 完整命令集合

```bash
# 1. 配置身份（只做一次）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 2. 初始化 / 克隆
git init          # 新建仓库
git clone 地址     # 拉别人仓库

# 3. 日常三件套（最常用）
git status        # 看改了啥
git add .         # 加到暂存区
git commit -m "说明"  # 提交到本地

# 4. 远程同步
git push          # 上传
git pull          # 下载

# 5. 看历史
git log --oneline
```

## 创建仓库

### 方式一：git init —— 从零创建本地仓库

```bash
git init
git remote add origin 远程仓库地址  # 关联远程仓库
```

### 方式二：git clone —— 克隆已有远程仓库

已经有本地项目，还没有远程仓库，要关联到 GitHub/Gitee。如

```bash
git clone https://github.com/用户名/仓库名.git
```

自己的远程仓库已经创建好，换电脑时直接克隆下来。参与开源项目，需要把别人的代码拉到本地修改。每次记得更新一下，在开始加内容

```bash
git pull   # 拉取当前分支对应的远程分支
git pull origin main  # 明确拉取远程叫 origin 的 main 分支，不管你当前在哪个分支，都强行拉 main
```



## 一些可能用的命令

```bash
git status # 查看仓库状态
git log    # 查看提交历史
git diff   # 默认对比：工作区 VS 暂存区

```

`.`代表当前目录下全部添加，也可以特指文件



## 撤销提交

```bash
git reset --soft   # 不碰暂存区和工作区
git reset --mixed  # 清空暂存区
git checkout -- <file>  # 撤销工作区修改
git reset HEAD <file>   # 撤销暂存区文件
git checkout <commit_id> -- <file_path>  # 恢复误删的文件
```



## 分支管理

| 操作 | 命令 | 说明 |
|------|------|------|
| 查看本地分支列表 | `git branch` | 带*标记的是当前所在分支 |
| 创建新分支 | `git branch branch-name` | 仅创建，不会自动切换 |
| 切换分支（旧语法） | `git checkout branch-name` | 传统切换命令 |
| 切换分支（官方推荐新语法） | `git switch branch-name` | 语义清晰、不易出错 |
| 合并指定分支到当前分支 | `git merge branch-name` | 将目标分支代码合并进来 |
| 安全删除已合并分支 | `git branch -d branch-name` | 防止误删未合并代码 |
| 强制删除未合并分支 | `git branch -D branch-name` | 丢弃该分支所有未合并改动 |


```bash
git branch branch-name   # 创建新分支
git switch branch-name   # 切换分支，checkout也可以切换
```

### 无冲突合并

```bash
git merge branch-name    # 合并指定分支到当前分支
git merge --abort        # 放弃合并、回退操作
```

### 有冲突合并

```bash
git branch -d branch-name   # 安全删除已合并分支
```


## .gitignore文件

.gitignore 是 Git 仓库里的一个忽略配置文件，就是告诉 Git：哪些文件 / 文件夹不需要纳入版本管理、不会被提交到远程仓库。

```
文件名      # 忽略某个文件
文件夹/     # 忽略整个文件夹
*.后缀      # 忽略所有该后缀的文件
!文件       # 不忽略这个文件（例外）
```

```
# 忽略所有日志文件
*.log

# 忽略所有class编译文件
*.class

# 忽略.env环境配置
.env

# 忽略整个target缓存目录
target/

# 递归忽略所有文件夹下的tmp文件
**/*.tmp

# 例外：不忽略config目录下的保留文件
!config/keep.ini


```

## 放弃弃当前 Github 仓库分支并更新 main 分支#

对于部分的仓库的重构需求，例如需要将本仓库的完全的重建，同时出于保险起见，还需要将之前的分支进行备份，也就是将其置入一个废弃分支。

首先先备份当前的分支：
```
git checkout main
git checkout -b deprecated-main
git push origin deprecated-main
```
重建当前的 main 分支：
```
git branch -D main
git checkout --orphan main
git rm -rf .
```
将新的文件添加到当前目录
```
git add .
git commit -m "Rebuild main branch"
```
最后在 push 的时候使用 -f，也就是 force，进行强制推送：
```
git push -f origin main
```
假如说本仓库存在一个 gh-pages 分支，有可能会需要删除这个分支，使用以下指令：
```
git push origin --delete gh-pages
```

## 总结

以上整理了笔者日常开发中使用的 Git 实用技巧，也是仓库维护过程中最常用的基础操作。除此之外，还需要养成良好的使用习惯，例如在修改仓库代码前先执行 git pull 拉取远端更新，以此保证本地与远端仓库内容保持同步一致，还有尽量提交信息写规范，个人敏感信息写进 .gitignore。