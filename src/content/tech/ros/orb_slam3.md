---
title: 'ORB-SLAM3 全链路调试：从编译到 USB 相机实时定位'
description: '在 ROS 2 Humble 下从编译 ORB-SLAM3，'
publishDate: '2026-07-01'
updatedDate: '2026-07-01'
tags:
  - ORB-SLAM3
  - EVO
  - PCL
language: 'Chinese'
draft: false
slug: 'ros/orb-slam3'
heroImage: { src: './images/orb_slam3/cover.jpg', color: '#1a1a2e' }
---

## 前言

很多 SLAM 教程都是这样开始的：

```bash
roslaunch orb_slam3 mono_euroc.launch
```

一行命令跑通，然后呢？词典怎么加载的？Pangolin 和 C++17 怎么兼容的？`cv_bridge` 把 YUYV 转成了什么？为什么九百帧都不出 `First KF`？

这条命令背后压缩了一整套编译、配置、调试的知识。

前面三个阶段把 OpenCV 图像基础、特征匹配、相机几何都过了一遍。这篇把 ORB-SLAM3 在 ROS 2 Humble 下从零编译，接入 USB 相机跑通实时 Mono 定位——不跑数据集、不靠现成 launch 文件，一行 `ros2 run` 出结果。

**环境**：Ubuntu 22.04，ROS 2 Humble，OpenCV 4.5.4，Eigen 3.4.0。

---

## 一、整体架构

目标很简单——一个 USB 相机，一个 ORB-SLAM3 Mono 节点，实时定位：

```
USB 相机 → /image_raw → ORB-SLAM3 Mono 节点 → Pangolin 可视化 + 轨迹保存
```

