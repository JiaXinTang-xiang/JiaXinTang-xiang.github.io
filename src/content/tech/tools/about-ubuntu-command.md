---
title: 'Ubuntu 常用命令大全'
description: '整理日常使用中最常用的 Ubuntu 命令，方便查阅和使用'
publishDate: '2024-04-08'
updatedDate: '2026-04-14'
tags:
  - 博客
  - 技术分享
language: 'Chinese'
draft: false
slug: 'tools/about-ubuntu-command'
heroImage: { src: './images/About-Ubuntu-command/cover.jpg', color: '#24292e' }
---


## 前言

本篇内容写作的初衷，是因为一些指令比较常见，所以写一篇博客记录一下，方便自己回看使用。


## 基础命令

```
df -h /       #查看系统内存使用情况
```

```
！！  # 重复上一级命令
```

```
pwd  # 显示当前工作目录的绝对路径
```

```
ls -al  # 以列表形式显示当前目录的所有文件和目录，包括隐藏的
```

```
cd ..  # 回到当前目录的上一级目录
```

```
cd -   # 回到上一次所在的目录
```

```
cd ~   # 回到当前用户的家目录
cd     # 回到当前用户的家目录
```

```
rm -rf # 强制删除整个文件夹及其内容
```

```
touch filename  # 创建空文件
```

```
cp -r source destination  # 递归复制文件夹
```

```
mv source destination  # 移动或重命名文件
```

```
find . -type f -name "*.conf"  # 在当前目录查找类型为文件(f)的.conf文件
```

```
ifconfig    # 显示网络接口参数（新版本Ubuntu可能需要安装net-tools）
```

```
lsb_release -a   #​ 获取Ubuntu版本号
```

```
arch  # 或者
uname -m  #查看Ubuntu机器的处理器架构
```

```
shutdown  # 关机
```


## 小鱼大佬的一键安装

```
wget http://fishros.com/install -O fishros && . fishros
```

## Git 安装和配置

#### 安装 Git

```
sudo apt install git
```

#### 配置用户信息

```
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### 配置 SSH

```
ssh-keygen -t ed25519 -C "your.email@example.com"
cat ~/.ssh/id_ed25519.pub
```


## Python 清华源配置

直接执行：

```
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```


## 终端工具

```
sudo apt install terminator
```


## 显卡驱动安装

```
sudo apt update
sudo ubuntu-drivers autoinstall
```

```
nvidia-smi
```
cha
```
 sudo dpkg --get-selections | grep linux
```


## 网络代理设置

Linux / Mac 终端

```
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```

Windows PowerShell 

```
$env:http_proxy = "http://127.0.0.1:7890"
$env:https_proxy = "http://127.0.0.1:7890"
```

## 取消代理命令

Linux / Mac 终端

```
unset http_proxy
unset https_proxy
```

Windows PowerShell 

```
Remove-Item Env:http_proxy
Remove-Item Env:https_proxy
```

## 查看当前代理

Linux / Mac 终端

```
echo $http_proxy
echo $https_proxy
```

Windows PowerShell 

```
$env:http_proxy
```


## 图形窗口能显示在桌面
```
export DISPLAY=:0 
```
:0 = 本机第一个桌面显示器


## 安装cutecom
```
sudo apt update
sudo apt install cutecom -y
```
使用cutecom
```
sudo cutecom
```

## Jetson

1.启用MAX功率模式
```
sudo nvpmodel -m 2 # Jetson Orin Nano
```
2.启用Jetson时钟：CPU、GPU内核都以最大频率运行
```
sudo jetson_clocks
```


## 软件包管理

```
sudo dpkg -i package.deb
```

## Windows 时间同步

```
sudo apt install ntpdate
sudo ntpdate time.windows.com
sudo hwclock --localtime --systohc
```

## 下载ssh
```
sudo apt install openssh-server
```
```
systemctl status ssh
systemctl start ssh
systemctl enable ssh
```

## 下载文件树

```
sudo apt-get install tree

