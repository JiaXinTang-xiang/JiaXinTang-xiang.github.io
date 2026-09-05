---
title: 'Codex 安装配置指南'
description: ‘在 Ubuntu 上安装配置 Codex ’
publishDate: '2026-06-20'
tags:
  - Codex
  - CCX
  - CCSwitch
language: 'Chinese'
draft: false
heroImage: { src: './images/Codex_install/cover.jpg', color: '#24292e' }
---

## 前言

Codex 是 OpenAI 推出的 AI 编程工具，有命令行版和桌面版。在国内直接访问 OpenAI API 不太方便，可以通过 CCX 代理接入 DeepSeek 等第三方 API。

整个链路：**Codex Desktop → CCX / CC-Switch → DeepSeek API → DeepSeek 模型**。

本文记录从零安装配置的全过程。

我记录完过程后发现了，ccswith在3.11版本后，可以直接用本地路由就能使用codex了，不需要ccx转都得，可以直接看本文下载codex和ccswith部分，下好这两个软件就能用了。

## 一、CCX API 代理

### 1. 下载二进制

从 [CCX GitHub Releases](https://github.com/BenedictKing/ccx/releases) 下载对应平台的二进制：

```bash
wget https://github.com/BenedictKing/ccx/releases/latest/download/ccx-linux-amd64
chmod +x ccx-linux-amd64
```

### 2. 创建配置文件

在二进制同目录创建 `.env` 文件：

```env
PORT=3688
ENV=production
ENABLE_WEB_UI=true
PROXY_ACCESS_KEY=你的代理访问密钥
ADMIN_ACCESS_KEY=你的管理后台密码
APP_UI_LANGUAGE=zh
LOG_LEVEL=info
REQUEST_TIMEOUT=300000
```

### 3. 启动 CCX

```bash
./ccx-linux-amd64
```

管理界面：[http://localhost:3688](http://localhost:3688)

### 4. 配置渠道

在管理界面添加渠道：

- **渠道类型**：根据上游 API 选择
  - DeepSeek → `Chat Completions`
  - Claude → `Claude Messages`
  - OpenAI → `Chat Completions`
- **Base URL**：`https://api.deepseek.com`（以 DeepSeek 为例）
- **API 密钥**：你的 DeepSeek API Key

### 5. 配置模型映射

在渠道配置中添加模型映射，将 OpenAI 模型名转为上游支持的模型：

```json
{
  "gpt-5.1-codex": "deepseek-v4-pro",
  "gpt-5.4": "deepseek-v4-flash",
  "gpt-5.5": "deepseek-v4-pro",
  "gpt-4o": "deepseek-v4-pro",
  "gpt-4o-mini": "deepseek-v4-flash"
}
```

---

## 二、Codex Desktop 安装

### 1. 克隆仓库

```bash
git clone https://github.com/ilysenko/codex-desktop-linux.git
cd codex-desktop-linux
```

### 2. 下载 Codex DMG

由于网络问题，可能需要手动下载：

```bash
# 使用代理下载
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
wget -c --tries=10 --timeout=60 --no-check-certificate \
  "https://persistent.oaistatic.com/codex-app-prod/Codex.dmg" \
  -O Codex.dmg
```

### 3. 构建安装

```bash
MAX_BUILD_THREADS="0" ./install.sh
# 不加 --fresh，避免删除已下载的 DMG
```

### 4. 启动 Codex Desktop

```bash
cd /home/jiaxintang/CCX/codex-desktop-linux && ./codex-app/start.sh
```

---

## 三、CC-Switch（推荐，可替代 CCX）

CC-Switch 是第三方 API 路由工具。**从 v3.11 版本开始，CC-Switch 内置了本地路由功能，可以直接对接 DeepSeek 等上游 API，不再需要额外架设 CCX。**也就是说，只需要装好 Codex Desktop 和 CC-Switch，配好模型映射就能直接用。

### 1. 安装

```bash
sudo dpkg -i CC-Switch-x.x.x-Linux-x86_64.deb
# 如果报依赖错误
sudo apt --fix-broken install -y
```

### 2. 启动

安装后自动启动，也可手动运行：

```bash
cc-switch
```

### 3. 配置本地路由

在 CC-Switch 界面中：
- 启用本地代理（`enableLocalProxy: true`）
- 添加 DeepSeek 渠道，填入 API Key
- 配置模型映射（将 Codex 的模型名映射到 DeepSeek 的模型名）

> **简化方案**：如果你用的是 CC-Switch v3.11+，可以跳过第一部分（CCX），直接看第二部分（Codex Desktop）和第三部分（CC-Switch），下好这两个软件就能用了。

---

## 四、Codex 配置文件

配置文件位置：`~/.codex/config.toml`

### 使用 CCX 代理

```toml
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "http://localhost:3688"
```

### 使用 CC-Switch 代理

```toml
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "http://127.0.0.1:15721/v1"
```

---

## 五、架构说明

**完整方案（CCX 模式）：**

```
Codex Desktop → CCX → DeepSeek API → DeepSeek 模型
```

**简化方案（CC-Switch v3.11+ 直连模式）：**

```
Codex Desktop → CC-Switch → DeepSeek API → DeepSeek 模型
```

- **Codex Desktop**：客户端，发送 OpenAI Responses API 请求
- **CCX / CC-Switch**：代理层，处理模型映射和协议转换
- **CC-Switch v3.11+ 内置本地路由**，无需再架设 CCX，一步到位
- **DeepSeek**：上游 API 提供商

---

## 六、常见问题

### 端口被占用

```bash
lsof -ti:端口号 | xargs kill -9
```

### 下载超时

```bash
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```

### SSL 错误

```bash
wget --no-check-certificate ...
curl -k ...
```

### 模型名不匹配

在 CCX / CC-Switch 中配置模型映射，将 OpenAI 模型名转为上游支持的模型名。

### 权限问题

```bash
sudo chown -R $USER:$USER ~/Documents
```

### `wire_api` 配置

Codex Desktop 目前只支持 `wire_api = "responses"`，不支持 `"chat"`。

---

## 七、相关链接

- [CCX GitHub](https://github.com/BenedictKing/ccx)
- [Codex Desktop Linux](https://github.com/ilysenko/codex-desktop-linux)
- [CC-Switch](https://github.com/nicepkg/cc-switch)
- [DeepSeek Platform](https://platform.deepseek.com)

## 小结

Codex Desktop + CC-Switch + DeepSeek 这套组合，能覆盖日常 AI 编程需求。

我记录完过程后发现：**CC-Switch 在 v3.11 版本后，内置了本地路由功能，可以直接对接 DeepSeek 等上游 API，不需要再架设 CCX 中转。**所以如果你是新用户，直接看本文的"Codex Desktop"和"CC-Switch"两部分，下好这两个软件，配好模型映射就能用了。省去了装 CCX 的步骤，流程更简单。本文ccx部分先留着吧，后面再说。

