---
title: '差分驱动机器人导航Nav2'
description: '记录导航系统搭建过程与设计决策'
publishDate: '2026-07-05'
updatedDate: '2026-07-05'
tags:
  - ROS 2
  - Nav2
  - AMCL
  - 机器人
  - 导航
language: 'Chinese'
draft: false
slug: 'ros/wheeltec-nav2'
heroImage: { src: './images/wheeltec_nav2/cover.jpg', color: '#24292e' }
---

## 前言

建图只是第一步，让机器人能在地图上自己走到目标点才是完整闭环。

这篇文章记录从零搭建导航系统的过程：底盘串口协议解析、里程计发布、Nav2 配置、传感器数据流设计。不只是写代码，更多是解释每一步为什么这样做。

---

## 一、建图之后：导航在做什么

### 1.1 建图和导航的关系

建图（SLAM）输出一张占据栅格地图——每个格子标记为「空闲」「占据」或「未知」。这张地图是静态的，记录了环境的结构。

导航在这张静态地图上，实时做三件事：

1. **定位**（Localization）：我现在在地图的哪个位置？朝向哪个方向？
2. **规划**（Planning）：从当前位置到目标点，走哪条路最优？
3. **控制**（Control）：怎么让电机转起来，沿着规划的路径走？

三者构成一个闭环。定位告诉你「在哪」，规划告诉你「往哪走」，控制执行「怎么走」——走出去了，里程计更新位置，定位修正误差，规划重新调整路线。

### 1.2 为什么建图和导航要分开

建图时机器人需要**探索未知区域**——SLAM 前端不断把新激光数据插入子图，后端在检测到回环时调整历史轨迹。这是一个不断变化的过程。

导航时需要的是一个**固定的地图**。如果地图在变，定位会困惑（「上个时刻这堵墙还在，现在它跑了？」）。所以标准流程是：

```
建图 → 保存地图 → 加载静态地图 → 在静态地图上导航
```

Cartographer 可以同时建图和定位，但精度不如「先建好，再导航」的分离方案。

### 1.3 导航系统的四大输入

导航需要四种数据，缺任何一种都会出问题：

| 输入 | 话题 | 来源 | 作用 |
|------|------|------|------|
| 激光扫描 | `/scan` | 雷达驱动 | 感知周围障碍物 |
| 里程计 | `/odom` | 底盘编码器 | 提供短时运动估计 |
| 静态地图 | `/map` | map_server | 全局环境参考 |
| TF 变换 | `/tf` | robot_state_publisher + 里程计 | 传感器之间的坐标关系 |

其中最容易出问题的是里程计——没有里程计，AMCL 只能靠纯激光匹配来更新粒子，在特征稀疏的环境（长廊、空旷大厅）粒子会发散。

---

## 二、底盘桥接：从串口字节到里程计

### 2.1 底盘硬件

底盘由一块 STM32F103 控制，两个直流电机 + 编码器，差分驱动。MCU 内部已经跑了一整套闭环：

- 每 10ms 读一次编码器增量
- 用差分运动学公式累加里程计位置（中点积分法）
- 100Hz 速度 PID 闭环
- 通过 USART1 115200bps 和上位机通信

所以我们不需要在 ROS 端做任何运动控制计算——MCU 全干了。ROS 端只需要收发二进制帧。

### 2.2 通信协议

MCU 和 PC 之间用两套帧格式，帧尾统一用 `0x55`：

**速度指令（PC → MCU）：0xBB，7 字节**

```
Byte 0:     0xBB          帧头
Byte 1-2:   v_linear      线速度 (int16, 大端序, mm/s)
Byte 3-4:   v_angular     角速度 (int16, 大端序, mrad/s)
Byte 5:     校验和        (Byte 1~4 累加取低 8 位)
Byte 6:     0x55          帧尾
```

注意单位：Nav2 的 `/cmd_vel` 用的是 m/s 和 rad/s，而 MCU 期望 mm/s 和 mrad/s。中间要乘以 1000。

**里程计回传（MCU → PC）：0xCC，15 字节**

