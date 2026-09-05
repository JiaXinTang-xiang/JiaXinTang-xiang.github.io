---
title: '从零构建 Nav2 仿真机器人：一条命令的背后'
description: '不跑现成的 TurtleBot3，写 URDF、传感器插件、EKF 融合、Nav2 导航栈，完整记录学习过程'
publishDate: '2026-06-29'
updatedDate: '2026-06-29'
tags:
  - ROS 2
  - Nav2
  - Gazebo
  - 机器人
  - 仿真
language: 'Chinese'
draft: false
slug: 'sam-bot-from-scratch'
heroImage: { src: './images/sam_bot/cover.png', color: '#0d1117' }
---

## 前言
部分 Nav2 教程都是这样开始的：

```bash
ros2 launch nav2_bringup tb3_simulation_launch.py headless:=False
```

一行命令，Gazebo 打开，TurtleBot3 出现，RViz 里点几下，机器人开始导航。十分钟跑通，然后呢？URDF 是什么？`odom -> base_link` 的 TF 是哪里来的？`/cmd_vel` 发出去之后发生了什么？

这条命令背后压缩了一整套机器人系统的知识。

本文记录我照着 Nav2 官方文档 "First-Time Robot Setup Guide" 从零构建 `sam_bot` 的完整过程——不跑现成的 TurtleBot3，手写 URDF、传感器插件、EKF 融合、Nav2 导航栈，把仿真机器人的每一层拆开来看。

**环境**：Ubuntu 22.04，ROS 2 Humble，Gazebo Classic 11.10.2。

---
## 一、环境踩坑 + 第一个 URDF

### 1.1 环境踩坑

第一次跑 TB3 仿真，gzserver 崩溃（exit code 255）。两个原因：残留进程占端口 + `models.gazebosim.org` 被墙导致 Gazebo 启动卡死，`spawn_entity.py` 30秒超时退出。清进程加三行环境变量解决：

```bash
killall -9 gzserver gzclient
export TURTLEBOT3_MODEL=waffle
export GAZEBO_MODEL_PATH=/opt/ros/humble/share/turtlebot3_gazebo/models:/usr/share/gazebo-11/models
export GAZEBO_MODEL_DATABASE_URI=""
```

加完 `GAZEBO_MODEL_DATABASE_URI=""` 后，`/spawn_entity` 服务从 60+ 秒降到 1 秒出现。

### 1.2 创建工作区和包

```bash
mkdir -p ~/sam_bot_ws/src && cd ~/sam_bot_ws/src
ros2 pkg create --build-type ament_cmake sam_bot_description
sudo apt install ros-humble-joint-state-publisher-gui ros-humble-xacro
```

### 1.3 第一个 URDF：只能看的外壳

URDF 使用 xacro（XML 宏）定义常量，后面用 `${base_width}` 引用，改一个数字自动更新全局：

```xml
<xacro:property name="base_width" value="0.31"/>   <!-- 车宽 31cm -->
<xacro:property name="base_length" value="0.42"/>   <!-- 车长 42cm -->
<xacro:property name="base_height" value="0.18"/>   <!-- 车高 18cm -->
<xacro:property name="wheel_radius" value="0.10"/>  <!-- 轮半径 10cm -->
<xacro:property name="wheel_width" value="0.04"/>   <!-- 轮宽 4cm -->
```

机器人主体——一个青色盒子（0.42m x 0.31m x 0.18m）。三个子标签各司其职：

| 标签 | 用途 |
|------|------|
| `<visual>` | RViz 显示用的外观（颜色、形状），不影响物理 |
| `<collision>` | Gazebo 碰撞检测的边界盒 |
| `<inertial>` | 质量、转动惯量，Gazebo 物理计算用 |

```xml
<link name="base_link">
  <visual>
    <geometry><box size="${base_length} ${base_width} ${base_height}"/></geometry>
    <material name="Cyan"><color rgba="0 1.0 1.0 1.0"/></material>
  </visual>
  <collision>
    <geometry><box size="${base_length} ${base_width} ${base_height}"/></geometry>
  </collision>
</link>
```

`base_footprint` 是空链接（无尺寸），垂直投影到地面的机器人中心。Nav2 用它做三件事：
- 计算避障范围（以 base_footprint 为圆心）
- 判断机器人是否到达目标
- 全局规划器中做碰撞检查

```xml
<link name="base_footprint"/>
<joint name="base_joint" type="fixed">
  <parent link="base_link"/>
  <child link="base_footprint"/>
  <origin xyz="0.0 0.0 ${-(wheel_radius+wheel_zoff)}" rpy="0 0 0"/>
</joint>
```

