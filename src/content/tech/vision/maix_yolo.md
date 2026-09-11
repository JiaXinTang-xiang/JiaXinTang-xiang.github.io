---
title: '记录MaixCAM2将YOLO11模型转换'
description: '本文参考官方教程,导出模型'
publishDate: '2026-07-15'
updatedDate: '2026-07-15'
tags:
  - YOLO11
  - MaixCAM2
  - ONNX
  - 模型部署
language: 'Chinese'
draft: false
slug: 'vision/maix-yolo'
heroImage: { src: './images/maix_yolo/cover.jpg', color: '#4A90E2' }
---

## 前言

前几天买了一个maixcan2，作为今年电赛的使用，本文记录使用maixcam2跑yolo的过程，仅供参考，以[官方教程](https://wiki.sipeed.com/maixpy/doc/zh/ai_model_converter/maixcam2.html)为主。

有开源在maixhub上：[具体可以看](https://maixhub.com/share/125)

---

## 一、烧录镜像

这个下面是官方的要求，可见yolo模型和镜像的版本相关，具体烧录可以看这里[MaixCAM MaixPy 升级和烧录系统](https://wiki.sipeed.com/maixpy/doc/zh/basic/upgrade.html),我这次烧录的是4.12.5。
```
MaixPy 默认提供了 YOLOv5 , YOLOv8 , YOLO11 , YOLO26 模型，可以直接使用：
YOLOv8 需要 MaixPy >= 4.3.0。
YOLO11 需要 MaixPy >= 4.7.0。
YOLO26 需要 MaixPy >= 4.12.5。
```

---

## 步骤1：ONNX 导出

电脑上训练的模型后的模型是best.pt不能直接给 MaixCAM2 使用，硬件性能有限，需要将模型进行INT8量化以减少计算量，并且转换为 MaixCAM2 支持的模型格式MUD。

MUD是 MaixPy 支持的一种模型描述文件，用来统一不同平台的模型文件，方便 MaixPy 代码跨平台，本身是一个 ini格式的文本文件，可以使用文本编辑器编辑。

### 方法一：完整 ONNX 导出

这个代码是简单的转换，读者可以自行修改参数。笔者开始用的是这个方法，后来发现需要裁剪节点，读者可以看下面的方法二。我用的是方法1，后面在转换脚本那里裁剪。

```python
from ultralytics import YOLO

model = YOLO('runs/detect/train9/weights/best.pt')

model.export(
    format='onnx',
    imgsz=640,        # 和训练时一致
    opset=12,         # OpenCV 兼容性最好的 opset 版本
    simplify=True     # 简化模型，推理更快
)
```

### 方法二：ONNX 裁剪节点

这里是从官方贴过来的，[自行跳转](https://wiki.sipeed.com/maixpy/doc/zh/ai_model_converter/onnx_export.html)，核心就是用 `extract_onnx.py` 提取节点：

```python
import onnx
import sys

input_path = sys.argv[1]
output_path = sys.argv[2]
input_names_str = sys.argv[3]
output_names_str = sys.argv[4]
input_names = []
for s in input_names_str.split(","):
    input_names.append(s.strip())
output_names = []
for s in output_names_str.split(","):
    output_names.append(s.strip())
onnx.utils.extract_model(input_path, output_path, input_names, output_names)
```

用法：`python extract_onnx.py $model_path $onnx_extracted $input_names $output_names`

或者直接一行命令：

```bash
python -c "import onnx,sys; onnx.utils.extract_model(sys.argv[1], sys.argv[2], [s.strip() for s in sys.argv[3].split(',')], [s.strip() for s in sys.argv[4].split(',')])" yolo11n.onnx export.onnx "images" "/model.23/Concat_output_0,/model.23/Concat_1_output_0,/model.23/Concat_2_output_0"
```

其中 `yolo11n.onnx`、`export.onnx`、`"images"`、`"/model.23/Concat_output_0,..."` 依次替换成你自己的 `$model_path`、`$onnx_extracted`、`$input_names`、`$output_names`。

此时得到的 `export.onnx` 就是裁剪后的新 ONNX 文件，可以继续下一步了。

---

## 步骤2：把用到的文件cp到 ubuntu20

校准图片还需要 ≥200 张训练样本（.jpg/.png），记得cp过去，我传是测试集val。

另外就是转好的best.onnx镜像也cp过去，一共两个

## 步骤3：安装模型转换环境

这里我选用的是ubuntu20上根据官方教程使用pulsar2 Docker 镜像，用的是虚拟机，读者自行判断选择。

### 下载 pulsar2 Docker 镜像

[下载地址modelscope](https://www.modelscope.cn/models/AXERA-TECH/Pulsar2/files)

滑到下面选择最新的版本，我选这个的是6.0.我虚拟机没啥内存选择安装`ax_pulsar2_6.0_lite.tar.gz`有1G多,后面补了几个包才能转，读者有内存推荐安装`ax_pulsar2_6.0.tar.gz`更好。

我缺的包一条命令补上：

```bash
pip install onnx onnxsim -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
```

---

### Docker 环境搭建

```bash
# 首次加载镜像
sudo docker load -i /home/uu20/下载/ax_pulsar2_6.0_lite.tar.gz
sudo docker images | grep pulsar2

# 启动容器（取名，去掉 --rm 保留环境）
cd /home/uu20/桌面/yolo/yolo11
sudo docker run -it --net host --name yolo_build -v ./:/data pulsar2:6.0-lite
```

> ⚠️ **注意：**
> 我用完不小心就把容器删除了。第一次没加 `--name`，也没去掉 `--rm`。退出容器后环境全丢——装的 `onnxsim` 没了，中间产物也没了。
>
> **解决：** 去掉 `--rm`，加 `--name yolo_build` 命名。下次用 `docker start -ai yolo_build` 回来，环境完好：
>
> ```bash
> sudo docker start -ai yolo_build
> cd /data && bash build_yolo11.sh best
> ```

---

## 步骤4：ONNX → axmodel 转换

进入容器后：

```bash
cd /data

# 首次安装依赖（仅一次）
pip install onnx onnxsim -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com

# 一键转换（约 15-20 分钟）
bash build_yolo11.sh best
```

`build_yolo11.sh best` 做了五件事：

| 步骤 | 说明 | 产物 | 耗时 |
|------|------|------|------|
| Step 0 | `restructure_onnx.py` 重构：6 Conv → 3 per-scale 4D Concat | `tmp1/best_restructured.onnx` | < 1 min |
| Step 1 | `extract_onnx.py` 提取输出节点 | `tmp1/best_extracted.onnx` | < 1 min |
| Step 2 | `onnxsim` 简化 | `tmp1/best.onnx` | < 1 min |
| Step 3 | 打包校准图片 | `tmp_images/images.tar` | < 1 min |
| Step 4 | `pulsar2 build` NPU1 (vnpu) | `out/best_vnpu.axmodel` | ~8 min |
| Step 5 | `pulsar2 build` NPU2 (npu) | `out/best_npu.axmodel` | ~8 min |

**转换成功标志：**

```
========================================
转换完成! 输出文件在 out/ 目录:
  out/best_npu.axmodel
  out/best_vnpu.axmodel
========================================
```

6 个输出余弦相似度均 > 0.999 表示 INT8 量化精度接近无损。


脚本代码 `build_yolo11.sh`：

```bash
# !/bin/bash

set -e

############# 改成你的参数 ####################
model_name=$1                    # 运行: ./build_yolo11.sh best
model_path=./${model_name}.onnx  # best.onnx
images_dir=./val                 # 校准图片目录
images_num=200                   # 用200张校准
input_names=images               # ONNX 输入节点名

config_path=yolo11_build_config.json

output_nodes=(
    "/model.23/per_scale_concat_0_output_0"   # scale0 80x80 (96ch, 4D)
    "/model.23/per_scale_concat_1_output_0"   # scale1 40x40 (96ch, 4D)
    "/model.23/per_scale_concat_2_output_0"   # scale2 20x20 (96ch, 4D)
)
#############################################

# 拼接输出节点字符串

onnx_output_names=""
json_outputs=""

for node in "${output_nodes[@]}"; do
    if [ -n "$onnx_output_names" ]; then
        onnx_output_names="${onnx_output_names},"
    fi
    onnx_output_names="${onnx_output_names}${node}"

    json_outputs="${json_outputs}
    {
      \"tensor_name\": \"${node}\",
      \"dst_perm\": [0, 2, 3, 1]
    },"
done

json_outputs="${json_outputs%,}"

# 生成 pulsar2 config.json

cat > $config_path << EOF
{
  "model_type": "ONNX",
  "npu_mode": "NPU1",
  "quant": {
    "input_configs": [
      {
        "tensor_name": "${input_names}",
        "calibration_dataset": "tmp_images/images.tar",
        "calibration_size": ${images_num},
        "calibration_mean": [0, 0, 0],
        "calibration_std": [255, 255, 255]
      }
    ],
    "calibration_method": "MinMax",
    "precision_analysis": true
  },
  "input_processors": [
    {
      "tensor_name": "${input_names}",
      "tensor_format": "RGB",
      "tensor_layout": "NCHW",
      "src_format": "RGB",
      "src_dtype": "U8",
      "src_layout": "NHWC",
      "csc_mode": "NoCSC"
    }
  ],
  "output_processors": [${json_outputs}
  ],
  "compiler": {
    "check": 3,
    "check_mode": "CheckOutput",
    "check_cosine_simularity": 0.9
  }
}
EOF

echo -e "\e[32m已生成配置文件: ${config_path}\e[0m"

# 创建校准图片打包脚本

cat > gen_cali_images_tar.py << 'PYTHON_SCRIPT'
import sys, os, random, shutil

images_dir = sys.argv[1]
images_num = int(sys.argv[2])

files = os.listdir(images_dir)
valid = []
for name in files:
    path = os.path.join(images_dir, name)
    ext = os.path.splitext(name)[1]
    if ext.lower() not in [".jpg", ".jpeg", ".png"]:
        continue
    valid.append(path)

print(f"images dir {images_dir} have {len(valid)} images")
if len(valid) < images_num:
    print(f"not enough images in {images_dir}, have: {len(valid)}, need {images_num}")
    sys.exit(1)

idxes = random.sample(range(len(valid)), images_num)
shutil.rmtree("tmp_images", ignore_errors=True)
os.makedirs("tmp_images/images")
for i in idxes:
    target = os.path.join("tmp_images", "images", os.path.basename(valid[i]))
    shutil.copyfile(valid[i], target)
os.chdir("tmp_images/images")
os.system("tar -cf ../images.tar *")
print("calibration tar created: tmp_images/images.tar")
PYTHON_SCRIPT

# 创建 onnx 提取脚本

cat > extract_onnx.py << 'PYTHON_SCRIPT'
import onnx, sys

input_path = sys.argv[1]
output_path = sys.argv[2]
input_names_str = sys.argv[3]
output_names_str = sys.argv[4]
input_names = [s.strip() for s in input_names_str.split(",")]
output_names = [s.strip() for s in output_names_str.split(",")]

onnx.utils.extract_model(input_path, output_path, input_names, output_names)
print(f"extracted onnx saved to: {output_path}")
PYTHON_SCRIPT

# 创建 ONNX 重构脚本（6 Conv → 3 per-scale Concat）

cat > restructure_onnx.py << 'PYTHON_SCRIPT'
import onnx
from onnx import helper, TensorProto
import sys

input_path = sys.argv[1]
output_path = sys.argv[2]

m = onnx.load(input_path)
graph = m.graph

all_outputs = {o for n in graph.node for o in n.output}

for i in range(3):
    cv2_name = f"/model.23/cv2.{i}/cv2.{i}.2/Conv_output_0"
    cv3_name = f"/model.23/cv3.{i}/cv3.{i}.2/Conv_output_0"
    if cv2_name not in all_outputs or cv3_name not in all_outputs:
        print(f"ERROR: scale {i} nodes not found")
        sys.exit(1)

    concat_out = f"/model.23/per_scale_concat_{i}_output_0"
    graph.node.append(helper.make_node(
        "Concat", inputs=[cv2_name, cv3_name], outputs=[concat_out],
        name=f"/model.23/per_scale_concat_{i}", axis=1
    ))
    graph.output.append(helper.make_tensor_value_info(
        concat_out, TensorProto.FLOAT, [1, 96, None, None]
    ))
    print(f"Scale {i}: {cv2_name} + {cv3_name} -> {concat_out}")

del graph.output[:3]  # 去掉旧输出，保留新 3 个
onnx.save(m, output_path)
print(f"Saved restructured ONNX to: {output_path}")
PYTHON_SCRIPT

# ========== 开始转换 ==========

mkdir -p tmp1
onnx_extracted=tmp1/${model_name}_extracted.onnx
onnxsim_path=tmp1/${model_name}.onnx

# Step 0: 重构 ONNX（将 6 个 Conv 按尺度合并为 3 个 4D Concat）

echo -e "\e[32mStep 0: 重构 ONNX 输出节点（per-scale Concat）\e[0m"
restructured_onnx=tmp1/${model_name}_restructured.onnx
python restructure_onnx.py $model_path $restructured_onnx

# Step 1: 提取输出节点

echo -e "\e[32mStep 1: 提取 ONNX 输出节点\e[0m"
python extract_onnx.py $restructured_onnx $onnx_extracted $input_names "$onnx_output_names"

# Step 2: onnxsim 简化

echo -e "\e[32mStep 2: ONNX 简化\e[0m"
onnxsim $onnx_extracted $onnxsim_path

# Step 3: 打包校准图片

echo -e "\e[32mStep 3: 打包校准图片\e[0m"
python gen_cali_images_tar.py $images_dir $images_num

mkdir -p out
tmp_config_path=tmp/$config_path

# Step 4: vnpu (NPU1, 一半算力)

echo -e "\e[32mStep 4: Building ${model_name}_vnpu.axmodel\e[0m"
rm -rf tmp
mkdir tmp
cp $config_path $tmp_config_path
sed -i '/npu_mode/c\"npu_mode": "NPU1",' $tmp_config_path
pulsar2 build --target_hardware AX620E --input $onnxsim_path --output_dir tmp --config $tmp_config_path
cp tmp/compiled.axmodel out/${model_name}_vnpu.axmodel

# Step 5: npu (NPU2, 全部算力)

echo -e "\e[32mStep 5: Building ${model_name}_npu.axmodel\e[0m"
rm -rf tmp
mkdir tmp
cp $config_path $tmp_config_path
sed -i '/npu_mode/c\"npu_mode": "NPU2",' $tmp_config_path
pulsar2 build --target_hardware AX620E --input $onnxsim_path --output_dir tmp --config $tmp_config_path
cp tmp/compiled.axmodel out/${model_name}_npu.axmodel

rm -rf tmp tmp1 tmp_images

echo -e "\e[32m========================================\e[0m"
echo -e "\e[32m转换完成! 输出文件在 out/ 目录:\e[0m"
echo -e "\e[32m  out/${model_name}_npu.axmodel\e[0m"
echo -e "\e[32m  out/${model_name}_vnpu.axmodel\e[0m"
echo -e "\e[32m========================================\e[0m"
```

> ⚠️ **注意：**
> MaixPy YOLO11 解码器需要 **3 个 4D Concat 输出**（每个尺度合并 bbox+cls），但 ultralytics 导出的 Concat 是跨尺度全局合并的 3D 输出。
>
> **解决：** `restructure_onnx.py` 在编译前将 6 个 Conv 输出按尺度合并为 3 个 4D Concat（`per_scale_concat_0/1/2`，axis=1，输出 `[N, 96, H, W]`），再送入 pulsar2。


---

## 步骤5：mud 配置文件

一共需要三个文件yolo11n.mud， yolo11n_npu.axmodel和yolo11n_vnpu.axmodel

```ini
[basic]
type = axmodel
model_npu = best_npu.axmodel
model_vnpu = best_vnpu.axmodel

[extra]
model_type = yolo11
type = detector
input_type = rgb
labels = R_R1, B_R1, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, F18, F19, F20, F21, F22, F23, F24, F25, F26, F27, F28, F29, F30, F31, F32

input_cache = true
output_cache = true
input_cache_flush = false
output_cache_inval = true

mean = 0, 0, 0
scale = 0.00392156862745098, 0.00392156862745098, 0.00392156862745098
```

可以看到， 指定了模型类别为axmodel, 模型路径为相对mud文件的路径下的*.axmodel文件；

**字段说明：**

| 字段 | 说明 |
|------|------|
| `type = axmodel` | MaixCAM2 模型格式 |
| `model_type = yolo11` | MaixPy YOLO11 解码器 |
| `model_npu` | 全 NPU 算力模型 |
| `model_vnpu` | AI-ISP 模式下半算力模型 |
| `labels` | 32 个类名，逗号分隔，顺序必须和训练一致 |
| `mean / scale` | 预处理参数（`1/255 ≈ 0.00392`，已在模型中集成） |

---

## 步骤6：部署到 MaixCAM2

```bash
scp out/best_npu.axmodel root@maixcam2:/root/
scp out/best_vnpu.axmodel root@maixcam2:/root/
scp best.mud root@maixcam2:/root/
```
或用 ADB / U 盘。

---

## 步骤7：MaixPy 运行

main.py
```python
from maix import camera, display, image, nn, app, comm
import struct, os, time

report_on = True
APP_CMD_DETECT_RES = 0x02
CONF_TH = 0.50
IOU_TH = 0.45


def encode_objs(objs):
    body = b''
    for obj in objs:
        body += struct.pack("<hhHHHf", obj.x, obj.y, obj.w, obj.h, obj.class_id, obj.score)
    return body


def find_model():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    except Exception:
        base_dir = "."
    candidates = [
        os.path.join(base_dir, "best.mud"),
        "best.mud",
        "/root/best.mud",
        "/root/models/best/best.mud",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    raise RuntimeError("best.mud not found")


model_path = find_model()
detector = nn.YOLO11(model=model_path, dual_buff=True)

cam = camera.Camera(detector.input_width(), detector.input_height(), detector.input_format())
dis = display.Display()
p = comm.CommProtocol(buff_size=1024)

last_heartbeat_ms = 0

while not app.need_exit():
    try:
        img = cam.read()
        if img is None:
            continue

        objs = detector.detect(img, conf_th=CONF_TH, iou_th=IOU_TH)

        if len(objs) > 0 and report_on:
            body = encode_objs(objs)
            p.report(APP_CMD_DETECT_RES, body)

        for obj in objs:
            img.draw_rect(obj.x, obj.y, obj.w, obj.h, color=image.COLOR_RED)
            label = detector.labels[obj.class_id] if obj.class_id < len(detector.labels) else str(obj.class_id)
            msg = f'{label}: {obj.score:.2f}'
            y = obj.y if obj.y > 12 else 12
            img.draw_string(obj.x, y - 12, msg, color=image.COLOR_RED)
        dis.show(img)

        # 每秒心跳
        now_ms = time.ticks_ms()
        if now_ms - last_heartbeat_ms > 1000:
            p.report(0x01, struct.pack("<I", now_ms))
            last_heartbeat_ms = now_ms

    except Exception as e:
        print(f"loop error: {e}")
        continue
```
就可以成功运行了

---

## 快速命令速查

```bash
# === 从零开始 ===
cd /home/uu20/桌面/yolo/yolo11

# 进容器（首次）
sudo docker run -it --net host --name yolo_build -v ./:/data pulsar2:6.0-lite

# 容器内
pip install onnx onnxsim -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
bash build_yolo11.sh best
exit

# 以后再进
sudo docker start -ai yolo_build

# 部署
scp out/best_npu.axmodel out/best_vnpu.axmodel best.mud root@maixcam2:/root/
```

---

## 写在最后

虽然跑通了一个教程，但是要明白**跑通过程中每一步都知道为什么**。

接下来的可以做：

- **替换 MaixCAM2 内置模型**——用自己的 32 类模型跑实时检测，对比内置模型的精度和速度
- **量化感知训练（QAT）**——pulsar2 的 INT8 量化余弦相似度 > 0.999 已经很好，但如果某些类别精度掉得厉害，QAT 是下一道防线
- **模型剪枝 + 知识蒸馏**——YOLO11 在 640×480 上跑 NPU 够用，但如果要上更高分辨率或更低延迟，需要更小的 backbone

完成
---


## 参考

- MaixPy YOLO11 文档：https://wiki.sipeed.com/maixpy/doc/cn/course/basic/ai/yolo11.html
- Pulsar2 使用指南：https://pulsar2-docs.readthedocs.io/
- Sipeed 模型转换教程：https://wiki.sipeed.com/maixpy/doc/cn/course/ai/deploy/maixcam2.html
- Sipeed 下载站：https://dl.sipeed.com/shareURL/MaixCAM/MaixCAM2/tools
- ONNX 模型可视化：https://netron.app/
- YOLO11 ultralytics 文档：https://docs.ultralytics.com/