```

## 安装 cutecom 串口工具
```
sudo apt update
sudo apt install cutecom -y
sudo cutecom
```
使用 cutecom 点击 open 打开 /dev/ttyTHS1 串口号：在Input输入串口要发送的数据，上面窗口显示 /dev/ttyTHS1 串口发送的数据，下面窗口显示 /dev/ttyTHS1 接收的数据。

## 安装minicom
```
sudo apt-get install minicom
```
安装完成后启动minicom
```
minicom -D /dev/ttyAMA0 -b 9600
```
其中-D表示选择串口/dev/ttyAMA0，-b 设置波特率为9600，此参数可以不用设置，默认115200。


## cmake

安装
```
sudo apt update
sudo apt install cmake
```

一般使用
```
cmake_minimum_required (VERSION 3.10)
project(project3)

# bin 目录下存最后生成的可执行文件
set (EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)

# 将源码文件.cpp的目录保存在SRC_LIST变量
aux_source_directory (src SRC_LIST)

# 指定头文件路径
include_directories(include)

add_executable(main3 ${SRC_LIST})

```

编译
```
mkdir build
cd build
cmake ..
make -j8
```


## 中文语言包安装

```
sudo apt update
sudo apt install language-pack-zh-hans
```


### 中文输入法安装

```
sudo apt install ibus ibus-libpinyin
```


在终端执行以下代码：

```
ibus-setup
```


进入到此界面，在ibus首选项中，点击“输入法”，添加“中文”-“智能拼音”，然后关闭。


### 磁盘管理工具
```
sudo apt install gparted
```
装完运行：

```
sudo gparted
```

## matplotlib

Matlab 是一个常用的数据分析和绘图软件，在 Python 我们也可以使用 matplotlib 库绘制图形。在进行可视化时，我们使用的是 matplotlib.pyplot 子库
```
pip install matplotlib
```


## 安装OpenCV

# Python版
(官网)[https://pypi.org/project/opencv-python/]
```
pip install opencv-python
```
指定版本

```
pip install opencv-python==4.5.x.xx
```

安装完虚拟机之后，就可以正式开始安装 OpenCV 了。

首先，确保系统安装了基本依赖库：

### C++ 版

**必装依赖：**

```bash
sudo apt install git gcc g++ ffmpeg cmake cmake-gui make \
  python3-dev python3-numpy python3-pip \
  libavcodec-dev libavformat-dev libswscale-dev \
  libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev \
  libgtk-3-dev libpng-dev libjpeg-dev libopenexr-dev \
  libtiff-dev libwebp-dev libtbb-dev
```


**（可选）安装 aptitude：**

```bash
sudo apt install aptitude
```

**（可选）安装 Boost 和 Eigen3：**

```bash
sudo apt install libboost-all-dev libeigen3-dev
```

**（可选）安装 Ceres Solver：**

没装成功，待看

```bash
# 安装依赖
sudo apt update
sudo apt install liblapack-dev libsuitesparse-dev \
  libgflags-dev libgoogle-glog-dev libgtest-dev

# 编译安装
git clone https://github.com/ceres-solver/ceres-solver.git
cd ceres-solver
mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
```

**（可选）安装 Qt5：**


```bash
sudo apt install qtbase5-dev qtchooser qt5-qmake qtbase5-dev-tools qtcreator

```

## MiniConda

[Minoconda](https://www.anaconda.com/docs/main)

我使用 MiniConda 来管理 Python 版本、环境。
```
mkdir -p ~/.miniconda3
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/.miniconda3/miniconda.sh
bash ~/.miniconda3/miniconda.sh -b -u -p ~/.miniconda3
rm ~/.miniconda3/miniconda.sh
```


## 串口权限配置

查看

```
ls -la /dev/ttyUSB* /dev/ttyACM*
```


```
 ls -la /dev  # 或者