`type="fixed"` = 刚性连接，无相对运动。z 偏移 = -(0.10+0.05) = -0.15m，即 base_link 中心向**下** 15cm 投影到地面。

### 1.4 差速驱动轮

宏定义 + 两次调用 = 左右两个后轮。joint 类型 `continuous` = 无限旋转关节（没有角度限制），绕 Y 轴转。这就是差速驱动的物理基础：**左右轮速不同 → 机器人转弯**。

```xml
<xacro:macro name="wheel" params="prefix x_reflect y_reflect">
  <link name="${prefix}_link">
    <visual>
      <origin xyz="0 0 0" rpy="${pi/2} 0 0"/>
      <geometry><cylinder radius="${wheel_radius}" length="${wheel_width}"/></geometry>
      <material name="Gray"><color rgba="0.5 0.5 0.5 1.0"/></material>
    </visual>
    <collision>
      <origin xyz="0 0 0" rpy="${pi/2} 0 0"/>
      <geometry><cylinder radius="${wheel_radius}" length="${wheel_width}"/></geometry>
    </collision>
    <xacro:cylinder_inertia m="0.5" r="${wheel_radius}" h="${wheel_width}"/>
  </link>
  <joint name="${prefix}_joint" type="continuous">
    <parent link="base_link"/>
    <child link="${prefix}_link"/>
    <origin xyz="${x_reflect*wheel_xoff} ${y_reflect*(base_width/2+wheel_ygap)} ${-wheel_zoff}" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
  </joint>
</xacro:macro>

<xacro:wheel prefix="drivewhl_l" x_reflect="-1" y_reflect="1" />   <!-- 左后轮 -->
<xacro:wheel prefix="drivewhl_r" x_reflect="-1" y_reflect="-1" />  <!-- 右后轮 -->
```

`x_reflect="-1"` 表示轮子在 x 轴负方向（机器人后方），`y_reflect="1"` 表示在 y 轴正方向（左侧）。

前脚轮是球形、fixed 连接，不做驱动，只是支撑：

```xml
<link name="front_caster">
  <visual>
    <geometry><sphere radius="${(wheel_radius+wheel_zoff-(base_height/2))}"/></geometry>
    <material name="Cyan"><color rgba="0 1.0 1.0 1.0"/></material>
  </visual>
</link>
<joint name="caster_joint" type="fixed">
  <parent link="base_link"/>
  <child link="front_caster"/>
  <origin xyz="${caster_xoff} 0.0 ${-(base_height/2)}" rpy="0 0 0"/>
</joint>
```

### 1.5 配套文件

创建 launch 文件。三个 ROS 节点各司其职：

| 节点 | 作用 |
|------|------|
| `robot_state_publisher` | 读取 URDF，发布所有 fixed joint 的 TF（base_link -> base_footprint 等） |
| `joint_state_publisher` | 发布非 fixed joint 的 TF（驱动轮 continuous 旋转） |
| `rviz2` | 3D 可视化 |

```python
robot_state_publisher_node = Node(
    package='robot_state_publisher',
    executable='robot_state_publisher',
    parameters=[{'robot_description': Command(['xacro ', LaunchConfiguration('model')])}]
)
```

配置 RViz，Fixed Frame 设为 `base_link`，加上 Grid、RobotModel、TF 三个显示项。

`package.xml` 声明运行时依赖：`robot_state_publisher`、`joint_state_publisher_gui`、`rviz`、`xacro`。

`CMakeLists.txt` 用 `install(DIRECTORY src launch rviz DESTINATION share/${PROJECT_NAME})` 把文件复制到安装目录。

### 1.6 编译运行

```bash
cd ~/sam_bot_ws
colcon build
source install/setup.bash
ros2 launch sam_bot_description display.launch.py
```

RViz 弹出一个青色盒子的差速驱动机器人，两个灰轮，一个前脚轮。只有视觉外壳，没有任何物理能力。

### 1.7  的 TF 树

此时只有 robot_state_publisher 发布的 static transforms：

```
base_link（青色盒子，42cm x 31cm x 18cm）
  |
  +-- base_footprint（空链接，地面投影，z=-0.15m）
  |     Nav2 用来计算避障圆心
  |
  +-- drivewhl_l_link（左后轮，continuous 旋转）
  |
  +-- drivewhl_r_link（右后轮，continuous 旋转）
  |
  +-- front_caster（前脚轮，fixed）
```

