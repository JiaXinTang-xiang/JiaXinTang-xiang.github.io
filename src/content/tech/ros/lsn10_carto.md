---
title: 'LSN10 激光 + 飞控 IMU Cartographer ROS2 记录'
description: '记录 学习过程'
publishDate: '2026-07-03'
updatedDate: '2026-07-03'
tags:
  - ROS 2
  - Cartographer
  - IMU
  - SLAM
  - 激光雷达
language: 'Chinese'
draft: false
slug: 'ros/lsn10-carto'
heroImage: { src: './images/lsn10_carto/cover.jpg', color: '#1a1a2e' }
---

## 前言
                                                        
参考之前的 ROS1 工程移植到 ROS2 上，重新搭了一套带 IMU 的 2D 激光建图。


---

## 一、硬件与目标

| 设备 | 接口 | 串口 | 协议 | 频率 |
|------|------|------|------|------|
| LSN10 激光雷达（镭神 N10） | CH343 USB 转串口 | `/dev/ttyACM0`, 230400bps | LSN10 私有 | 10Hz |
| ANO 匿名飞控（STM32F407） | CH340 USB 转串口 | `/dev/ttyUSB0`, 921600bps | ANO PT v7 | IMU 1kHz |

这套设备之前在 ROS1 Noetic 上跑过 `cartographer_imu_dt.launch`——飞控串口 → `anorosdt` 包解析 → `ano_imu` → Cartographer `tracking_frame = imu_link`。

ROS2 这边当前状态：纯激光建图，IMU 被显式禁用（`use_imu_data = false`, `tracking_frame = "laser"`）。


### 1.1 背景知识

- **SLAM 前端 vs 后端**：前端实时定位（每帧激光算当前位姿），后端修正累积误差（回环检测 + 全局优化），并行跑。
- **激光运动畸变**：360° 一帧不是同一时刻采集的，机器人转快了地图会歪。IMU 高频角速度能插值修正。
- **IMU 漂移**：陀螺仪短准长漂（几百米偏几度），加速度计受振动干扰不能单独积速度——必须配激光纠偏。
- **tracking_frame 选 imu_link**：IMU 直测角速度不依赖环境，1kHz vs 激光 10Hz，高频源做跟踪帧信息丢失少。
- **时间同步是融合前提**：Cartographer 要求所有传感器时间戳单调递增、时钟基准统一。。

---

## 二、迁移分析：ROS1 做了什么，ROS2 差什么

ROS1 启动脚本 `self.sh` 一行搞定：

```bash
roslaunch anorosdt cartographer_imu_dt.launch
# = anoros_dt.launch（飞控桥接）
# + Lidar.launch（雷达）
# + demo_revo_lds_imu.launch（Cartographer + IMU）
# + rviz
```

飞控桥接包 `anorosdt` 用 C++ 写了三件事：
- 开串口 `/dev/ttyUSB0` 921600
- 解析 ANO PT v7 帧：`0xAA` 帧头 → 校验 SC1+SC2 → 提取 ID `0x01`（加速度+陀螺仪，int16×6 → m/s² 和 rad/s）、ID `0x04`（四元数，int16×4 → 归一化浮点）
- 发布 `sensor_msgs/Imu` 到 `/ano_imu`，frame_id = `imu_link`

ROS2 这边差三样：飞控节点不存在、IMU 话题没 remap、URDF 没 `imu_link`。

---

## 三、动手：写 `anorosdt2` 飞控桥接节点

### 3.1 为什么 Python

串口读写在 pyserial 里一行 `read()` 搞定，协议解析 `struct.unpack` 一把出，不用自己管缓冲区和对齐。1kHz 串口 Python 性能完全够，包管理也不用写 CMakeLists。

### 3.2 包结构

```
anorosdt2/
├── package.xml              # ament_python
├── setup.py                 # 数据文件 + CustomInstall（补 ros2 run 软链接）
├── setup.cfg                # entry_points → anoros_dt
├── config/anorosdt2.yaml    # 可配串口名/波特率/话题名
├── resource/anorosdt2       # ament index 标记
└── anorosdt2/
    ├── __init__.py
    └── anoros_dt_node.py    # 核心：串口读取 + 状态机解析 + Imu 发布
```

### 3.3 协议解析：7 状态状态机

ANO PT v7 是纯字节流，帧间无分隔符，靠 `0xAA` 帧头同步：

```
HEADER → ADDR → ID → LEN → DATA → SC1 → SC2 → 校验通过 → dispatch
  0xAA   0xFF         0~255         ↓
                                SC1+SC2 累加校验
```

数据转换（和 ROS1 的 `anoSerial.cpp` 一致）：

```
加速度: raw_int16 / 100.0 → m/s²
角速度: raw_int16 / 16.384 × π / 180.0 → rad/s
四元数: raw_int16 / 10000.0
```