```
Byte 0:     0xCC          帧头
Byte 1-4:   x             X 坐标 (float32, 小端序, mm)
Byte 5-8:   y             Y 坐标 (float32, 小端序, mm)
Byte 9-12:  theta         朝向角 (float32, 小端序, rad)
Byte 13:    校验和        (Byte 1~12 累加取低 8 位)
Byte 14:    0x55          帧尾
```

注意浮点数的字节序：MCU 是 ARM Cortex-M3（小端），和 PC 一致，直接 `struct.unpack('<fff', ...)` 一把解析。如果换成大端 MCU（如某些 DSP），字节序不匹配会导致解析出来的坐标完全错误——这是跨平台串口通信最容易踩的坑。

### 2.3 里程计与 TF 的关系

`sensor_msgs/Odometry` 消息有两个坐标系：

- `header.frame_id = "odom"` — 里程计坐标系（父坐标）
- `child_frame_id = "base_link"` — 机器人本体（子坐标）

消息里的 `pose.pose` 描述 `base_link` 在 `odom` 坐标系下的位姿。与此同时，需要广播一条 TF：`odom → base_link`。

这两个操作必须**完全同步**——pose 和 TF 的时间戳和数值必须严格一致。如果只发消息不发 TF，AMCL 无法通过 TF 树找到 `base_link`，定位失败；如果只发 TF 不发消息，Nav2 没有里程计观测，控制器无法闭环。

### 2.4 里程计协方差的意义

每个 `/odom` 消息带两个 6×6 协方差矩阵：`pose.covariance` 和 `twist.covariance`。协方差矩阵描述的是里程计的**不确定性**——不是「这个位置对不对」，而是「这个位置大概有 ± 多少误差」。

编码器里程计的特点是：

- **短距离很准**：走 1 米误差在 1-2cm 量级
- **长距离累积漂移**：走 100 米可能偏 1 米以上
- **旋转误差是主要漂移源**：编码器只能测轮子转了多少，不知道轮子打滑、地面不平

所以协方差设置要诚实：不要设太小（吹牛自己的里程计很准），也不要设太大（AMCL 会完全不信它）。对编码器差分驱动小车，合理的初值是：

```
平移: 0.01 (1cm/m 的漂移率)
旋转: 0.01 (yaw 方向也差不多)
twist: 稍大，0.1 左右（速度估计更不准）
```

---

## 三、AMCL 定位：粒子滤波的直观理解

### 3.1 核心思想

AMCL（Adaptive Monte Carlo Localization）用一堆粒子来表示机器人的可能位置。每个粒子是一个位姿假设：「我可能在这里，朝向这个方向」。

算法流程非常直观：

1. **预测**：根据里程计的运动量，把每个粒子挪到新位置。由于里程计有噪声，每个粒子被随机扰动一点。
2. **更新**：用激光数据评估每个粒子的合理性。把当前帧激光按粒子的位姿投影到地图上——激光点落在「墙」上的越多，这个粒子就越可信（权重越高）。
3. **重采样**：权重低的粒子被淘汰，权重高的粒子被复制。粒子族整体向真实位置收敛。
4. **自适应**：粒子太少就增加粒子数（全局重定位），粒子太多且收敛就减少（节省算力）。

### 3.2 我们配的参数

```yaml
max_particles: 2000       # 最多 2000 个粒子
min_particles: 500        # 最少 500
update_min_d: 0.25        # 移动 0.25m 才更新
update_min_a: 0.2         # 转动 0.2rad 才更新
laser_max_range: 12.0     # 超过 12m 的激光数据忽略（噪声大）
max_beams: 60             # 360° 每 6° 抽一根，降计算
laser_model_type: "likelihood_field"  # 似然场模型，比 beam 模型更平滑
```

`max_beams: 60` 是关键参数。LSN10 一帧有 1000+ 个激光点，如果全部用来评估粒子权重，2000 个粒子 × 1000 个点 = 每次迭代 200 万次计算，ARM 板受不了。抽 60 根束（每 6° 一根，均匀覆盖 360°），计算量降到 12 万次，精度几乎没有可见损失。

### 3.3 AMCL 的局限性

AMCL 有一个前提：**机器人必须在地图覆盖范围内**。如果把人抱起来放到一个地图外的地方，AMCL 会「相信」自己在一个错误的位置（粒子被重采样到剩下的高权重区域），永远回不来。这就是为什么要在 Rviz 里用 `2D Pose Estimate` 手动给初始位姿——它告诉 AMCL「粒子应该围着这儿撒」。