完成了一个能在 RViz 里看的机器人模型。没有驱动、没有传感器、没有定位，它只是一堆坐标系堆出来的几何体。

### 1.8 项目文件结构

```
sam_bot_description/
  CMakeLists.txt                  # 安装规则
  package.xml                     # 依赖声明
  launch/display.launch.py        # 启动 RViz
  rviz/config.rviz                # RViz 布局
  src/description/
    sam_bot_description.urdf      # 机器人模型
```

---
## 二、装上引擎、眼睛和平衡感

Day 1 的 URDF 只能看。要让它在 Gazebo 里"动"起来，需要三个东西：**物理属性**（质量/惯量/碰撞）、**驱动**（接收 /cmd_vel 让轮子转）、**传感器**（感知环境）。

### 2.1 惯量宏

三个宏分别计算盒子、圆柱、球体的转动惯量。Gazebo 物理引擎需要这些来做碰撞反弹、加速减速：

```xml
<xacro:macro name="box_inertia" params="m w h d">
  <inertial>
    <origin xyz="0 0 0" rpy="${pi/2} 0 ${pi/2}"/>
    <mass value="${m}"/>
    <inertia ixx="${(m/12) * (h*h + d*d)}" ixy="0.0" ixz="0.0"
             iyy="${(m/12) * (w*w + d*d)}" iyz="0.0"
             izz="${(m/12) * (w*w + h*h)}"/>
  </inertial>
</xacro:macro>

<xacro:macro name="cylinder_inertia" params="m r h">
  <inertial>
    <origin xyz="0 0 0" rpy="${pi/2} 0 0" />
    <mass value="${m}"/>
    <inertia ixx="${(m/12) * (3*r*r + h*h)}" ixy="0" ixz="0"
             iyy="${(m/12) * (3*r*r + h*h)}" iyz="0"
             izz="${(m/2) * (r*r)}"/>
  </inertial>
</xacro:macro>
```

没有惯量，机器人会在 Gazebo 里直接穿过障碍物。

### 2.2 加物理属性

给 base_link 加碰撞区域，给 base_footprint 加惯性（kdl_parser 不赞成在根 link 加惯性）：

```xml
<!-- base_link 加碰撞 -->
<collision>
  <geometry><box size="${base_length} ${base_width} ${base_height}"/></geometry>
</collision>

<!-- base_footprint 加惯性 -->
<xacro:box_inertia m="15" w="${base_width}" d="${base_length}" h="${base_height}"/>
```

给脚轮加低摩擦（mu=0.001），让它在 Gazebo 里被动滚动而不是卡死。

### 2.3 差速驱动插件 —— "引擎"

这是最关键的插件——让轮子接收速度指令并转起来，同时发布里程计：

```xml
<gazebo>
  <plugin name='diff_drive' filename='libgazebo_ros_diff_drive.so'>
    <ros><namespace>/demo</namespace></ros>

    <left_joint>drivewhl_l_joint</left_joint>
    <right_joint>drivewhl_r_joint</right_joint>

    <wheel_separation>0.4</wheel_separation>    <!-- 左右轮中心距 0.4m -->
    <wheel_diameter>0.2</wheel_diameter>         <!-- 轮径 0.2m -->

    <max_wheel_torque>20</max_wheel_torque>
    <max_wheel_acceleration>1.0</max_wheel_acceleration>

    <publish_odom>true</publish_odom>            <!-- 发布里程计消息 -->
    <publish_odom_tf>false</publish_odom_tf>      <!-- 不发布 TF（留给 ekf_node） -->
    <publish_wheel_tf>true</publish_wheel_tf>

    <odometry_frame>odom</odometry_frame>
    <robot_base_frame>base_link</robot_base_frame>
  </plugin>
</gazebo>
```

**工作原理**：

Nav2 controller_server 发 `/cmd_vel`（例：linear.x=0.5m/s, angular.z=0.1rad/s）→ 插件拆成左右轮转速：

```
左轮转速 = (0.5 - 0.1 x 0.2) / 0.1 = 4.8 rad/s
右轮转速 = (0.5 + 0.1 x 0.2) / 0.1 = 5.2 rad/s
```

转速不同 → Gazebo 物理引擎驱动轮子 → 机器人转弯。

同时反算里程计：轮子转了 X 圈 → 走了 X x 周长 米 → 发布 `/odom`（nav_msgs/Odometry）。

`publish_odom_tf=false` 是因为后面 EKF 会统一发布 `odom -> base_link` 变换，让插件发会冲突。

