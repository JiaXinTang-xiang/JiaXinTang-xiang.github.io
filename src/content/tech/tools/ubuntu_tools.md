---
title: 'Ubuntu 常用工具的下载和使用'
description: '整理 Ubuntu 常用的工具'
publishDate: '2026-06-22'
slug: 'tools/ubuntu-tools'
tags:
  - Ubuntu
  - Docker
  - 工具
language: 'Chinese'
draft: false
heroImage: { src: './images/ubuntu_tools/cover.jpg', color: '#24292e' }
---

## 前言

在 Ubuntu开发过程中，有一些经常需要安装一些常用工具。每次装完都要翻资料，并且最近也装了好几次环境，，整理到一篇里，方便以后查阅。

---

## 一、uv 环境管理工具

uv 是一个用 Rust 编写的 Python 包管理和虚拟环境工具，速度快、体积小。可以把它理解为 **pip + venv + pip-tools 的合体升级版**。

### 安装

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv --version
```

### 管理 Python 版本

```bash
uv python list              # 查看可用版本
uv python install 3.11      # 安装指定版本
```

### 创建与激活虚拟环境

```bash
uv venv .opencv --python 3.10.12
source .opencv/bin/activate
```

### 包管理

```bash
uv pip install opencv-python     # 安装包
uv pip install -r requirements.txt
uv pip uninstall requests        # 卸载包
uv pip freeze > requirements.txt # 导出依赖
```

---

## 二、Miniconda3 安装

Miniconda 是 Anaconda 的精简版，只包含 Python 和 conda 包管理器，体积小、干净。用它来管理不同项目的 Python 版本和虚拟环境，比系统自带的 Python 方便得多。

```bash
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
```

运行后会进入交互式安装向导：
阅读许可协议 → 接受许可条款 → 选择安装路径 → 解压和安装。

接受 Anaconda 的服务条款，执行这两条命令：
```bash
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r
```
接受后，再重新执行之前的创建环境命令：

```
conda create -n xxx python=3.10 -y
```

```
wget 下载脚本 (188MB)
    │
    ▼
bash 运行脚本
    │
    ├── 阅读许可协议 → 输入 yes 接受
    ├── 确认安装路径 → 回车使用默认 (/home/jiaxintang/miniconda3)
    ├── 自动解压 + 安装基础环境 + 下载 140+ 个包
    └── 是否修改 shell 配置？ → 选 no（手动激活）
```

---

## 三、中文输入法

安装 Google 拼音，走 fcitx 框架。

```bash
sudo apt-get install fcitx-googlepinyin -y
```

注意：区别于 sudo apt install ibus-pinyin -y  使用 fcitx-googlepinyin 更好

装完后：

1. 打开 **设置 → Region & Language → Manage Installed Languages**
2. 添加 Chinese（china）语言
3. 键盘输入法系统选择 **fcitx4**
4. 重启系统：`sudo reboot`
5. 点击键盘图标 → 配置 → 选择 Google 拼音和英语
6. 默认快捷键 `Ctrl + 空格` 切换中英文

> 也可以看我之前写的安装搜狗输入法，体验更好。参考[搜狗输入法安装教程](/tech/sogou_install/)。

---

## 四、SCP 文件传输

SCP（Secure Copy）是基于 SSH 的安全文件传输命令，无需额外安装，系统自带，适合在 PC 间传文件。

### 从 PC 上传文件到 Jetson

```bash
scp 本地文件路径 用户名@Jetson的IP:目标路径
```
如
```bash
scp test_scp.txt jiaxintang@192.168.137.94:/home/jiaxintang1/
```
输入密码后即可完成传输。


加 `-r` 参数递归传输目录：

```bash
# 上传文件夹
scp -r ./my_project jiaxintang@192.168.137.94:/home/jiaxintang1/

# 下载文件夹
scp -r jiaxintang@192.168.137.94:/home/jiaxintang1/my_project ./
```

| 参数 | 说明 |
|------|------|
| `-r` | 递归传输整个目录 |
| `-P 端口号` | 指定 SSH 端口（默认 22） |
| `-v` | 显示详细传输过程 |
| `-C` | 传输时压缩数据 |


### 免密传输（配置 SSH 密钥）

每次输密码很麻烦，配置 SSH 密钥后可以免密：

```bash
# 在 PC 上生成密钥（已有则跳过）
ssh-keygen -t ed25519