```


1. 进入udev主目录

```
cd /etc/udev/rules.d/
```


  
这一步是导航到存放udev规则文件的目录，通常自定义的设备规则会放在这里。  
2. 创建并编辑规则文件

```
sudo gedit tty_All.rules
```


```
sudo touch tty_All.rules
```


  
3. 添加设备权限规则  
在打开的tty_All.rules文件中，添加类似以下的规则（根据你的设备实际情况调整KERNEL和GROUP等信息）：

```
KERNEL=="ttyUSB*", MODE="0777", GROUP="dialout"
KERNEL=="ttyACM*", MODE="0777", GROUP="dialout"
KERNEL=="ttyTHS*", MODE="0777", GROUP="dialout"
KERNEL=="tty*", MODE="0777", GROUP="dialout"
```
这个可选，不一定全加，一般1-2个，看你需求加。

设置文件权限

```
sudo chmod 777 tty_All.rules
```


**查看当前用户**

```
whoami 
```


将用户加入dialout组

```
sudo usermod -a -G dialout $USER
```


**重新加载规则**

执行完上述步骤后，

```
sudo udevadm control --reload-rules
sudo udevadm trigger
```


编辑

```
sudo gedit ~/.bashrc
```


设置开机自启动文件

建立并打开一个“.sh”脚本

```
gedit ~/self.sh
```


输入 #! /bin/bash 并保存

添加权限

```
sudo chmod 777 self.sh 
```


使用gnome-session-properties 打开启动应用程序首选项，点击添加进行添加新的启动程序，输入对应的名称，选择文件路径，添加后，每一次开机都会调用

打开启动脚本添加需要的启动命令

```
gnome-terminal -- bash -c "roslaunch xxx.launch;exec bash"
```
结束。


```
echo 欢迎归来，我伟大的主人！您忠诚的,卑微的，谦虚的仆人阿罗德斯应您召唤而来，能追随您的步伐，是我至高无上的荣耀，您终将归于那至高的位置，让整个世界在您的注视下变得平静。
```

## 猫猫
[原始 Mihomo](https://github.com/MetaCubeX/mihomo),[clash-for-lab](https://github.com/SaladDay/clash-for-lab)

[zashboard](https://github.com/Zephyruso/zashboard)

GUI，考虑 [clash-nyanpasu](https://github.com/LibNyanpasu/clash-nyanpasu)
[mihomo-party](https://github.com/mihomo-party-org/clash-party),[FlClash](https://github.com/chen08209/FlClash)我目前用的是这两个
  
## 总结

以上内容总结了部分的笔者在日常使用中经常会用到的 命令，记录下来，方便回看。
​


## 资料
- [NVIDIA® Jetson™ Powered Edge AI Devices Guide](https://wiki.seeedstudio.com/NVIDIA_Jetson/)
- [NVIDIA Jetson Linux Developer Guide](https://docs.nvidia.com/jetson/archives/r36.4.3/DeveloperGuide/index.html)
- [Jetson Orin Nano Super Developer Kit](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/nano-super-developer-kit/)
- [NVIDIA Jetson Orin Nano Developer Kit Gets a “Super” Boost](https://developer.nvidia.com/blog/nvidia-jetson-orin-nano-developer-kit-gets-a-super-boost/)

- [OpenCV with CUDA](https://github.com/Seeed-Projects/reComputer-Jetson-for-Beginners/tree/main/3-Basic-Tools-and-Getting-Started/3.8-OpenCV-with-CUDA): 带cuda加速的opencv：

- [模版简历-Lain-Ego0](https://github.com/Lain-Ego0/Typst-resume)
- [相机](https://harry-hhj.github.io/posts/RM-Tutorial-4-Camera/)
- [Numpy 的使用](https://harry-hhj.github.io/posts/Numpy-Tutorial/#%E4%B8%80python-%E5%9F%BA%E7%A1%80)
- [单目视觉](https://harry-hhj.github.io/posts/RM-Tutorial-5-Monocular-Vision/)
- [PPT 制作常用免费工具](https://harry-hhj.github.io/posts/PPT-tools/)
- OpenCV文档yyds

- [locowiki0](https://locowiki.github.io/)
- [机器人体系化 教学文档](http://robotics-tutorial.dmbot.cn/)

- [LeetCode 笔记-孔](https://firefly-7a0.pages.dev/posts/leetcode_notes/leetcode-index/)

- [从零开始配置 Windows-软件下载](https://arthals.ink/blog/initialize-windows#flow-launcher)
- [从零开始配置 Linux ](https://arthals.ink/blog/initialize-linux)

- [ 创建图床 ](https://www.zql404.top/blog/imgbed)

- [JuniorTreeA Note Site](https://note.juniortree.com/)

- [我们的工科教育，问题出在了哪里](https://zhuanlan.zhihu.com/p/673155133)