### 2.4 IMU 传感器 —— "平衡感"

轮式里程计有一个致命缺陷：轮子打滑时，轮子转了但机器人没动，里程计漂移。IMU 的角速度不受打滑影响，100Hz 高频采样，短时精度极高：

```xml
<gazebo reference="imu_link">
  <sensor name="imu_sensor" type="imu">
    <plugin filename="libgazebo_ros_imu_sensor.so" name="imu_plugin">
      <ros><namespace>/demo</namespace><remapping>~/out:=imu</remapping></ros>
      <initial_orientation_as_reference>false</initial_orientation_as_reference>
    </plugin>
    <update_rate>100</update_rate>
    <imu>
      <angular_velocity>
        <x><noise type="gaussian"><mean>0.0</mean><stddev>2e-4</stddev>
             <bias_mean>0.0000075</bias_mean><bias_stddev>0.0000008</bias_stddev></noise></x>
        <!-- y, z 同理 -->
      </angular_velocity>
      <linear_acceleration>
        <x><noise type="gaussian"><mean>0.0</mean><stddev>1.7e-2</stddev>
             <bias_mean>0.1</bias_mean><bias_stddev>0.001</bias_stddev></noise></x>
        <!-- y, z 同理 -->
      </linear_acceleration>
    </imu>
  </sensor>
</gazebo>
```

噪声参数含义：
- `stddev=2e-4`：每次读数随机抖动
- `bias_mean=0.0000075`：IMU 静止也有非零读数（零偏）

### 2.5 EKF 融合 —— "定位系统"

轮子里程计 + IMU → ekf_node（扩展卡尔曼滤波），互补长短：

| | 轮式编码器 | IMU |
|------|------|------|
| 优势 | 线速度准确，短距离定位好 | 角速度高频采样，不受打滑影响 |
| 劣势 | 打滑漂移，长距累积误差 | 积分漂移 |
| 融合策略 | 线速度 X/Y + 角速度 Yaw | 只融合角速度 Yaw 修正朝向 |

配置文件 `config/ekf.yaml`：

```yaml
ekf_filter_node:
    ros__parameters:
        frequency: 30.0
        two_d_mode: false
        publish_acceleration: true
        publish_tf: true                           # 发布 odom -> base_link

        map_frame: map
        odom_frame: odom
        base_link_frame: base_link
        world_frame: odom

        odom0: demo/odom
        odom0_config: [false, false, false,        # X Y Z 位置 -> 不融（累积误差大）
                       false, false, false,        # roll pitch yaw -> 不融
                       true,  true,  false,        # 线速度 X Y 融合 ← 核心！
                       false, false, true,         # 角速度 Yaw 融合 ← 核心！
                       false, false, false]        # 线加速度 -> 忽略

        imu0: demo/imu
        imu0_config: [false, false, false,
                      false, false, false,
                      false, false, false,
                      false, false, true,          # 只融合角速度 Yaw
                      false, false, false]
```

15 位的 `odom0_config` 矩阵看着吓人，其实就一句话：**线速度信轮子，角速度两个都信，IMU 修正朝向漂移**。

EKF 还负责发布 `odom -> base_link` 的 TF（`publish_tf: true`）——这就是差速驱动设 `publish_odom_tf=false` 的原因：单点发布避免冲突。

### 2.6 激光雷达 —— "360 度眼睛"

```xml
<gazebo reference="lidar_link">
  <sensor name="lidar" type="ray">
    <ray>
      <scan>
        <horizontal>
          <samples>360</samples>              <!-- 360 个采样点 -> 1 度分辨率 -->
          <min_angle>0.000000</min_angle>
          <max_angle>6.280000</max_angle>     <!-- 360 度全覆盖 -->
        </horizontal>
      </scan>
      <range>
        <min>0.120000</min>                   <!-- 12cm 盲区 -->
        <max>3.5</max>                        <!-- 3.5m 最大距离 -->
      </range>
    </ray>
    <plugin name="scan" filename="libgazebo_ros_ray_sensor.so">
      <ros><remapping>~/out:=scan</remapping></ros>
      <output_type>sensor_msgs/LaserScan</output_type>
      <frame_name>lidar_link</frame_name>
    </plugin>
  </sensor>
</gazebo>
```

发布 `/scan`（sensor_msgs/LaserScan）。Nav2 用 `/scan` 做三件事：