不用 Python 驱动层、不搞多传感器。官方版 ORB-SLAM3 只支持 ROS 1 Melodic，ROS 2 Humble 需要社区移植版 [mechazo11/ros2_orb_slam3](https://github.com/mechazo11/ros2_orb_slam3)。

## 二、编译 ORB-SLAM3 本体

### 2.1 依赖

Eigen3 系统已有，Pangolin 需要额外装：

```bash
sudo apt install ros-humble-pangolin
```

注意 `ros-humble-pangolin` 不提供 `.pc` 文件，pkg-config 找不到，但 cmake 的 `find_package(Pangolin REQUIRED)` 能通过。

### 2.2 clone 源码

```bash
mkdir -p ~/slam_ws/src && cd ~/slam_ws/src
git clone https://github.com/UZ-SLAMLab/ORB_SLAM3.git
git clone https://github.com/mechazo11/ros2_orb_slam3.git
```

- ORB-SLAM3 本体：[UZ-SLAMLab/ORB_SLAM3](https://github.com/UZ-SLAMLab/ORB_SLAM3) — 官方 V1.0 版本，支持 Mono/Stereo/RGB-D/Inertial
- ROS 2 Humble 移植层：[mechazo11/ros2_orb_slam3](https://github.com/mechazo11/ros2_orb_slam3) — 社区维护，原生 ROS 2 集成，无额外 rviz/tf 依赖

官方 ORB-SLAM3 只支持 ROS 1 Melodic。

如果 GitHub 被墙（`gnutls_handshake() failed`），给 git 单独设代理：

```bash
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

### 2.3 第一个坑：C++ 标准

ORB-SLAM3 的 `CMakeLists.txt` 写死了 `-std=c++11`，但 ROS 2 Humble 自带的 Pangolin（`ros-humble-pangolin`）的 `sigslot` 头文件用了 `std::decay_t`、`std::enable_if_t` 等 C++14 特性。编译报错：

```
error: 'decay_t' is not a member of 'std'; did you mean 'decay'?
```

**改 CMakeLists.txt**：把 `-std=c++11` 换成 `-std=c++14`：

```cmake
CHECK_CXX_COMPILER_FLAG("-std=c++14" COMPILER_SUPPORTS_CXX14)
if(COMPILER_SUPPORTS_CXX14)
   set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++14")
```

### 2.4 第二个坑：词典格式

编译通过后核心库 `libORB_SLAM3.so` 生成。但 ros2_orb_slam3 内嵌的 `System.cc` 把词汇加载从 `loadFromTextFile` 改成了 `loadFromBinFile`：

```cpp
// 原来的代码（ros2_orb_slam3 的 System.cc）
bool bVocLoad = mpVocabulary->loadFromBinFile(strVocFile);
// 改为
bool bVocLoad = mpVocabulary->loadFromTextFile(strVocFile);
```

ORBvoc.txt 是文本格式 145MB，不改这行会报 "This is not a correct Binary file!"。

### 2.5 第三个坑：硬编码路径

ros2_orb_slam3 在两个地方写了绝对路径，不改成你自己的就跑不了。

**C++ 头文件** `common.hpp`：

```cpp
// 改前
std::string packagePath = "ros2_test/src/ros2_orb_slam3/";
// 改后
std::string packagePath = "桌面/OpenCV/slam_ws/src/ros2_orb_slam3/";
```

**Python 驱动** `mono_driver_node.py`：

```python
# 改前
self.home_dir = str(Path.home()) + "/slam_ws/src/ros2_orb_slam3"
# 改后
self.home_dir = str(Path.home()) + "/桌面/OpenCV/slam_ws/src/ros2_orb_slam3"
```

这些路径是相对于 `$HOME` 拼接的，所以填 `桌面/OpenCV/slam_ws/...`。

### 2.6 编译总结

```bash
# ORB-SLAM3 本体
cd ~/桌面/OpenCV/slam_ws/src/ORB_SLAM3
chmod +x build.sh && ./build.sh

# ROS 2 包装层
cd ~/桌面/OpenCV/slam_ws
colcon build --symlink-install --packages-select ros2_orb_slam3
```

两轮编译共涉及四个坑：C++ 标准、词典格式、两处硬编码路径。改完后 `colcon build` 一次通过。

---

## 三、用内置测试数据验证

ros2_orb_slam3 自带了 EuRoC MH05 的 585 张测试图片。启动需要两个节点——C++ 引擎 + Python 驱动喂图片：

```bash
# 终端 1：SLAM 引擎
source ~/桌面/OpenCV/slam_ws/install/setup.bash
ros2 run ros2_orb_slam3 mono_node_cpp --ros-args -p node_name_arg:=mono_slam_cpp

# 终端 2：喂 EuRoC 图片序列
source ~/桌面/OpenCV/slam_ws/install/setup.bash
ros2 run ros2_orb_slam3 mono_driver_node.py --ros-args -p settings_name:=EuRoC -p image_seq:=sample_euroc_MH05
```

两个节点握手成功后，Pangolin 窗口弹出，地图逐渐构建。跑完 585 张图，130 个关键帧落盘到 `output/KeyFrameTrajectory.txt`。

---

## 四、改造直连 USB 相机

Python 驱动读取的是硬盘上的图片序列。要接入 USB 相机实时流，最直接的方式是**改 C++ 节点直接订阅 `/image_raw`**，去掉中间的 Python 握手层。

### 4.1 改写 common.hpp

砍掉所有 Python 驱动相关的成员——`experimentSetting_callback`、`Timestep_callback`、`initializeVSLAM`、握手用的 Publisher/Subscription。只留一个图片订阅：

```cpp
class MonocularMode : public rclcpp::Node
{
public:
    MonocularMode();
    ~MonocularMode();
private:
    std::string vocFilePath = "";
    std::string settingsFilePath = "";
    rclcpp::Subscription<sensor_msgs::msg::Image>::SharedPtr subImgMsg_subscription_;
    ORB_SLAM3::System* pAgent = nullptr;
    void Img_callback(const sensor_msgs::msg::Image& msg);
};
```

### 4.2 改写 common.cpp

构造函数直接初始化 ORB-SLAM3，然后订阅 `/image_raw`（可通过参数重映射）：

```cpp
MonocularMode::MonocularMode() : Node("mono_node_cpp")
{
    // ...读取路径参数...
    pAgent = new ORB_SLAM3::System(vocFilePath, settingsFilePath, sensorType, true);
    subImgMsg_subscription_ = this->create_subscription<sensor_msgs::msg::Image>(
        "/image_raw", 10,
        std::bind(&MonocularMode::Img_callback, this, std::placeholders::_1));
}
```

图像回调中处理 `cv_bridge` 转换，调用 `TrackMonocular`。退出时自动保存轨迹到 `output/`。

### 4.3 USB 相机配置文件

用之前标定的结果创建 `USB_cam.yaml`（就是之前 [相机标定](https://jiaxintang.github.io/tech/camera-calibration-zhang/) 博客里那台相机，`/dev/video4`，640x480）：

```yaml
Camera1.fx: 390.09
Camera1.fy: 520.27
Camera1.cx: 322.58
Camera1.cy: 236.14
Camera1.k1: -0.4515
Camera1.k2: 0.1797
Camera1.p1: -0.001622
Camera1.p2: -0.004548
```

ORB 参数先设为每帧 1000 特征，初始 FAST 阈值 20。

---

## 五、YUYV 双通道

先打印图像类型——`channels: 2`！

问题出在 `cv_bridge`：相机输出 YUYV 格式（YUV 4:2:2 压缩），`cv_bridge::toCvCopy` 把它转成了 **2 通道 CV_8UC2** 而不是 3 通道 BGR。之前的代码只处理了 `channels == 3`（BGR→Gray）和 `channels == 1`（已经是灰度），漏了 `channels == 2`。

**修复**：加 2 通道分支，用 `COLOR_YUV2GRAY_YUYV` 转灰度：

```cpp
cv::Mat gray;
if (cv_ptr->image.channels() == 1)
    gray = cv_ptr->image;
else if (cv_ptr->image.channels() == 2)        // ← 新增
    cv::cvtColor(cv_ptr->image, gray, cv::COLOR_YUV2GRAY_YUYV);
else
    cv::cvtColor(cv_ptr->image, gray, cv::COLOR_BGR2GRAY);
```

---

## 六、初始化的坎：纹理 + 视差 + 标定

### 6.1 纹理不够

ORB-SLAM3 提取 ORB 特征做匹配。白墙、纯色桌面、天花板——这些区域 ORB 根本提不出特征。把 **FAST 阈值从 20 降到 10，每帧特征数从 1000 提到 2000**：

```yaml
ORBextractor.nFeatures: 2000
ORBextractor.iniThFAST: 10
ORBextractor.minThFAST: 5
```

### 6.2 视差不够

Mono 模式靠两帧之间平移产生的**视差**三角化初始地图点。原地旋转、晃动摇摆都不产生视差。必须**横向平移**——拿着相机左右移动 10-20 厘米。

### 6.3 纹理 + 运动

单纯降低阈值和增加特征数还不够。ORB-SLAM3 Mono 模式在初始化时需要两帧之间有足够的**平移视差**来三角化初始地图点。如果只是原地旋转或小幅晃动，即使有 2000 个特征，对极几何的基线太短，三角化的 3D 点精度太差，初始化会一直失败。

**关键操作**：对着电脑屏幕上密集的文字/代码区域（纹理极丰富），先稳住 2 秒让系统锁定第一帧，然后**横向平移 10-20 厘米**产生足够的视差。

这三个条件同时满足——低 FAST 阈值 + 2000 特征 + 纹理丰富场景 + 横向平移——终端终于出现了 `First KF:0; Map init KF:0`。

---

## 七、完整运行方式

### 使用技巧

- **初始化**：对着纹理丰富的场景，横向平移 10-20cm，看到终端打印 `First KF` 即成功
- **轨迹保存**：Ctrl+C 退出自动存到 `output/KeyFrameTrajectory.txt`
- **TUM 格式**：每行 `timestamp tx ty tz qx qy qz qw`，可直接用 EVO 评估

---



## 九、实时运行与轨迹评估

### 9.1 用自己的标定参数跑通

之前在第六节用了通用内参（fx=500, fy=500）初始化成功，但那只是为了验证管线。确认了问题是纹理 + 视差而不是标定后，把配置文件改回真实的 `ost.yaml` 标定值：

```yaml
Camera1.fx: 390.09    # 真实标定值
Camera1.fy: 520.27
Camera1.cx: 322.58
Camera1.cy: 236.14
Camera1.k1: -0.4515   # 明显的桶形畸变
```

同一台相机，真实标定参数，对着屏幕上的代码（纹理丰富），横向平移——重新初始化成功了。388 个关键帧，路径长度约 32.8 米，运行 185 秒。

### 9.2 EVO 轨迹评估

```bash
evo_traj tum output/KeyFrameTrajectory.txt --plot
```

花了半小时踩 matplotlib 和 Qt 的坑——`pip` 版和 `apt` 版的 matplotlib 冲突导致 `ImportError: cannot import name 'docstring'`，装完 `libxcb-cursor0` 又缺 PyQt6。最终绕过图形界面，用 Python matplotlib 直接画俯视图和高度变化。

关键数据：388 个关键帧，32.8 米路径。Mono 模式的尺度是任意的——这个 32.8m 不等于真实的 32.8 米。真正的精度评估需要两条轨迹对比（SLAM 输出 vs ground truth），那是 Gazebo 仿真要做的事。

---

## 十、硬件选型：感知相机怎么选

跑通 ORB-SLAM3 后自然想升级设备。调研了一圈：

| 型号 | 类型 | IMU | 价格 | ROS2 | 状态 |
|------|------|------|------|------|------|
| **USB 相机（现有）** | 单目 RGB | ❌ | — | ✅ usb_cam | 在用 |
| **Intel T265** | 双目鱼眼 + 追踪芯片 | ✅ | ~¥2000 | ⚠️ 2025停支持 | **别买**——黑盒，内置 SLAM 不让你改算法 |
| **Intel D435i** | RGB-D + 结构光 | ✅ | ~¥2500 | ✅ | SLAM 标配、社区极多、Kalibr/VINS 全支持。买带 `i` 的 |
| **奥比中光 Gemini 335** | RGB-D + 双目 | ✅ | ~¥1500 | ✅ 官方 | 国产替代，性价比高，ROS2 官方驱动 `v2-main`，社区资料少 |

T265 是给做控制的人用的——你不跑 SLAM，它内部芯片帮你跑好，直接输出 6-DOF 位姿。对感知工程师来说它是"屏蔽学习的工具"——帮你挡住了你该学的东西。已停产、不再支持，不要碰。

D435i 是标准答案，Gemini 335 是省钱方案。两者都带 IMU，能跑 VIO，能做 Camera-IMU 联合标定。后面买了直接换掉 USB 相机，同样的 ORB-SLAM3 管线全部复用。

---

## 写在最后

从一条 `git clone` 到 Pangolin 窗口里实时出地图和轨迹，踩了八个坑，改了两处源码，加了一个 `COLOR_YUV2GRAY_YUYV` 分支。然后调纹理、降阈值、横向平移——在自己标定的相机上用自己写的配置跑通了实时 Mono SLAM。

这事的意义不在于跑通了一个系统——教程里的 `ros2 run` 本来就能跑通——而在于**跑通过程中每一行报错都搞明白了原因**。为什么 C++11 不行？因为 Pangolin 的 sigslot 用了 C++14 特性。为什么词典加载失败？因为移植版改了加载函数。为什么 900 帧不初始化？因为纹理不够、视差不够。为什么 YUYV 崩溃？因为 `cv_bridge` 转出了 2 通道而不是 3 通道。

每个坑背后都有一个具体的知识点。亲手踩过之后，再学 VINS-Fusion、Kalibr 标定、视觉里程计，看到类似报错就知道往哪方向排查。

这不是终点——拿到 388 个关键帧的轨迹是第一步。接下来的事情是：

- **PCL 练习代码**——OpenCV 搞定图像，PCL 搞定点云，感知的两条腿一条不能少
- **Gazebo 仿真对比**——sam_bot 仿真相机跑 ORB-SLAM3，和 `/odom` ground truth 比 ATE，第一次量化精度
- **十四讲 + 读 ORB-SLAM3 源码**——从 `TrackMonocular` 往下读，不再把 SLAM 当黑盒
- **Camera-IMU 外参标定**——Kalibr + EuRoC 数据集，后面买了带 IMU 的相机直接上手

---

## 参考

- ORB-SLAM3 论文：[Campos et al., *ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM*, IEEE T-RO, 2021](https://arxiv.org/abs/2007.11898)
- ORB-SLAM3 官方仓库：[UZ-SLAMLab/ORB_SLAM3](https://github.com/UZ-SLAMLab/ORB_SLAM3)
- ROS 2 Humble 移植：[mechazo11/ros2_orb_slam3](https://github.com/mechazo11/ros2_orb_slam3)
- EVO 轨迹评估工具：[MichaelGrupp/evo](https://github.com/MichaelGrupp/evo)
- Pangolin：[stevenlovegrove/Pangolin](https://github.com/stevenlovegrove/Pangolin)

> 本文部分内容由 AI 辅助整理和润色。
