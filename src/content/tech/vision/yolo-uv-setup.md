---
title: '使用 uv 配置 YOLO 环境'
description: '在 Ubuntu 22.04 上使用 uv 安装 PyTorch + Ultralytics YOLO 环境，主要是对应 Jetson Nano 版本，方便后面模型移植部署'
publishDate: '2026-06-02'
tags:
  - YOLO
  - PyTorch
  - uv
  - Jetson
  - Ubuntu
language: 'Chinese'
draft: false                                                          # 是否为草稿
slug: 'vision/yolo-uv-setup'                                          # 文章的 URL 路径。
heroImage: { src: './images/yolo-uv-setup/cover.jpg', color: '#24292e' }
---

## 前言

我的工作流是：**Windows 训练 → Ubuntu 验证 → Jetson Nano 部署**。为了保证模型在三端之间无缝移植，需要在 Ubuntu 上搭建一个和 Jetson 版本对齐的 YOLO 环境。

之前看到的教程大多用 conda，但我最终选择了 **uv**，原因是已经装好了、速度快、不占额外磁盘。实际用下来完全够用，记录一下过程。


## 前置条件：显卡驱动

使用 `nvidia-smi` 检查是否已安装驱动：

```bash
nvidia-smi
```

如果没装，一条命令搞定：

```bash
sudo ubuntu-drivers autoinstall
sudo reboot
```

> 现在PyTorch pip wheel 自带 CUDA runtime，**不需要单独安装 CUDA Toolkit 和 CUDNN**。

## 我的环境信息

| 项目 | 配置 |
|------|------|
| 系统 | Ubuntu 22.04.5 LTS |
| 显卡 | RTX 4050 Laptop (6GB VRAM) |
| 驱动 | NVIDIA 580.142 (已预装) |
| Python | 3.10.12 (系统自带) |
| 包管理 | uv 0.11.17 |
Jetson Nano 端的版本：

| 包 | 版本 |
|------|------|
| Ultralytics | 8.4.38 |
| PyTorch | 2.5.0 |
| TorchVision | 0.20.0 |
| NumPy | 1.23.5 |

## 为什么选 uv 不选 conda

1. **已经装好了**，开箱即用，不需要额外下载 miniconda
2. **速度快**，创建环境和装依赖秒级完成
3. **轻量**，不吃磁盘和内存，conda 基础环境就要占 3-5GB
4. PyTorch 的 pip wheel 已经自带 CUDA runtime，不需要 conda 的二进制管理能力

唯一需要注意的是**网络问题**，国内访问 PyPI 官方源容易超时，换国内镜像源即可解决。


## 安装步骤

### 1. 创建虚拟环境

```bash
mkdir ~/yolo-project && cd ~/yolo-project
uv venv --python 3.10
source .venv/bin/activate
```

激活后终端会出现 `yolo-project` 前缀（工程名字，可自行修改）。

### 2. 安装 PyTorch（对应 Jetson 的 2.5.0）

```bash
uv pip install torch==2.5.0 torchvision==0.20.0 -i https://mirrors.aliyun.com/pypi/simple/
```

> 使用阿里云镜像源，国内下载速度快。也可以用清华源 `https://mirrors.tuna.tsinghua.edu.cn/pypi/simple/`。

### 3. 安装 ultralytics 及其他依赖

```bash
uv pip install ultralytics==8.4.38 numpy==1.23.5 opencv-python-headless -i https://mirrors.aliyun.com/pypi/simple/
```

### 4. 验证环境

```bash
python -c "
import torch, torchvision, ultralytics, numpy as np
print(f'PyTorch: {torch.__version__}')
print(f'TorchVision: {torchvision.__version__}')
print(f'CUDA: {torch.cuda.is_available()}')
print(f'Ultralytics: {ultralytics.__version__}')
print(f'NumPy: {np.__version__}')
"
```

输出类似：

```
PyTorch: 2.5.0+cu124
TorchVision: 0.20.0+cu124
CUDA: True
Ultralytics: 8.4.38
NumPy: 1.23.5
```

`CUDA: True` 表示 GPU 加速可用，环境配置成功。

## 遇到的问题

### 网络超时

首次安装时直接用 PyPI 官方源，下载 PyTorch 的 CUDA 相关包（nvidia-cublas-cu12、nvidia-cudnn-cu12 等）频繁超时。解决方法就是换国内镜像源，一条命令搞定。

### OpenCV 版本冲突

如果需要摄像头实时检测（`cv2.imshow`），需要安装完整版 OpenCV：

```bash
uv pip uninstall opencv-python-headless
uv pip install opencv-python -i https://mirrors.aliyun.com/pypi/simple/
```

`opencv-python-headless` 没有 GUI 功能，无法显示检测窗口。如果只是做推理不需要显示，headless 版本就够了。

## 摄像头实时检测测试

写一个简单的测试脚本验证模型和摄像头：

```python
from ultralytics import YOLO
import cv2

model = YOLO("best.pt")
print(f"类别: {model.names}")
print("按 q 退出")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    results = model(frame, verbose=False)
    annotated = results[0].plot()
    cv2.imshow("YOLO Detection", annotated)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

## 三端版本对齐表

| 包 | Windows 训练 | Ubuntu 验证 | Jetson 部署 |
|----|-------------|------------|------------|
| ultralytics | 8.4.38 | 8.4.38 | 8.4.38 |
| PyTorch | 2.5.0+cu121 | 2.5.0+cu124 | 2.5.0 |
| NumPy | 1.23.5 | 1.23.5 | 1.23.5 |
| 模型格式 | .pt | .pt / .onnx | .onnx / .engine |

## 注意事项

- **版本必须对齐**：训练和推理的 ultralytics 版本要一致，否则模型加载可能报错
- **模型导出格式**：Jetson 上推荐用 ONNX 或 TensorRT，不要直接跑 .pt，推理速度差很多
- **uv 的坑**：用 `uv pip install` 而不是 `pip install`，否则包装到系统目录而不是虚拟环境

## 进阶：安装 CUDA Toolkit（可选）--安装 CUDA 与 CUDNN

PyTorch 自带 CUDA runtime 已经够用，但以下场景需要单独安装：

- 用 TensorRT 做模型加速部署
- 编译自定义 CUDA 算子
- 从源码编译某些依赖 CUDA 的库

### 安装步骤

注意：CUDA 12.1版本根据自己显卡来对应
1. 从 [CUDA 12.1 下载页](https://developer.nvidia.com/cuda-12-1-0-download-archive) 下载 runfile
2. 安装时**取消勾选 Driver**（已经装过了），只安装 CUDA Toolkit：

```bash
sudo sh cuda_12.1.0_530.30.02_linux.run
```

3. 配置环境变量（编辑 `~/.bashrc`）：

```bash
export PATH=/usr/local/cuda-12.1/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda-12.1/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
```

4. 验证：

```bash
nvcc --version
```

### Ubuntu 20.04 兼容性问题

如果在 Ubuntu 20.04 上使用 runfile 安装时可能报错，原因是 g++ 版本过高（默认是 9）。解决方法：
也可以看看[这个链接](https://blog.csdn.net/h3c4lenovo/article/details/119003405)
```bash
sudo apt install g++-7
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-7 100
```

安装完成后再切回来：

```bash
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-9 100
```

## 总结

使用体验：用 uv 配置 YOLO 环境确实比 conda 更轻量快速些。
使用ubuntu系统默认已经有不少计算机基础以及独立搜索解决问题的能力,你需要记住在ubuntu进行操作：永远不要动你的内核，尽量不要动系统组件，否则后果自负。

完结撒花。