- **slam_toolbox**：多帧拼接 → 全局地图 `/map`
- **nav2_amcl**：当前扫描 vs 地图 → 粒子滤波定位
- **nav2_costmap_2d**：扫描点标记为障碍物 → 局部/全局成本图

### 2.7 深度摄像头 —— "3D 感知"

```xml
<gazebo reference="camera_link">
  <sensor name="depth_camera" type="depth">
    <camera name="camera">
      <horizontal_fov>1.047198</horizontal_fov>   <!-- 60 度视场角 -->
      <image><width>640</width><height>480</height></image>
      <clip><near>0.05</near><far>3</far></clip>  <!-- 5cm-3m 范围 -->
    </camera>
    <plugin name="depth_camera_controller" filename="libgazebo_ros_camera.so">
      <frame_name>camera_depth_frame</frame_name>
    </plugin>
  </sensor>
</gazebo>
```

发布 `sensor_msgs/PointCloud2`（每次 640x480=30 万个 3D 点）。激光雷达只能扫 2D 平面，看不到高于或低于扫描面的物体（如桌子边缘），深度摄像头用 3D 点云补上这个盲区。

### 2.8 完成后的 TF 树

加了传感器后，TF 树从 Day 1 的 5 个 link 变成了 9 个：

```
base_link（主体，42cm x 31cm x 18cm，青色）
  |
  +-- base_footprint（地面投影，z=-0.15m）          ← Nav2 避障圆心
  |
  +-- imu_link（z=0.01m，固定）                     ← IMU 数据源坐标
  |
  +-- lidar_link（z=0.12m，360 度扫描）             ← /scan 数据源坐标
  |
  +-- camera_link（前方 0.215m，高 0.05m）          ← 摄像头壳体
  |     |
  |     +-- camera_depth_frame（rotated）           ← /depth_camera/points 数据源坐标
  |
  +-- drivewhl_l_link（左后轮，continuous 旋转）
  |
  +-- drivewhl_r_link（右后轮，continuous 旋转）
  |
  +-- front_caster（前脚轮，fixed，低摩擦）
```

**TF 变换的发布者**：
- `robot_state_publisher` → `/tf_static`：所有 static transforms（URDF 中的 fixed joint）
- `ekf_node` → `/tf`：`odom -> base_link`（融合里程计 + IMU）。Day 1 没有这个。

**为什么 odom TF 这么重要**：Nav2 的 local_costmap 需要 `base_link -> odom` 变换来知道机器人在里程计坐标系中的位置。没有它，costmap 会反复报：
```
Timed out waiting for transform from base_link to odom to become available
```

### 2.9 数据流总结

```
Gazebo 仿真侧                            ROS 2 节点侧
=============                           ============

IMU 传感器 --> /demo/imu --+---------> ekf_node --> /odometry/filtered
                           |                        --> /tf: odom -> base_link
差速驱动   --> /demo/odom -+                         --> /accel/filtered

关节发布   --> /joint_states --> robot_state_publisher --> /tf_static (static)

激光雷达   --> /scan  (sensor_msgs/LaserScan)
深度摄像头 --> /depth_camera/points  (sensor_msgs/PointCloud2)
            --> /depth_camera/image_raw  (sensor_msgs/Image)

差速驱动   <-- /demo/cmd_vel <-- Nav2 controller_server
```

---
## 三、接入 Nav2 导航栈

Day 2 的机器人有了感官和动力，但它不知道：环境什么样子（建图）、自己在地图上的位置（定位）、从 A 去 B 怎么走（规划）、路上有障碍怎么避（控制）。Day 3 就是接上 Nav2 解决这四个问题。

### 3.1 话题名标准化

Day 2 的 URDF 给差速驱动和 IMU 加了 `<namespace>/demo</namespace>`，话题都变成了 `/demo/odom`、`/demo/cmd_vel`、`/demo/imu`。但 Nav2、slam_toolbox 等标准包只认 `/odom`、`/cmd_vel`、`/imu`。

修改：

1. URDF：删除所有 `<namespace>/demo</namespace>`
2. `ekf.yaml`：`odom0: odom`、`imu0: imu`

| 话题 | 标准化前 | 标准化后 |
|------|------|------|
| 里程计 | `/demo/odom` | `/odom` |
| IMU | `/demo/imu` | `/imu` |
| 速度指令 | `/demo/cmd_vel` | `/cmd_vel` |
| 激光扫描 | `/scan`（不变） | `/scan` |

### 3.2 三终端启动架构

完整的导航系统需要三个角色同时运行：