# 将公钥复制到 Jetson
ssh-copy-id seeed@192.168.137.94
```

之后 SCP 传输就不需要输密码了。

---


## 五、Firefox 浏览器

```bash
sudo apt update
sudo apt install firefox
```

如果 apt 安装后打不开，需要降级 snap：

```bash
cd ~/Downloads/
snap download snapd --revision=24724
sudo snap ack snapd_24724.assert
sudo snap install snapd_24724.snap
sudo snap refresh --hold snapd
```

---

## 六、文本编辑器

### Gedit

Linux 下的图形化文本编辑器，适合习惯 GUI 的用户：

```bash
gedit test.txt
```

### Nano

终端内的轻量编辑器，操作简单，快捷键直接显示在界面底部：

```bash
sudo apt update
sudo apt install nano -y
nano test.txt
```

### Vim

Vim 是 Linux 系统中最经典的命令行文本编辑器，高效、轻量、无需鼠标即可完成编辑，广泛用于服务器和嵌入式开发环境。

在正式介绍 Vim 的基本使用之前，先说明 Vim 的三种工作模式，这是理解 Vim 操作的关键：

- **普通模式（Normal Mode）**：Vim 启动后的默认模式，用于光标移动、删除、复制等操作
- **插入模式（Insert Mode）**：用于输入和编辑文本
- **命令模式（Command Mode）**：用于保存、退出、搜索、替换等操作

**1. 打开文件**

```bash
vim filename
```

若文件不存在则创建新文件，打开后默认进入普通模式。

**2. 进入插入模式**

在普通模式下按 `i` 进入插入模式，即可开始输入文本。

**3. 退出插入模式**

按 `Esc` 返回普通模式。

**4. 保存与退出**

在普通模式下输入 `:` 进入命令模式：
| 命令 | 说明 |
|------|------|
| `:w` | 保存文件 |
| `:q` | 退出 Vim |
| `:wq` | 保存并退出 |
| `:q!` | 不保存强制退出 |

**5. 光标移动（普通模式）**
| 键 | 方向 |
|----|------|
| `h` | 左 |
| `l` | 右 |
| `j` | 下 |
| `k` | 上 |

**6. 删除操作（普通模式）**
| 命令 | 说明 |
|------|------|
| `dd` | 删除当前行 |
| `x` | 删除一个字符 |

**7. 复制与粘贴（普通模式）**
| 命令 | 说明 |
|------|------|
| `yy` | 复制当前行 |
| `p` | 粘贴 |

**8. 查找内容**

按 `/` 输入关键字，回车后向下查找，按 `n` 查找下一个匹配。

---

## 七、Docker

Docker 是轻量级容器化平台，用于将应用及其依赖打包成可移植的容器。

### 安装 Docker CE

```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加阿里云 Docker 仓库 Key
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-ce.gpg

# 添加仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-ce.gpg] \
  https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list

# 安装
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io
docker --version

# 添加免 sudo 权限
sudo usermod -aG docker $USER
newgrp docker
```

### 安装 NVIDIA Container Toolkit（Jetson GPU 支持）

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)

curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 测试 GPU 是否可用
sudo docker run --rm --runtime=nvidia --gpus all --network host ubuntu nvidia-smi
```

### 离线安装 Docker

如果无法使用 Docker 官方 APT 仓库，可以手动下载 deb 包安装。

在 [Docker 官方下载目录](https://download.docker.com/linux/ubuntu/dists/) 中，选择对应 Ubuntu 版本的路径：

| Ubuntu 版本 | 代号 | 路径 |
|---|---|---|
| 20.04 LTS | focal | `dists/focal/pool/stable/` |
| 22.04 LTS | jammy | `dists/jammy/pool/stable/` |
| 24.04 LTS | noble | `dists/noble/pool/stable/` |

进入对应目录后选择架构（amd64 / arm64），下载以下 5 个 deb 文件（版本号保持一致）：

- `containerd.io_<version>_<arch>.deb`
- `docker-ce_<version>_<arch>.deb`
- `docker-ce-cli_<version>_<arch>.deb`
- `docker-buildx-plugin_<version>_<arch>.deb`
- `docker-compose-plugin_<version>_<arch>.deb`

安装：

```bash
sudo dpkg -i ./*.deb
sudo apt -f install    # 修复依赖
```

### Docker 常用命令

**镜像相关：**
| 命令 | 说明 |
|------|------|
| `docker images` | 查看本地镜像 |
| `docker pull <image>:<tag>` | 拉取镜像 |
| `docker rmi <image>` | 删除镜像 |
| `docker commit <id> <name>:<tag>` | 保存容器为新镜像 |

**容器相关：**
| 命令 | 说明 |
|------|------|
| `docker run <image>` | 从镜像启动容器 |
| `docker run -it ubuntu:18.04 /bin/bash` | 交互模式启动 |
| `docker ps` | 查看运行的容器 |
| `docker ps -a` | 查看所有容器 |
| `docker stop <id>` | 停止容器 |
| `docker exec -it <id> /bin/bash` | 进入已有容器 |
| `docker container prune` | 清理停止的容器 |

**其他：**
| 命令 | 说明 |
|------|------|
| `docker info` | 查看详细信息 |
| `docker --version` | 查看版本号 |
| `sudo systemctl status docker` | 查看服务状态 |
| `sudo systemctl start docker` | 手动启动服务 |

---

## 小结

以上是在 Ubuntu / Jetson 开发中比较常用的工具和配置。后面遇到新的好用的工具再回来更新，也欢迎推荐补充。
