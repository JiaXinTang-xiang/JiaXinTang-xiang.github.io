---
title: 'Ubuntu 22.04 安装搜狗输入法'
description: '记录在 Ubuntu 22.04 上安装和配置搜狗输入法的完整过程'
publishDate: '2026-06-14'
slug: 'tools/sogou-install'
updatedDate: '2026-06-14'
tags:
  - Ubuntu
  - Linux
  - 输入法
language: 'Chinese'
draft: false
heroImage: { src: './images/sogou_install/cover.jpg', color: '#4A90E2' }
---

## 前言
本文记录在 Ubuntu 22.04 上安装搜狗输入法的完整过程。另外读者要注意ubuntu不同版本会存在兼容性问题。Ubuntu 自带的中文输入法体验很一般，词库和联想功能都比较弱。搜狗输入法在中文输入的词库丰富性和智能联想上有明显优势，适合需要频繁输入中文的用户。简单记录一下。

## 安装步骤

### 1. 下载搜狗输入法

前往 [搜狗输入法官网](https://shurufa.sogou.com/linux) 下载 Linux 版本，选择 x86_64 的 deb 包。

### 2. 安装 fcitx 框架

搜狗输入法依赖 fcitx（4.x）输入法框架，需要先安装：

```bash
sudo apt update
sudo apt install fcitx
```

### 3. 安装搜狗输入法

切换到下载目录，执行：

```bash
sudo dpkg -i sogoupinyin_4.2.1.145_amd64.deb
```

如果报依赖错误，修复一下：

```bash
sudo apt --fix-broken install -y
```

### 4. 安装依赖包

```bash
sudo apt install libqt5qml5 libqt5quick5 libqt5quickwidgets5 qml-module-qtquick2
sudo apt install libgsettings-qt1
```

### 5. 设置 fcitx 为默认输入法框架

```bash
im-config -n fcitx
```

### 6. 设置 fcitx 开机自启

```bash
sudo cp /usr/share/applications/fcitx.desktop /etc/xdg/autostart/
```

### 7. 卸载 ibus（可选）

ibus 是 Ubuntu 默认的输入法框架，卸载可以避免冲突：

```bash
sudo apt purge ibus
```

### 8. 重启电脑

```bash
sudo reboot
```

## 配置输入法

重启后，运行 fcitx 配置工具：

```bash
fcitx-configtool
```

在弹出的窗口中点击 **"添加输入法"**，搜索 **"sogou"** 或 **"fcitx-sogoupinyin"**，添加进去。

添加完成后，用 `Ctrl+Space` 切换中英文输入。

## 搜狗个性化设置

如果需要进入搜狗输入法的个性化设置界面，运行：

```bash
/opt/sogoupinyin/files/bin/sogoupinyin-configtool
```

## 注意事项

- 搜狗输入法只支持 fcitx（4.x），不支持 fcitx5。如果系统装了 fcitx5，需要先卸载：`sudo apt remove fcitx5`
- Ubuntu 24.04 存在兼容性问题，建议使用 22.04
- 不要随意升级系统内核，可能导致输入法无法正常工作
- 如果安装后找不到搜狗，检查是否切换到了 fcitx 框架而非 fcitx5

## 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Space` | 切换中英文 |
| `Shift` | 临时切换中英文 |
| `Ctrl+Shift+F` | 简繁切换 |
| `Ctrl+.` | 中英文标点切换 |


## 总结

对于需要频繁使用中文输入的用户来说，默认输入法的词库和联想功能无法满足需求，换了个人感觉搜狗输入法打字舒服很多，用Ubuntu自带的拼音打字很不舒服，影响效率，有时候1个字都要找好久。总体来说换完搜狗输入法体验感还是很好的。


参考：
- [Ubuntu 22.04上稳定安装与配置搜狗输入法详细教程](https://blog.csdn.net/qq_32892383/article/details/141458781)
- [Ubuntu安装搜狗输入法](https://blog.csdn.net/qq_44684757/article/details/135991216)