状态机坑：**跨状态的数据必须挂 self**。

### 3.4 验证：

节点写好后第一步不是 `ros2 run`——是先确认串口有数据、解析器能解出正确的数。用 Python 裸读：

```python
ser = serial.Serial('/dev/ttyUSB0', 921600)
data = ser.read(1024)  # 一瞬间收满，能看到大量 aaff 帧头
```

用解析器解一帧：
```
Accel: x=0.60, y=-1.82, z=9.99     # z≈1g，传感器平放 ✓
Gyro:  x=-0.017, y=0.015, z=-0.002  # 接近 0，传感器静止 ✓
Quat:  w=0.749, x=-0.126, y=0.114, z=-0.638  # 飞行姿态，飞控在解算 ✓
```

解析器裸测通了再启动 ROS 节点，确认话题频率：

```bash
$ ros2 topic hz /imu/data
average rate: 1091.493   # 飞控 1ms 发一次，ROS 实际约 1090Hz ✓
```


---

## 四、注意

**现象1**：飞控 CH340 插上 USB 后短则几分钟黑屏，只能硬重启。

**日志**：`journalctl` 里在黑屏前几秒看到：

```
brltty[3029]: USB URB status error 108
brltty[3029]: USB bulk transfer error 19
```

**根因**：`brltty` 是 Ubuntu 默认安装的盲文显示器服务。它会主动探测所有 USB 串口设备，往 CH340 发配置指令。和飞控正常数据冲突 → USB 栈崩溃 → Xorg 挂 → 黑屏。这个 bug 在 GitHub 挂了快十年，受害者覆盖 Arduino/STM32/CH340/CP2102 全部。

**修复**：`sudo apt purge brltty -y && sudo reboot`

> Ubuntu 上但凡用 USB 转串口，先把 brltty 删了。

---

**现象3**：`colcon build` 成功，`install/anorosdt2/bin/anoros_dt` 存在，但 `ros2 run anorosdt2 anoros_dt` 报 `No executable found`。

**根因**：`ros2 run` 去 `<prefix>/lib/<pkg>/` 找可执行文件，CMake 包输出正好在那。Python 包的 `console_scripts` 默认装到 `bin/`，`ros2 run` 不认。

**修复**：`setup.py` 里加 `CustomInstall` 类，编译后自动创建 `lib/<pkg>/` → `bin/` 的软链接。

---

## 五、时间戳

所有节点正常，IMU 1090Hz，激光 10Hz。但 `/map` 永远不出，Cartographer 刷屏：

```
sensor_bridge.cpp:211] Ignored subdivision because
previous time 647267391820023398 is not before
current time 639186542280522082
```

两个时间戳换算：`6.47×10¹⁷ ns ≈ 20.5 年的秒数`。不可能是 ROS 系统时间。问题在 `LaserScan.time_increment` 字段——Cartographer 用它给每点算独立时间戳（`point_i_time = header.stamp + i × time_increment`），`time_increment` 是天文数字就让所有点飞到未来。


追到 `lslidar_driver.cc` 的 `getScan()` 函数：

```cpp
int LslidarDriver::getScan(..., float &scan_time, float &scan_duration) {
    scan_time = pre_time_;    // ← rclcpp::Time → float，得到的是纳秒数！
    scan_duration = time_.seconds() - pre_time_.seconds();  // ← 这个是对的
}
```

`pre_time_` 是 `rclcpp::Time` 对象，隐式转 `float` 时调了 `nanoseconds()`，返回纳秒原始值（~1.78×10¹⁸）。然后发布 scan 时：

```cpp
scan->time_increment = scan_time / (count_num - 1);
// = 1.78×10¹⁸ / 1000 ≈ 1.78×10¹⁵ 纳秒 ≈ 20.6 天/点
```

Cartographer 被告知每个相邻激光点差了 20 天 → 子段时间戳非递增 → 全丢。



N10_P 路径（1007行）已经把 `time_increment` 注释掉了，N10 走的 else 分支（1165行）漏了。典型的「修一半」：厂商修了 N10_P 用户报的 bug，没管 else。

```cpp
// scan->scan_time = scan_time;
// scan->time_increment = scan_time / (double)(count_num - 1);
```

不设 `time_increment` = 所有激光点共享同一时间戳。对 2D 雷达这是对的：单帧内点几乎瞬时，IMU 外推已补偿运动畸变。重编译后移动雷达，`/map` 立刻出现。

---

## 六、最终配置

### 6.0 从零复现步骤

按顺序做，不走回头路：