```
终端 1：sam_bot + Gazebo（硬件仿真层）
    启动的节点：Gazebo、robot_state_publisher、joint_state_publisher、ekf_node、rviz2
    输出：/odom、/scan、/tf、/tf_static、/depth_camera/points

终端 2：slam_toolbox（感知层）
    启动：ros2 launch slam_toolbox online_async_launch.py use_sim_time:=true
    输入：/scan
    输出：/map（全局栅格地图）+ /tf: map -> odom

终端 3：Nav2 导航栈（决策层）
    启动：ros2 launch nav2_bringup navigation_launch.py params_file:=... use_sim_time:=true
    输入：/map、/odom、/scan、/tf
    输出：/cmd_vel、/plan、/local_plan、/global_costmap/costmap、/local_costmap/costmap
```

### 3.3 新踩的一个坑：多终端 DDS 发现失败

三个终端开着，执行 `ros2 run tf2_tools view_frames`，TF 树为空——`frame_yaml='[]'`。`ros2 node list` 只能看到当前终端启动的节点。

原因：`ROS_LOCALHOST_ONLY=1` 只设在了终端 1。ROS 2 默认用 DDS 多播发现节点，它只在本机 127.0.0.1 上工作。终端 2/3 没设这个变量，尝试走网卡多播，但多播被网卡/防火墙拦截，节点互相发现不了。

**每个终端都要加 `export ROS_LOCALHOST_ONLY=1`。** 推荐直接写入 `~/.bashrc`。

### 3.4 slam_toolbox：SLAM 建图 + 定位

slam_toolbox 订阅 `/scan`（sensor_msgs/LaserScan，360 度，5Hz），做两件事：

1. **在线异步建图**：每帧新数据通过 scan-to-map matching 融入已有地图 → 地图持续增长
2. **定位**：当前扫描 vs 已有地图 → 匹配最佳位姿 → 发布 `map -> odom` 变换纠正里程计漂移

```bash
ros2 launch slam_toolbox online_async_launch.py use_sim_time:=true
```

就绪标志：日志出现 `Registering sensor: [Custom Described Lidar]`。

### 3.5 Nav2 导航栈启动

```bash
ros2 launch nav2_bringup navigation_launch.py \
  params_file:=/path/to/nav2_params.yaml \
  use_sim_time:=true
```

这个 launch 文件启动了 Nav2 的所有核心节点：

| 节点 | 功能 |
|------|------|
| `planner_server` | NavFn 全局路径规划器（A*/Dijkstra 网格搜索） |
| `controller_server` | DWB 局部控制器（改进动态窗口法） |
| `behavior_server` | 恢复行为：spin、backup、wait |
| `bt_navigator` | 行为树导航主逻辑 |
| `smoother_server` | 路径平滑 |
| `velocity_smoother` | 速度平滑（防急加速/急刹） |
| `waypoint_follower` | 多点导航 |
| `global_costmap` | 全局成本图（40x40m 全地图） |
| `local_costmap` | 局部成本图（3x3m 滑动窗口） |
| `lifecycle_manager_navigation` | 自动激活/停用各生命周期节点 |

### 3.6 costmap 两层架构

```
/map（SLAM 输出）---------> global_costmap
                              坐标系：map
                              更新：1 Hz
                              图层：static_layer（地图）+ obstacle_layer（扫描）+ inflation_layer（膨胀）
                              足迹：圆形（robot_radius=0.3m）
                              用途：全局路径规划
                                   |
                                   v
                              /plan（全局路径）
                                   |
/odom（里程计）-----------> local_costmap
                              坐标系：odom
                              大小：3x3m 滚动窗口
                              更新：5 Hz
                              图层：voxel_layer（3D 体素）+ inflation_layer（膨胀）
                              足迹：矩形 polygon [[0.21,0.195]...]
                              用途：局部避障、轨迹优化
                                   |
                                   v
                         /local_plan（局部轨迹）-> /cmd_vel
```

为什么全局用圆形、局部用矩形：

| | 局部 costmap（矩形） | 全局 costmap（圆形） |
|------|------|------|
| 规划器 | DWB 控制器 | NavFn（A*） |
| 碰撞检查 | 多边形精确匹配 | 网格单元格圆形近似 |
| 是否需要真实形状 | 需要：局部避障要求高 | 不需要：网格只查格点 |

### 3.7 规划器和控制器

**全局规划器 NavFn**：把全局 costmap 当成带权重的网格，在 (0,0) 到 (目标X, 目标Y) 之间用 Dijkstra/A* 搜索一条代价最低的路径。代价 = 距离 + 障碍物膨胀值。输出 `/plan`（nav_msgs/Path）。