---

## 四、代价地图：把激光变成 Plan

### 4.1 什么是代价地图

代价地图（costmap）是导航的中间层——把传感器数据和静态地图融合，生成一张「走哪里安全、走哪里危险」的评分图。

每个格子有一个代价（0-254），代价越高越不应该走。0 是自由空间，254 是障碍物（碰撞），255 是未知。Nav2 的规划器在这张代价图上找一条代价最小的路径。

### 4.2 为什么要两层代价地图

Nav2 同时维护两张代价地图：

| | 全局代价地图 | 局部代价地图 |
|------|-------------|-------------|
| 坐标系 | `map` | `odom` |
| 大小 | 整张地图 | 4m × 4m 滚动窗口 |
| 更新频率 | 1Hz | 5Hz |
| 用途 | 全局路径规划 | 局部轨迹调整 |

全局代价地图给规划器找「从 A 到 B 的大方向」——走走廊还是穿房间。局部代价地图给控制器处理「眼前的问题」——前面突然出现一个人，临时绕开。

两层分工的关键原因是**更新频率**：全局规划需要 CPU 密集型搜索（A*），1Hz 足够了；局部障碍物变化快（人走过、门开了），必须 5Hz 才能及时反应。

### 4.3 代价地图的插件链

每一层代价地图由插件链组成，按顺序叠加：

```
StaticLayer (静态层)
    ↓ 原始地图：墙=占据(254)，空地=自由(0)
ObstacleLayer (障碍物层)  
    ↓ 激光数据插入：检测到的障碍物画上去，清掉被扫过的旧障碍物
InflationLayer (膨胀层)
    ↓ 障碍物向外扩展 inflation_radius
    = 最终代价地图
```

**膨胀层**是最容易被忽略但最重要的插件。激光雷达精度在 ±2cm，机器人的控制精度也差不多——如果膨胀半径是 0，规划器会贴着墙画路径，万一轮子稍微偏一点就撞上了。设置 `inflation_radius: 0.3` 意味着机器人会和所有障碍物保持至少 30cm 距离。

`cost_scaling_factor: 3.0` 控制膨胀的衰减曲线——值越大，代价衰减越快，意味着机器人会在安全的前提下尽量靠近障碍物（挤着走），值越小则会更保守地绕远。

---

## 五、规划与控制：从起点到终点

### 5.1 全局路径规划：NavFn

全局规划器用的是 `nav2_navfn_planner/NavfnPlanner`，基于 A* 搜索算法。

A* 的核心是在地图上从起点出发，每次往代价最小的方向走一步，直到走到终点。它的保证是：**只要地图有解，A* 找到的一定是最优路径**（在它用的启发函数下）。

`use_astar: false` 这个参数让人困惑——为什么不用 A*？实际上 NavfnPlanner 默认用的是 Dijkstra（A* 的一个特例），对所有方向一视同仁。在室内场景，Dijkstra 足够好，比 A* 更不会走奇怪的对角线捷径。

`tolerance: 0.5` 是路径精度——规划出来的路径点之间距离不超过 0.5 米。

### 5.2 局部轨迹控制：DWB

全局路径只是一串位姿点，没有时间信息。局部控制器要把这串点变成实时的速度指令。

DWB（Dynamic Window Approach，动态窗口法）的思路：

1. 考虑机器人的速度限制（最大速度、最大加速度）
2. 在可达的速度范围内采样一堆 `(v_x, v_θ)` 组合
3. 对每个组合模拟未来 1.7 秒（`sim_time: 1.7`）的轨迹
4. 给每条轨迹打分（离规划路径多远、离障碍物多远、朝向是否正确...）
5. 选得分最高的轨迹对应的速度，发出去

```yaml
max_vel_x: 0.5        # 最快线速度 0.5 m/s = 1.8 km/h（人慢走的速度）
max_vel_theta: 1.5    # 最快角速度 1.5 rad/s ≈ 86°/s
acc_lim_x: 0.5        # 加速度和最大速度一样，意味着 1 秒就能加速到最快
sim_time: 1.7         # 前向模拟 1.7 秒——太久则计算量大，太短则轨迹不顺
```