1. **删 brltty**：`sudo apt purge brltty -y && sudo reboot`
2. **改 lsn10.lua**：两行，`tracking_frame = "imu_link"` + `use_imu_data = true`
3. **改 launch**：URDF 加 `imu_link`、Cartographer 加 `('imu', '/imu/data')` remap、加 `anorosdt2` 节点
4. **改驱动**：注释 `lslidar_driver.cc` 里 N10 路径的 `scan_time` 和 `time_increment` 两行
5. **编译**：`colcon build --symlink-install`
6. **验证 IMU**：`ros2 topic hz /imu/data` 应看到 ~1090Hz
7. **启动建图**：`ros2 launch lslidar_driver lsn10_cartographer.launch.py`
8. **移动雷达**：不动不出图，Cartographer 需要观测到运动才建子图

### 6.1 系统架构

```
飞控 → anorosdt2 → /imu/data (1090Hz, imu_link)
雷达 → lslidar_driver → /scan (10Hz, laser)
robot_state_publisher: base_link → imu_link, base_link → laser
Cartographer: tracking_frame=imu_link, use_imu_data=true
  → /map (OccupancyGrid)
  → /tf: map → odom → base_link
```

### 6.2 关键 lsn10.lua 参数

```lua
tracking_frame = "imu_link"
TRAJECTORY_BUILDER_2D.use_imu_data = true
imu_sampling_ratio = 1.
```

### 6.3 启动与保存

```bash
ros2 launch lslidar_driver lsn10_cartographer.launch.py

# 保存地图
ros2 run cartographer_ros cartographer_pbstream_to_ros_map \
  -pbstream_filename ~/.ros/cartographer.pbstream \
  -map_filestem ./my_map -resolution 0.05
```

### 6.4 修改清单

| 文件 | 改动 |
|------|------|
| `anorosdt2/` | **新建** Python 包（串口读飞控 + ANO PT v7 解析 + `/imu/data`） |
| `lslidar_driver/config/lsn10.lua` | `tracking_frame` → `imu_link`, `use_imu_data` → `true` |
| `lslidar_driver/launch/lsn10_cartographer.launch.py` | URDF 加 `imu_link`, IMU remap, 启动 `anorosdt2` |
| `lslidar_driver/src/lslidar_driver.cc` | 注释 N10 路径的 `time_increment` |
| 系统 | `sudo apt purge brltty` |

---


## 附录A：传感器选型与 Cartographer 算法

### A.1 为什么激光 + IMU

**激光优势**：毫米级测距、不依赖光照、计算开销低（1000 个点 CPU 毫秒级匹配）、无尺度漂移（直接给米，不像单目相机需要尺度初始化）。**短板**：白墙、长廊等几何特征弱的环境，旋转方向几乎看不清。

**IMU 补上旋转短板**：陀螺仪 0.01 rad/s 的旋转也能测；加速度计永远知道重力方向；1kHz 填激光 10Hz 的帧间空白。Cartographer 三层融合：位姿外推（给扫描匹配更好的初始猜测）→ 旋转约束（Ceres 优化里 `rotation_weight = 40 > translation_weight = 20`，旋转信 IMU）→ 重力对齐（地图 z 轴对正真实重力方向）。

### A.2 为什么 Cartographer

对比四个主流方案：

| 算法 | 回环检测 | IMU 融合 | ROS2 | 10Hz 激光 | 结论 |
|------|---------|---------|------|----------|------|
| Gmapping | ❌ | ❌ | 社区版 | 可用 | 大场景地图错位 |
| Hector | ❌ | ❌ | 社区版 | ❌ 需 ≥20Hz | 帧率不够直接发散 |
| Karto | ✅ | ❌ | ❌ 无 | 可用 | 十年前方案，ROS2 无维护 |
| Cartographer | ✅ 分支定界 | ✅ 原生 | ✅ Google | ✅ 配合 IMU | **选它** |

Cartographer 的两个核心优势：scan-to-submap（不跟整张地图匹配，跟局部子图匹配，精度高且子图锁定后不重算）；分支定界回环检测（把 O(n²) 暴力搜索变成对数级剪枝）。

### A.3 Cartographer 流水线速览

```
/scan → motion_filter（没动就跳）→ PoseExtrapolator（IMU 外推初始位姿）
      → CeresScanMatcher（min Σ(1-占据概率)²）→ 插入 Submap
      → BranchAndBound（后台回环检测）→ PoseGraph（全局优化）
      → /map（拼接所有完成的 submap）
```

### A.4 IMU 融合的工程原则

1. **IMU 填空白，激光纠漂移**：100ms 帧间 IMU 提供连续观测，激光提供绝对几何约束。
2. **旋转信 IMU，平移信激光**：白墙看不出的旋转 IMU 看得到，长廊漂移 IMU 不可靠但激光看墙距看得到。
3. **重力是绝对参考**：没 IMU 时过坡地图会倾斜，导航代价地图判障碍物浮空。
4. **飞控内置 IMU 已校准**：出厂零偏+互补滤波，四元数直接用。

> 本文部分内容由 AI 辅助整理和润色。