**局部控制器 DWB**：收到全局路径后，在 local_costmap（3m x 3m 滑动窗口）上做精细避障：

1. **TrajectoryGenerator** 生成候选轨迹——遍历各种 (线速度, 角速度) 组合，模拟每根轨迹前向 2.5s 的走向
2. **9 个 Critic 插件**逐一打分：

| Critic | 评分维度 |
|------|------|
| ObstacleFootprintCritic | 碰撞风险——离障碍物越远越好 |
| PathAlignCritic | 与全局路径的偏差 |
| PathDistCritic | 离全局路径终点的距离 |
| GoalAlignCritic | 朝向最终目标的角度 |
| GoalDistCritic | 离最终目标的距离 |
| OscillationCritic | 防止来回震荡（来回切换方向） |
| RotateToGoalCritic | 原地旋转到目标方向 |
| BaseObstacleCritic | 底座碰撞风险 |
| PreferForwardCritic | 倾向前进（不倒车） |

3. 总分最高的轨迹 → 发布 `/cmd_vel`（geometry_msgs/Twist）

### 3.8 配置文件：nav2_params.yaml

从 Nav2 默认参数复制并改了三个地方：

**局部 costmap（矩形足迹）**：
```yaml
local_costmap:
  local_costmap:
    ros__parameters:
      footprint: "[ [0.21, 0.195], [0.21, -0.195], [-0.21, -0.195], [-0.21, 0.195] ]"
```

四个点围成的矩形：长 0.42m x 宽 0.39m，贴合 sam_bot 外形。

**全局 costmap（圆形足迹）**：
```yaml
global_costmap:
  global_costmap:
    ros__parameters:
      robot_radius: 0.3    # 矩形对角线 sqrt(0.21^2+0.195^2) ~ 0.286, 取 0.3 加安全边距
```

**AMCL**：
```yaml
amcl:
  ros__parameters:
    base_frame_id: "base_footprint"
    global_frame_id: "map"
    odom_frame_id: "odom"
    scan_topic: scan
```

### 3.9 让机器人动起来

在 RViz 里：

1. 点 **2D Pose Estimate** → 在地图上设初始位姿（告诉 AMCL"我在这"）
2. 点 **Navigation2 Goal** → 在地图上设目标点（"去那"）
3. slam_toolbox 一边建图，Nav2 一边在地图已知部分规划路线
4. 轮子动了——`/cmd_vel` 从 Nav2 -> 差速驱动插件 -> Gazebo 物理引擎 -> 里程计反馈 -> EKF 更新 -> TF 更新 -> 闭环

### 3.10 Day 3 完成后的完整 TF 树

```
map（全局固定坐标系，SLAM 起点）
  ^
  | slam_toolbox 发布 map -> odom（scan-to-map matching 持续纠正漂移）
  |
odom（里程计坐标系，连续平滑但随时间漂移）
  ^
  | ekf_node 发布 odom -> base_footprint（融合 /odom + /imu）
  |
base_footprint（地面投影，避障圆心，z = -(wheel_radius + wheel_zoff) = -0.15m）
  ^
  | robot_state_publisher 发布 base_footprint -> base_link（URDF static joint）
  |
base_link（机器人主体中心，42cm x 31cm x 18cm）
  |
  +-- imu_link（z=0.01m，IMU 传感器坐标，fixed）
  |
  +-- lidar_link（z=0.25m，激光雷达坐标，360 度扫描，fixed）
  |
  +-- camera_link（前方 0.215m，高 0.05m，摄像头壳体，fixed）
  |     |
  |     +-- camera_depth_frame（rotated，深度图/点云坐标系，fixed）
  |
  +-- drivewhl_l_link（左后轮，continuous 旋转）
  |
  +-- drivewhl_r_link（右后轮，continuous 旋转）
  |
  +-- front_caster（前脚轮，fixed，低摩擦）
```

**这条变换链缺失任何一环，Nav2 全部报 "Timed out waiting for transform"。**

### 3.11 RViz 可视化清单