`vx_samples: 20` 和 `vtheta_samples: 40` 控制每个控制周期的采样密度——20 × 40 = 800 条候选轨迹，每条在 1.7 秒的模拟里打分。ARM 板上这 800 次评估在几毫秒内完成——因为只做运动学模拟，不涉及复杂的物理计算。

DWB 的 critics（评分项）各有权重：

```yaml
PathAlign.scale: 32.0    # 和全局路径对齐——最重要
GoalAlign.scale: 24.0    # 看向目标方向
PathDist.scale: 32.0     # 离路径别太远
GoalDist.scale: 24.0     # 往目标靠近
BaseObstacle.scale: 0.02 # 躲障碍物——权重小但最关键
RotateToGoal.scale: 32.0 # 快到终点了，转对方向
```

`BaseObstacle.scale` 最小，是故意的——宁可让其他项权重更高。如果真的接近障碍物，DWB 的障碍物代价会指数增长（回到代价地图的 `cost_scaling_factor`），所以只需很小的权重就能逼机器人避开障碍物。

### 5.3 Nav2 生命周期管理

Nav2 的各个组件是有依赖关系的：先有地图才能规划，先有定位才能控制。ROS2 用生命周期管理节点来处理这个顺序问题。

`lifecycle_manager` 节点负责按顺序激活所有 Nav2 节点：

```
1. 启动所有节点（未配置状态）
2. 配置 → 激活：按拓扑顺序（planner → controller → behavior server）
3. 监控节点健康：有节点挂了，重新激活
```

`autostart: true` 告诉 lifecycle_manager 一启动就自动配置和激活，不用手动干预。

---

## 六、完整数据流

把整个导航系统的数据流串起来：

```
地图文件 (my_map.yaml + my_map.pgm)
  │
  ▼
map_server ──► /map (OccupancyGrid, latched)

底盘 STM32 0xCC 帧 (/dev/ttyUSB1, 115200)
  │ x, y, θ (mm, mm, rad)
  ▼
chassis_bridge ──► /odom (Odometry)
              ──► /tf: odom → base_link

雷达 CH343 (/dev/ttyACM0, 230400)
  │ LSN10 协议
  ▼
lslidar_driver ──► /scan (LaserScan, 10Hz)

robot_state_publisher ──► /tf: base_link → laser, base_link → imu_link

── 以上三条汇聚到 AMCL ──

AMCL ──► /tf: map → odom (定位修正)
      ──► /amcl_pose (位姿估计)

── 地图 + 代价地图 + odom ──

global_costmap ──► planner_server (NavFn A*) ──► /plan (全局路径)
local_costmap  ──► controller_server (DWB)    ──► /cmd_vel (m/s, rad/s)
                                                      │
                                       wheeltec_chassis │
                                         0xBB 帧        │
                                         (mm/s, mrad/s) │
                                                         ▼
                                                  底盘 STM32
                                                   PID → 电机
```

数据流里最关键的一环是 `/tf: map → odom`。建图时这条 TF 由 Cartographer 发布，导航时由 AMCL 发布。它的物理含义是「里程计原点和地图原点的偏移量」——因为里程计是从上电位置开始算的（漂移累积），而地图有一个固定参考系。AMCL 通过粒子滤波估计这个偏移量，并在机器人运动过程中持续修正。

如果 `map → odom` 的 TF 突然跳了一大截（比如 AMCL 的粒子突然收敛到了另一个位置），`odom → base_link` 的所有子坐标系都会跟着跳——机器人看起来会「瞬移」，代价地图和规划路径也会瞬间失效。这就是为什么 AMCL 的 `recovery_alpha_slow` 参数（慢恢复权重）必须设成 0——我们宁可 AMCL 收敛慢一点，也不要它突然跳变。

---

## 七、构建过程与踩坑

### 7.1 从零复现步骤