| 元素 | 添加方式 | Fixed Frame | 含义 |
|------|------|------|------|
| `/map` | By topic -> Map | map | SLAM 建立的实时栅格地图 |
| `/global_costmap/costmap` | By topic -> Map | map | 全局成本图（障碍物膨胀后） |
| `/local_costmap/costmap` | By topic -> Map，Color Scheme: costmap | odom | 局部 3x3m 滑动成本图 |
| `/local_costmap/published_footprint` | By topic -> Polygon | odom | 矩形足迹（0.42x0.39m） |
| `/global_costmap/published_footprint` | By topic -> Polygon | map | 圆形足迹（半径 0.3m） |
| `/plan` | By topic -> Path | map | 全局路径（蓝色粗线） |
| `/local_plan` | By topic -> Path | odom | 局部轨迹（绿色细线） |
| TF | Displays -> TF | -- | 所有 link 坐标轴 |
| RobotModel | Displays -> RobotModel | base_link | 机器人 3D 模型 |
| `/scan` | By topic -> LaserScan | odom | 激光雷达点云 |

### 3.12 项目文件结构（最终）

```
桌面/nav/
  .gitignore                          # 排除 build/ install/ log/
  day1.md                             # 学习日志
  day2.md
  day3.md
  camera_calibration.yaml             # 相机标定结果（独立实验）
  sam_bot_description/
    CMakeLists.txt                    # 安装规则
    package.xml                       # 依赖声明
    config/
      ekf.yaml                        # EKF 融合配置
      nav2_params.yaml                # Nav2 导航参数（足迹+AMCL+costmap+规划器+控制器）
    launch/
      display.launch.py               # 三终端合并主启动文件
    rviz/
      config.rviz                     # RViz 布局
    world/
      my_world.sdf                    # Gazebo 世界（地面+红色立方体+蓝色球体）
    src/description/
      sam_bot_description.urdf        # 机器人模型（9 links + 3 关节 + 5 Gazebo 插件）
      sam_bot_description.sdf         # SDF 版本（备用）
```

---
## 实物对照

仿真跑通后回头看，搞实物只要做好三件事，其余代码和仿真**完全一样**：

| 仿真做的事 | 实物要做的事 |
|------|------|
| `libgazebo_ros_diff_drive.so` 虚拟驱动 | 调通底盘串口/CAN -> 发布 `/odom` + 接收 `/cmd_vel` |
| `libgazebo_ros_ray_sensor.so` 虚拟激光 | 雷达 SDK -> 发布 `sensor_msgs/LaserScan` |
| `libgazebo_ros_imu_sensor.so` 虚拟 IMU | IMU SDK -> 发布 `sensor_msgs/Imu` |
| URDF 手写尺寸 | 量实物，改 URDF 数字 |
| `ekf.yaml`、`nav2_params.yaml` | **完全不变** |


## 和 TurtleBot3 的关系

学到这里，我已经可以用下面这条命令一键跑 TB3 仿真了：

```bash
export TURTLEBOT3_MODEL=waffle
ros2 launch nav2_bringup tb3_simulation_launch.py headless:=False slam:=True
```

现在再看这条命令弹出的每个节点、每个话题、每个 TF 变换——我能说出来源了。不是因为看了文档，是因为自己一行行写过。

`tb3_simulation_launch.py` 压缩的那几百行 launch 代码、几千行 URDF + 插件配置，sam_bot 就是它的拆解版。以后学习 TB3 的调参、行为树、写自定义插件，模型层面不用再花时间——因为底层原理已经在 sam_bot 上走了一遍。

## 写在最后

从一条跑不通的 `ros2 launch`，到 Gazebo 世界里一个会建图、会规划、会避障的自主导航机器人，三天做的事情其实就一个：

**理解自主导航机器人的七层架构**。

```
第 7 层：执行层    差速驱动 -> 轮子转 -> 里程计反馈 -> 闭环
第 6 层：决策层    costmap（环境建模）-> planner（全局路线）-> controller（局部避障）-> /cmd_vel
第 5 层：感知层    slam_toolbox -> 建图 + 定位
第 4 层：融合层    轮式里程计 + IMU -> EKF -> 平滑定位 + odom -> base_link TF
第 3 层：传感器层  激光雷达 + 深度摄像头 + IMU -> 发布标准化消息
第 2 层：硬件抽象  URDF + robot_state_publisher -> TF 变换树
第 1 层：仿真层    Gazebo 物理引擎 + 传感器噪声模型
```

很多 ROS 教程追求"十分钟跑通"的快感，但跑通之后面对报错一无所知。如果你也想真正理解 Nav2，建议别只跑那一条命令——拆开来看，每一层都值得。

---

*参考：Nav2 官方文档 [Setup Guide for Gazebo Classic](https://docs.nav2.org/setup_guides/gazebo_classic.html)*

> 本文部分内容由 AI 辅助整理和润色。