1. **读底盘协议**：翻 `Serial.c` 确认 `0xBB`（速度指令 7 字节）和 `0xCC`（里程计 15 字节）的字节序和单位
2. **写 chassis_bridge.py**：状态机收 `0xCC` → 解析 float32 → 发布 `/odom` + 广播 TF；订阅 `/cmd_vel` → 大端 int16 组帧 `0xBB` → 串口下发
3. **配 nav2_params.yaml**：AMCL（500-2000 粒子，60 束激光，似然场模型）+ global/local costmap（膨胀 0.3m）+ NavFn 规划 + DWB 控制
4. **写 launch**：14 个节点——雷达、robot_state_publisher、底盘桥接、map_server、AMCL、5 个 Nav2 节点、lifecycle_manager、RViz
5. **编译**：Jetson 上 `colcon build --symlink-install`，缺 `libpcap-dev` 和 `diagnostic-updater` 两个依赖

### 7.2 踩坑

**坑一：colcon 装错路径**

编译日志显示 `Installing to /home/jiaxintang/ros2/install/`，但实际工作空间在 `wheeltec_ros2/install/`。根因是 `~/ros2/install/` 有残留的 `setup.bash`，colcon 误判了 install base。临时方案是每次编译前 `rm -rf` 那个孤儿目录，长期方案是删掉它或加 `COLCON_IGNORE`。

**坑二：launch 文件 LifecycleNode 缺 namespace**

Humble 版 `LifecycleNode` 必须显式传 `namespace=''`，否则 `TypeError: missing required keyword-only argument: 'namespace'`。PC 上没报是因为版本略新。

**坑三：velocity_smoother 的 remap 链**

controller 输出 `/cmd_vel_nav` → velocity_smoother 平滑 → `/cmd_vel` → chassis_bridge。如果 remap 漏了一环，机器人完全不响应目标点——命令发了但底盘收不到。这个要到实机测试才能验证通不通。

### 7.3 还没踩到的坑（待实机验证）

| 风险点 | 可能的现象 |
|--------|-----------|
| 底盘串口号不是 `/dev/ttyUSB1` | chassis_bridge 启动失败 |
| AMCL 初始位姿不对 | 粒子全发散，机器人瞬移到奇怪位置 |
| 膨胀半径 0.3m 不够/太多 | 撞墙 / 绕远路 |
| DWB 速度参数偏大 | Jetson 算不过来，控制延迟 |

---

## 八、文件清单

| 文件 | 说明 |
|------|------|
| `wheeltec_chassis/wheeltec_chassis/chassis_bridge.py` | 底盘串口桥接：0xCC → `/odom` + TF，`/cmd_vel` → 0xBB |
| `wheeltec_chassis/config/chassis.yaml` | 串口参数：port, baud, frame 名 |
| `wheeltec_nav2/config/nav2_params.yaml` | AMCL + 代价地图 + NavFn + DWB 全套参数 |
| `wheeltec_nav2/config/nav2.rviz` | 导航 RViz 布局 |
| `wheeltec_nav2/launch/navigation.launch.py` | 一键启动（14 个节点） |

## 九、启动命令

```bash
# 编译
cd ~/wheeltec_project/ros2_ws
colcon build --symlink-install

# 建图
source install/setup.bash
ros2 launch lslidar_driver lsn10_cartographer.launch.py

# 保存地图
ros2 run cartographer_ros cartographer_pbstream_to_ros_map \
  -pbstream_filename ~/.ros/cartographer.pbstream \
  -map_filestem ./my_map -resolution 0.05

# 导航
ros2 launch wheeltec_nav2 navigation.launch.py map:=./my_map.yaml
```

Rviz 操作：`2D Pose Estimate` 标初始位置 → `Nav2 Goal` 标目标点。

---

## 十、还未验证的部分

框架搭好了，但以下需要在 Jetson 上实机测试：

1. **底盘串口**：插上后确认设备名，改 `chassis.yaml`
2. **AMCL 定位精度**：粒子是否收敛，收敛速度是否合理
3. **代价地图膨胀半径**：0.3m 是否够——太大会绕远路，太小可能撞墙
4. **DWB 速度参数**：0.5 m/s 对实际场地是否太快/太慢
5. **速度平滑器**：controller → smoother → cmd_vel 的 remap 链是否正确
6. **首次全局定位**：Rviz 里用手动 `2D Pose Estimate` 还是加全局定位功能

> 本文部分内容由 AI 辅助整理和润色。
