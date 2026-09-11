---
title: 'OpenCV 从零开始：图像基础、特征匹配与相机几何'
description: '从 imread 到对极几何，三个阶段'
publishDate: '2026-06-30'
tags:
  - OpenCV
  - 计算机视觉
  - 特征匹配
  - 相机模型
  - 对极几何
  - 图像处理
  - PnP
language: 'Chinese'
draft: false
slug: 'vision/opencv-scr'
heroImage: { src: './images/opencv_scr/cover.png', color: '#1a1a2e' }
---

## 前言

相机标定跑通后，回头看 OpenCV 基础。标定之前 `imread` 只会默认参数，`cvtColor` 只知道 BGR2GRAY，滤波和形态学分不清，SIFT 知道名字但没亲手调过参数，E 矩阵 F 矩阵能背出公式但一行代码没写过。

用三个阶段的练习把这条线串起来：**图像基础 → 特征匹配 → 相机几何**。

环境：Ubuntu 22.04 + OpenCV 4.5.4 + C++17。

---

## 阶段一：图像 I/O 与基础滤波


> 覆盖：`imread` / `imwrite` / `cvtColor` / 像素遍历 / 4 种滤波 / 7 种形态学操作 / 3 种边缘检测 / 直方图与均衡化

程序按顺序弹出 7 组窗口，每组看完按任意键进入下一组。

### 1.1 imread 三种 flag

```cpp
Mat img_color = imread("images/test.jpg", IMREAD_COLOR);       // =1, 三通道 BGR
Mat img_gray  = imread("images/test.jpg", IMREAD_GRAYSCALE);   // =0, 单通道灰度
Mat img_unchg = imread("images/test_alpha.png", IMREAD_UNCHANGED); // =-1, 保留原格式
```

三个 flag 的区别不仅仅是通道数——内存占用、数据类型、后续能做的操作都不一样：

| Flag | 值 | 通道数 | 内存 (1322x2000) | 数据类型 | 适用场景 |
|------|----|--------|------------------|----------|----------|
| `IMREAD_COLOR` | 1 | 3 (BGR) | ~7.9 MB | `CV_8UC3` | 日常彩色处理；**顺序是 BGR 不是 RGB** |
| `IMREAD_GRAYSCALE` | 0 | 1 | ~2.6 MB | `CV_8UC1` | 特征检测、标定——信息量够，内存省 3 倍 |
| `IMREAD_UNCHANGED` | -1 | 1/3/4 | 取决于原图 | `CV_8UC1/3/4` | PNG 水印叠加、透明通道素材 |

实测输出：

```
COLOR      : [1322 x 2000]  channels=3
GRAYSCALE  : [1322 x 2000]  channels=1
UNCHANGED  : [3508 x 2480]  channels=4 (含 alpha)
```

一个容易被忽略但必须知道的坑：**`imread` 读图失败不抛异常，返回空 Mat**。你的代码不会 crash 在 `imread` 这行，会在后续 `imshow` 或像素访问时崩——排查起来费时间。永远加检查：

```cpp
Mat img = imread("path/to/image.jpg");
if (img.empty()) {
    cerr << "读图失败，检查路径" << endl;
    return -1;
}
```

`imwrite` 的输出格式由扩展名决定，压缩参数通过第三个参数控制：

```cpp
imwrite("out.jpg", img, {IMWRITE_JPEG_QUALITY, 95});       // JPG 质量 0-100
imwrite("out.png", img, {IMWRITE_PNG_COMPRESSION, 3});      // PNG 压缩 0-9
```

### 1.2 颜色空间转换：BGR、GRAY、HSV、Lab

OpenCV 默认 BGR 不是 RGB——这是历史遗留设计，早期相机驱动按 BGR 顺序输出，OpenCV 沿用了这个约定。和 PIL/Matplotlib 的 RGB 互转时必须做一步 `cvtColor`，否则整张图红蓝颠倒。

```cpp
Mat gray, hsv, lab;
cvtColor(bgr, gray, COLOR_BGR2GRAY);   // BGR -> 灰度
cvtColor(bgr, hsv,  COLOR_BGR2HSV);    // BGR -> HSV
cvtColor(bgr, lab,  COLOR_BGR2Lab);    // BGR -> Lab
```

三个颜色空间各司其职：

| 空间 | 通道含义 | 选它的原因 | 典型用途 |
|------|----------|-----------|----------|
| **Gray** | 0-255 亮度 | 信息量够，计算量只有彩色的 1/3 | 特征检测、标定、模板匹配 |
| **HSV** | H 色调 0-180, S 饱和度 0-255, V 明度 0-255 | 颜色和亮度解耦——H 通道不受光照影响 | **颜色分割首选**；设 H 范围就能抠出特定颜色 |
| **Lab** | L 亮度, a 绿-红, b 蓝-黄 | 感知均匀空间——L 通道做直方图均衡不会偏色 | 精确的颜色校正、图像增强 |

**OpenCV 中 H 值的范围是 0-180，不是 0-360。** 因为用 8-bit 存储，360 放不下。真实色调角度 = H * 2。

分离 HSV 三通道可以直接看到每个通道的信息：

```cpp
vector<Mat> channels;
split(hsv, channels);
// channels[0] = H (色调), channels[1] = S (饱和度), channels[2] = V (明度)
```

### 1.3 HSV 颜色提取实战

HSV 是颜色分割的首选空间——H 通道代表色调，和亮度解耦。OpenCV 中 H 范围是 0-180，S 和 V 是 0-255。`inRange` 函数把 HSV 图像中落在指定区间的像素置为 255（白），其余置 0（黑）：

```cpp
Mat hsv;
cvtColor(bgr, hsv, COLOR_BGR2HSV);
Mat mask;
inRange(hsv, Scalar(H_low, S_low, V_low), Scalar(H_high, S_high, V_high), mask);
```

常见颜色的 HSV 经验阈值（调参初值）：

| 颜色 | H 范围 | S 范围 | V 范围 |
|------|--------|--------|--------|
| 红色 | 0-10 或 156-180 | 43-255 | 46-255 |
| 绿色 | 35-77 | 43-255 | 46-255 |
| 蓝色 | 100-124 | 43-255 | 46-255 |
| 橙色 | 11-25 | 43-255 | 46-255 |
| 黄色 | 26-34 | 43-255 | 46-255 |

红色比较特殊——H 通道在 0 和 180 两端是红色（色相环闭合），需要分两段提取然后取并集：

```cpp
Mat red1, red2, red_mask;
inRange(hsv, Scalar(0,   43, 46), Scalar(10,  255, 255), red1);
inRange(hsv, Scalar(156, 43, 46), Scalar(180, 255, 255), red2);
bitwise_or(red1, red2, red_mask);  // 两段取并集
```

提取完通常加形态学开运算去噪点、闭运算填空洞。写一个 HSV 调参的交互界面很有用——六个滑动条（H/S/V 各两个），实时看效果，调试效率高十倍。

### 1.4 仿射变换与透视变换

仿射变换和透视变换在阶段二的图像拼接中已经用了（`warpPerspective`），这里把数学补上。

**仿射变换**是"线性变换 + 平移"。几何直观：把一个矩形橡皮片在角上推拉，变成任意平行四边形。保持平行性、直线比例、共线性不变，但长度和角度会变。

```
[x']   [a11 a12 tx] [x]
[y'] = [a21 a22 ty] [y]
[1 ]   [0   0   1 ] [1]
```

二维仿射有 6 个自由度。常见原子变换：平移、缩放、旋转、剪切。OpenCV 中 `getAffineTransform` 需要 **3 对**对应点（不在同一直线上），`warpAffine` 执行变换。

**透视变换**是更一般的投影变换——仿射是它的子集。透视变换不再保证平行性——原来的无穷远线经过变换后不再是无穷远线。

```
[x']   [h11 h12 h13] [x]
[y'] = [h21 h22 h23] [y]
[w']   [h31 h32 h33] [1]

实际像素:  u = x'/w', v = y'/w'
```

二维透视有 8 个自由度（9 个元素减 1 个尺度）。OpenCV 中 `getPerspectiveTransform` 需要 **4 对**对应点（任意三点不共线），`warpPerspective` 执行变换。

典型的透视变换应用：车道线俯视图转换（IPM）、车牌矫正、文档扫描。

**仿射 vs 透视 决策**：场景是平面且只需要保持平行性 → 仿射；需要模拟不同视角（近大远小）→ 透视。

### 1.5 图像混合、ROI 提取、像素遍历

**图像混合** `addWeighted` 是最常用的图像叠加方式：

```cpp
// dst = alpha * src1 + beta * src2 + gamma
addWeighted(img, 0.7, blurred, 0.3, 0, blended);
// 原图占 70%，高斯模糊占 30%，gamma=0
```

**ROI 提取**时 `.clone()` 不能随便省：

```cpp
Rect roi_rect(x, y, width, height);
Mat roi = img(roi_rect).clone();   // 深拷贝：roi 和 img 独立
Mat roi_alias = img(roi_rect);     // 浅拷贝：共享底层数据，改 roi_alias 会动 img
```

不写 `.clone()` 的 `roi_alias` 和原图共享数据——这有可能是你故意要的（零拷贝高效），也可能制造隐晦 Bug（以为改了局部图，结果把原图也改了）。

**像素遍历**有三种写法，计算结果完全一致，差异在性能和可读性：

```cpp
// 方式一：at<>()  有边界检查，安全但慢
int sum = 0;
for (int y = 0; y < gray.rows; y++)
    for (int x = 0; x < gray.cols; x++)
        sum += gray.at<uchar>(y, x);

// 方式二：ptr<>()  按行取指针，快一倍，工程代码标配
int sum = 0;
for (int y = 0; y < gray.rows; y++) {
    const uchar* row = gray.ptr<uchar>(y);
    for (int x = 0; x < gray.cols; x++)
        sum += row[x];
}

// 方式三：forEach()  C++11 lambda 并行，大数据量最快
int sum = 0;
gray.forEach<uchar>([&](uchar& pixel, const int* pos) {
    sum += pixel;
});
```

| 方式 | 速度 | 安全性 | 什么时候用 |
|------|------|--------|-----------|
| `at<uchar>(y,x)` | 慢（每次调边界检查） | 最高 | 快速原型、调试 |
| `ptr<uchar>(y)` | 快 | 无检查 | **工程代码默认选这个** |
| `forEach(lambda)` | 最快（多核） | 无检查 | 大图批量处理 |

### 1.6 基础滤波：均值 / 高斯 / 中值 / 双边

滤波器的测试有个好习惯：**先人为加噪声，再看滤波器怎么应对**。椒盐噪声是测试滤波器的"试金石"——随机散布黑点和白点，模拟传感器坏点：

```cpp
RNG rng(12345);
for (int i = 0; i < 2000; i++) {
    int x = rng.uniform(0, noisy.cols);
    int y = rng.uniform(0, noisy.rows);
    noisy.at<Vec3b>(y, x) = (rng.uniform(0, 2) == 0)
        ? Vec3b(0, 0, 0) : Vec3b(255, 255, 255);
}
```

四种滤波的核心差异和适用原则：

| 滤波 | API 调用 | 核心思想 | 椒盐效果 | 边缘保留 | 速度 | 适用场景 |
|------|---------|----------|---------|---------|------|----------|
| **均值** | `blur(noisy, dst, Size(5,5))` | 邻域算术平均 | 差——椒盐变灰斑 | 否 | 最快 | 快速降噪，不关心细节 |
| **高斯** | `GaussianBlur(noisy, dst, Size(5,5), 0)` | 加权平均 (中心权重大) | 中等 | 否 | 快 | 高斯噪声、平滑预处理 |
| **中值** | `medianBlur(noisy, dst, 5)` | 取邻域中位数 | **最佳**——椒盐被彻底抹掉 | 较好 | 中等 | **传感器噪点首选** |
| **双边** | `bilateralFilter(src, dst, 9, 75, 75)` | 空间距离 + 像素值差异 | 不对症 | **最好** | 最慢 | 美颜磨皮、需要保留边缘 |

选型决策树：
```
椒盐噪声？ → 中值滤波
高斯噪声？ → 高斯滤波
要保边缘？ → 双边滤波（忍受慢）
都不在乎？ → 均值滤波（最快）
```

双边滤波的三个参数各有分工：`d=9` 是邻域直径，`sigmaColor=75` 控制"像素值差多少才算边缘"（值越大越模糊），`sigmaSpace=75` 控制"空间上多远算邻域"（值越大越模糊）。

### 1.7 形态学操作：腐蚀 / 膨胀 / 开闭 / 梯度 / 顶帽 / 黑帽

形态学操作只在**二值图**上效果明显，所以第一步永远是 `threshold`：

```cpp
Mat binary;
threshold(gray, binary, 127, 255, THRESH_BINARY);
```

结构元素（核）定义了操作的形状和范围：

```cpp
Mat kernel = getStructuringElement(MORPH_RECT,  Size(5, 5));  // 矩形
Mat kernel = getStructuringElement(MORPH_ELLIPSE, Size(5, 5)); // 椭圆
Mat kernel = getStructuringElement(MORPH_CROSS,  Size(5, 5));  // 十字
```

七种操作的公式和用途：

| 操作 | 公式 | 效果 | 典型用途 |
|------|------|------|----------|
| **腐蚀 Erode** | 局部最小 | 白区缩小 | 去掉孤立噪点（小于核的白点被吞掉） |
| **膨胀 Dilate** | 局部最大 | 白区扩大 | 填充细小空洞（小于核的黑点被填上） |
| **开运算 Open** | 先腐蚀再膨胀 | 去噪点 + 断开细连接 | 预处理——先清理噪声 |
| **闭运算 Close** | 先膨胀再腐蚀 | 填小洞 + 连接断裂处 | 预处理——先填补缺陷 |
| **形态学梯度** | 膨胀 - 腐蚀 | 物体轮廓 | 边缘提取，比 Sobel 更粗 |
| **顶帽 TopHat** | 原图 - 开运算 | 亮于邻域的小区域 | 光照不均的校正 |
| **黑帽 BlackHat** | 闭运算 - 原图 | 暗于邻域的小区域 | 暗斑检测 |

```cpp
morphologyEx(binary, dst, MORPH_OPEN,   kernel);  // 开运算
morphologyEx(binary, dst, MORPH_CLOSE,  kernel);  // 闭运算
morphologyEx(binary, dst, MORPH_GRADIENT, kernel); // 形态学梯度
morphologyEx(binary, dst, MORPH_TOPHAT, kernel);  // 顶帽
morphologyEx(binary, dst, MORPH_BLACKHAT, kernel); // 黑帽
```

形态学操作是基于**集合运算**（局部最大/最小），和边缘检测的**导数运算**是两种不同的数学框架。应用场景完全不同——形态学处理二值区域的几何结构，Sobel/Canny 检测灰度变化的梯度。

### 1.8 边缘检测：Sobel / Laplacian / Canny

```cpp
// Sobel: 一阶导数，分别算 X 和 Y 方向
Sobel(gray, sobel_x, CV_16S, 1, 0, 3);  // 检测垂直边缘（X 方向梯度）
Sobel(gray, sobel_y, CV_16S, 0, 1, 3);  // 检测水平边缘（Y 方向梯度）

// Laplacian: 二阶导数，零交叉处 = 边缘
Laplacian(gray, lap, CV_16S, 3);

// Canny: 双阈值 + 非极大值抑制 + 滞后跟踪
Canny(gray, canny, 50, 150, 3);
```

**Sobel 和 Laplacian 的输出类型是 `CV_16S`（16 位有符号整数），不是 `CV_8U`。** 这是一个非常容易踩的坑：导数有正有负，直接存 8 位无符号会把所有负梯度截断为 0，丢失一半信息。正确做法：

```cpp
Mat sobel_abs;
convertScaleAbs(sobel_x, sobel_abs);  // 取绝对值 -> 8 位显示用
```

### 1.9 自适应二值化

基本的 `threshold` 对整个图像用同一个阈值。但现实往往是——图中一半亮一半暗，全局阈值要么左边一片过曝，要么右边一片死黑。

**大津法 OTSU** 自动计算最优阈值，使前景和背景的类间方差最大：

```cpp
double thresh = cv::threshold(gray, binary, 0, 255, THRESH_BINARY | THRESH_OTSU);
// thresh 参数传什么无所谓，OTSU 自动算，返回值即实际阈值
```

但它仍是**全局**阈值——一张图一个值，对光照渐变无效。

**局部自适应**为每个像素根据其邻域单独算阈值：

```cpp
adaptiveThreshold(gray, binary, 255,
    ADAPTIVE_THRESH_GAUSSIAN_C,  // 邻域加权
    THRESH_BINARY,
    blockSize=11,   // 邻域大小，必须为奇数
    C=2             // 偏置：阈值 = 邻域均值 - C
);
```

`blockSize` 决定"局部"的范围——太小容易放大噪声，太大则退化到全局。`C` 是手动偏置，正值让前景更少（更保守）。

局部自适应对**光照不均的文档扫描、车牌识别**场景效果极佳——比全局阈值强一个档次。

### 1.10 轮廓提取与筛选

边缘检测告诉你"哪里有边缘"，但边缘是散的点。轮廓提取把这些点连成闭合曲线，形成真正的"物体边界"。

```cpp
vector<vector<Point>> contours;
vector<Vec4i> hierarchy;
findContours(binary, contours, hierarchy,
    RETR_TREE,           // 全拓扑关系
    CHAIN_APPROX_SIMPLE  // 压缩存储（只记端点）
);
```

`hierarchy` 对每个轮廓记录 4 个信息：`[后一个轮廓, 前一个轮廓, 第一个子轮廓, 父轮廓]`，构成完整的包含树。画轮廓用 `drawContours`。

真实场景中轮廓很多——光杆、噪点、背景纹理都会产生轮廓。**轮廓筛选**是传统视觉的核心技能，下面是几种经典方法：

**面积/周长约束**（最基础）：

```cpp
bool byArea(const vector<Point>& c) {
    double area = contourArea(c);
    return area > 500 && area < 5000;  // 去掉太大和太小的
}
```

**凹凸性约束**（区分凹轮廓和凸轮廓）：

```cpp
vector<Point> hull;
convexHull(contour, hull);
double hull_area = contourArea(hull);
double contour_area = contourArea(contour);
// 凸轮廓: hull_area ≈ contour_area
// 凹轮廓: hull_area >> contour_area
if (hull_area > 1.5 * contour_area)  // 凹轮廓
```

**与矩形的相似性**（找矩形目标）：

```cpp
RotatedRect rect = minAreaRect(contour);
double rect_area = rect.size.area();
double contour_area = contourArea(contour);
// 面积比接近 1 → 接近矩形
// 还可用周长比和长宽比进一步约束
```

**拓扑关系约束**（找外轮廓、子轮廓个数等）：

```cpp
// 找最外层且有 2 个子轮廓的目标
if (hierarchy[id][3] == -1) {          // 没有父轮廓 = 最外层
    int child_cnt = 0;
    for (int c = hierarchy[id][2]; c != -1; c = hierarchy[c][0])
        child_cnt++;
    if (child_cnt == 2)               // 恰好 2 个子轮廓
        // 符合条件
}
```

**轮廓间几何关系**：两个轮廓的旋转矩形夹角、中心距、包含关系等——灵活多变，看目标特征。

传统视觉的原则是：**阈值宁可宽松，用分类器筛掉多余的；不要设太紧，漏了就补不回来。**

Canny 的三个步骤让它在工业界成为标配：

1. **梯度计算**：用 Sobel 算每个像素的梯度幅值和方向
2. **非极大值抑制**：只保留梯度方向上的局部最大值，边缘变细
3. **双阈值 + 滞后跟踪**：高于 `upper` 的肯定是边缘，低于 `lower` 的肯定不是，中间的如果连着"高阈值边缘"就保留——这让 Canny 能用一条线连出边缘而不是一堆碎段

双阈值的调参效果：

| 参数 | 效果 |
|------|------|
| `Canny(gray, out, 20, 150)` | lower 很低 → 弱边缘也被保留，图很"花" |
| `Canny(gray, out, 50, 150)` | 常规配置，日常首选 |
| `Canny(gray, out, 100, 200)` | 整体抬高 → 只保留最强边缘，画面干净 |

### 1.11 直方图与均衡化

**计算直方图**：

```cpp
int histSize = 256;
float range[] = {0, 256};
const float* histRange = {range};
Mat hist;
calcHist(&gray, 1, 0, Mat(), hist, 1, &histSize, &histRange);
normalize(hist, hist, 0, hist_img.rows, NORM_MINMAX);
```

**全局均衡化** `equalizeHist` 把像素值重新分布使直方图更均匀——对比度拉伸。但暗区的噪声也会被一起放大，噪点变得非常明显。

**永远优先用 CLAHE，别直接用全局均衡化**——它把图分成 8x8 的小块各自均衡化，再用对比度限制防止某一块噪声被过度放大：

```cpp
Ptr<CLAHE> clahe = createCLAHE();
clahe->setClipLimit(3.0);              // 对比度限制阈值，越大对比度越强
clahe->setTilesGridSize(Size(8, 8));   // 分块大小
clahe->apply(gray, result);
```

**彩色图均衡化的正确姿势**：只动亮度通道，不动颜色。直接在 BGR 三个通道各做均衡化会破坏色彩关系，看起来很奇怪：

```cpp
// 正确做法：HSV -> 只均衡 V 通道 -> 转回 BGR
Mat hsv;
cvtColor(bgr, hsv, COLOR_BGR2HSV);
vector<Mat> chs;
split(hsv, chs);
equalizeHist(chs[2], chs[2]);          // 只均衡 V（明度）
merge(chs, hsv);
cvtColor(hsv, result, COLOR_HSV2BGR);
```

Lab 空间均衡 L 通道同理——原则就一条：**只动亮度，不动颜色**。

---

## 阶段二：特征点提取与匹配

> 覆盖：Harris / Shi-Tomasi / SIFT / ORB / AKAZE / BFMatcher / FLANN / Lowe 比值 / RANSAC / 单应性 / 图像拼接

阶段二用了两张不同的壁纸图片——`scene.jpg` 和 `scene2.jpg`——来做跨图匹配和拼接。两图内容不同，重叠区域有限，所以匹配对数不会特别多——这恰好能直观感受"特征匹配对场景重叠度的要求"。

### 2.1 Harris 角点检测

Harris 在图像的每个像素处计算一个**角点响应值 R**，基于该像素邻域窗口内的梯度分布：

```
R = det(M) - k * trace²(M)

M = Σ w(x,y) * [ Ix²    Ix·Iy ]
                [ Ix·Iy  Iy²   ]
```

M 是窗口内梯度协方差矩阵，它的两个特征值 λ1、λ2 直接决定了该点的类型：

| λ1, λ2 | R 值 | 区域类型 |
|--------|------|---------|
| 都大 | R 大正数 | **角点**（两个方向都有强梯度） |
| 一大一小 | R 大负数 | 边缘（只有一个方向有梯度） |
| 都小 | |R| 接近 0 | 平坦区（两个方向都没梯度） |

```cpp
Mat harris_dst = Mat::zeros(gray.size(), CV_32FC1);
int    blockSize = 2;      // 邻域窗口大小
int    kSize     = 3;      // Sobel 算子孔径
double k         = 0.04;   // 自由参数，论文推荐 0.04-0.06
cornerHarris(gray, harris_dst, blockSize, kSize, k);

// 归一化后阈值筛选
Mat harris_norm;
normalize(harris_dst, harris_norm, 0, 255, NORM_MINMAX, CV_8UC1);
int threshold = 130;
```

k 值越大，R 公式中 `trace²(M)` 项的权重越高，越不容易把边缘误判为角点——但也可能漏掉真角点。

### 2.2 Shi-Tomasi + goodFeaturesToTrack

Shi-Tomasi 是 Harris 的改进版。它改动了评分函数：`R = min(λ1, λ2)` 替代 `det(M) - k·trace²(M)`。这意味着**只有两个特征值都足够大的点才被认为是角点**——最严格的角点定义，边缘区域不会被保留。

`goodFeaturesToTrack` 在 Shi-Tomasi 基础上加了**非极大值抑制**（一个角点周围只保留最强的那一个）和**最小距离过滤**（两个角点必须至少隔 10px）。这使它在工业上成为光流跟踪和视觉里程计的特征提取标配：

```cpp
vector<Point2f> corners;
int    maxCorners   = 100;     // 最多保留 100 个
double qualityLevel = 0.01;    // 只取最强响应的 1%
double minDistance  = 10;      // 两个角点至少隔 10px
int    blockSize    = 3;
bool   useHarrisDetector = false;  // false = Shi-Tomasi

goodFeaturesToTrack(gray, corners, maxCorners,
                    qualityLevel, minDistance, Mat(),
                    blockSize, useHarrisDetector);
```

`qualityLevel` 是最关键的调参：`0.01` 表示只取最强角点响应值的 1% 以上的点；调到 `0.1` 就只保留最强的前几名；调到 `0.001` 会取出大量弱角点。

### 2.3 SIFT：尺度不变特征变换

SIFT 的四个步骤：

1. **DoG 金字塔**：在不同尺度的高斯模糊上做差分，在 Scale Space 中找极值——这样找到的关键点在不同尺度下都是稳定的
2. **关键点定位**：在 DoG 极值点附近做二次拟合精化位置，同时剔除低对比度和边缘响应的点
3. **主方向分配**：在关键点周围的 36-bin 梯度直方图中找峰值——这样描述子就有了旋转不变性
4. **128 维描述子**：以主方向为参考，把 16×16 区域分成 4×4 网格，每个格子做 8 方向梯度直方图 → 4×4×8 = 128 维 float 向量

```cpp
Ptr<SIFT> sift = SIFT::create();
// 可选参数（按需调）
// sift->setNFeatures(500);         // 最多保留 500 个特征
// sift->setContrastThreshold(0.04); // 低对比度剔除阈值
// sift->setEdgeThreshold(10);       // 边缘响应剔除阈值

vector<KeyPoint> kps;
Mat desc;
sift->detectAndCompute(gray, noArray(), kps, desc);
// kps.size() 个关键点，desc 是 kps.size() × 128 的 float 矩阵
```

SIFT 专利已于 2020 年过期，OpenCV 4.x 将它从 `xfeatures2d` 移回了主仓库 `features2d`。每个 `KeyPoint` 包含丰富信息：`pt`（图像坐标）、`size`（特征尺度）、`angle`（主方向角度）、`response`（响应强度）。

用 `DRAW_RICH_KEYPOINTS` 画关键点时，圆的半径 = 尺度，圆内的半径线 = 主方向——这让你直观看到 SIFT 给每个点分配的尺度和方向。

### 2.4 ORB 与 AKAZE：实时特征的两种选择

**ORB**（Oriented FAST + Rotated BRIEF）是 SIFT 的"极速替代品"，专为实时应用设计。本质是 FAST 角点检测器的改进版（加了方向信息）+ 旋转感知的 BRIEF 二进制描述子。描述子是 **256 bit（32 字节）**，匹配时用 Hamming 距离（就是异或 + 数 bit），CPU 单周期指令完成，比 float 的 L2 距离快几十倍。

**AKAZE** 使用非线性扩散滤波构建尺度空间，比 SIFT 的高斯金字塔更好地保留了边缘位置。描述子是 61 字节二进制，专利免费。

| | SIFT | ORB | AKAZE |
|------|------|------|------|
| 角点检测器 | DoG 极值 | oFAST (FAST+方向) | Hessian 矩阵 |
| 描述子 | float 128D (512B) | **binary 256bit (32B)** | binary 61B |
| 匹配距离 | L2 | **Hamming** | Hamming |
| 尺度不变 | ✓ | 近似 (图像金字塔) | ✓ |
| 速度 | 慢 | **极快 (>10x)** | 中 |
| 实时帧率 | < 5 fps | **30+ fps** | ~10 fps |
| 专利 | 已过期 (2020) | 免费 | 免费 |

选型：**精度优先选 SIFT，速度优先选 ORB。** 实时 SLAM/VO 里 ORB 是标配（ORB-SLAM 全家桶），离线重建/图像拼接用 SIFT。

```cpp
// ORB
Ptr<ORB> orb = ORB::create();
orb->setMaxFeatures(500);  // 控制特征数

// AKAZE
Ptr<AKAZE> akaze = AKAZE::create();
```

### 2.5 BFMatcher + FLANN + Lowe 比值检验

匹配两个图像的特征，就是**对图 1 的每个描述子，在图 2 的描述子库中找最接近的那个**。"接近"对 float 描述子用 L2 距离，对二进制描述子用 Hamming 距离。

```cpp
// 暴力匹配：逐一比较，精确但慢
BFMatcher bf(NORM_HAMMING);              // ORB 用 Hamming, SIFT 用 NORM_L2
vector<vector<DMatch>> knn;
bf.knnMatch(desc1, desc2, knn, 2);       // 每个点找 top-2

// FLANN：近似最近邻，快但需要 float 描述子
FlannBasedMatcher flann;
flann.knnMatch(sift_desc1, sift_desc2, flann_knn, 2);
```

**Lowe 比值检验**是 SIFT 论文中提出的经典外点过滤方法：

```cpp
// d(best) / d(second_best) < 0.75
// 直觉："如果最近邻和次近邻的差距不够大，说明这个匹配不可靠"
for (auto& m : knn) {
    if (m.size() < 2) continue;
    if (m[0].distance < 0.75f * m[1].distance)
        good_matches.push_back(m[0]);
}
```

为什么比值检验有效：一个正确的匹配，它的最近邻描述子距离应该远小于次近邻（独特性强）。一个错误的匹配，最近邻和次近邻的差距很小（都差不多远），这个匹配就不靠谱。0.75 是论文推荐的阈值——降到 0.6 更严格（匹配少但准确），升到 0.85 更宽松（匹配多但有更多误匹配）。

### 2.6 RANSAC + 单应性矩阵

Lowe 比值过滤后仍然会有误匹配。RANSAC 是处理这个问题的最经典方法：

1. 从所有匹配中随机抽 **4 对**（单应矩阵需要 4 对求解）
2. 用这 4 对计算单应矩阵 H
3. H 投影所有点，统计投影误差 < 5px 的"内点"数量
4. 重复 N 次，取**内点最多**的那个 H 作为最优模型

```cpp
vector<uchar> inlier_mask;
Mat H = findHomography(pts1, pts2, RANSAC, 5.0, inlier_mask);
// ransacReprojThreshold=5.0: 投影误差超过 5px 就算外点
// mask[i]=1 内点, mask[i]=0 外点

// 分别提取内点和外点用于可视化
vector<DMatch> inliers, outliers;
for (size_t i = 0; i < inlier_mask.size(); i++)
    (inlier_mask[i] ? inliers : outliers).push_back(raw_matches[i]);
```

单应矩阵 H 是一个 3×3 矩阵，将图 1 的像素坐标映射到图 2：

```
s * [u2; v2; 1] = H * [u1; v1; 1]
```

H 有 8 个自由度（9 个元素减 1 个尺度），所以最少需要 **4 对**对应点。H 的前提假设是场景是**平面**或相机**纯旋转**——如果场景有深度变化，H 就不够用了，需要用基础矩阵 F。

**验证 H 好坏的最佳方式**：用 `warpPerspective` 把图 1 卷到图 2 的平面上，然后 `addWeighted` 半透明叠加——对齐得越好，H 越准。

```cpp
Mat warp1;
warpPerspective(src1, warp1, H, src2.size());
Mat overlay;
addWeighted(src2, 0.5, warp1, 0.5, 0, overlay);
// overlay 中轮廓对齐越完美，H 越准
```

### 2.7 图像拼接端到端

把前面的每一步串起来就是图像拼接：

```
特征提取 (SIFT) -> KNN匹配 -> Lowe 过滤 -> RANSAC 求 H
                 -> warpPerspective 变换 -> 融合
```

手动实现：

```cpp
// 同前面的流程得到 H
Mat H = findHomography(pts1, pts2, RANSAC, 5.0);

// 构造全景画布
int w = src1.cols + src2.cols;  // 左右并排
int h = max(src1.rows, src2.rows);
Mat pano = Mat::zeros(Size(w, h), CV_8UC3);

// 图1 经 H 变换贴到全景
warpPerspective(src1, pano, H, pano.size());
// 图2 直接贴到右半区（H 从图1->图2，所以图2保持原样）
Mat roi = pano(Rect(0, 0, src2.cols, src2.rows));
src2.copyTo(roi, src2);
```

OpenCV 内置的 `Stitcher` 一行搞定，内部就是上面这整套流程加上多频段融合：

```cpp
Ptr<Stitcher> stitcher = Stitcher::create(Stitcher::PANORAMA);
Stitcher::Status status = stitcher->stitch({src1, src2}, result);
```

`Stitcher` 对图像的重叠度有要求——重叠太少的图会直接失败。这就是为什么 demo 中两张不同内容的壁纸图 OpenCV Stitcher 可能报失败的原因。

---

## 阶段三：相机模型与对极几何

> 覆盖：针孔投影手写验证 / 畸变模型手写 vs OpenCV / E 与 F 矩阵 / 对极线 / 双目匹配 / 视差图 / 深度图 / 三角化

阶段三不需要两张实物图——代码内部用一张测试图构造"模拟右图"（水平平移 50px 模拟理想的已校正双目图像），所以所有 demo 都能在一张图上跑通。

阶段三使用了之前相机标定的实际参数：

| 参数 | 值 | 含义 |
|------|----|------|
| `fx` | 390.09 | X 轴焦距（像素） |
| `fy` | 520.27 | Y 轴焦距（像素） |
| `cx` | 322.58 | 光心 X |
| `cy` | 236.14 | 光心 Y |
| `k1` | -0.4515 | 二阶径向畸变（<0 = 桶形） |
| `k2` | 0.1797 | 四阶径向畸变 |
| `p1` | -0.0016 | 切向畸变 |
| `p2` | -0.0045 | 切向畸变 |

### 3.1 针孔相机投影：手写 vs OpenCV

针孔模型的完整投影链：

```
世界坐标 Pw  →  相机坐标 Pc = R * Pw + t
              →  归一化平面 xn = Xc / Zc,  yn = Yc / Zc
              →  畸变 (xd, yd)
              →  像素坐标 u = fx * xd + cx,  v = fy * yd + cy
```

四个坐标系的逐步转换：

```
世界坐标系 (3D) → 刚体变换 (R,t) → 相机坐标系 (3D)
    → 透视投影 → 像平面坐标系 (2D, mm)
    → 缩放+平移 → 像素坐标系 (2D, px)
```

齐次形式更简洁：

```
s * [u]   [fx  0  cx]   [r11 r12 r13 t1]   [Xw]
    [v] = [0  fy  cy] * [r21 r22 r23 t2] * [Yw]
    [1]   [0   0   1]   [r31 r32 r33 t3]   [Zw]
                                              [ 1]
```

外参矩阵 [R|t] 有 6 个自由度（3 旋转 + 3 平移），决定了相机在世界坐标系中的位置和朝向。内参矩阵 K 包含 4 个参数：`fx, fy, cx, cy`——其中 `fx ≠ fy` 表明相机像素不是正方形。

### 3.2 旋转表示：轴角、欧拉角、四元数

三维旋转有 3 个自由度，但旋转矩阵是 3×3（9 个量），存在冗余。工程中常用三种更紧凑的表示：

**旋转向量（轴角）**：一个向量，方向 = 旋转轴，长度 = 旋转角度（弧度）。只有 3 个量，对谁都不冗余。

```cpp
Mat rvec = (Mat_<double>(3,1) << 0.1, -0.05, 0.02);
// 绕轴 [0.1, -0.05, 0.02] 旋转 |rvec| 弧度
```

Rodrigues 公式给出旋转向量 → 旋转矩阵的转换：

```
R = cos(θ)·I + (1-cos(θ))·n·n^T + sin(θ)·[n]_×
其中 θ = |rvec|, n = rvec/θ
[n]_× 是 n 的反对称矩阵
```

OpenCV 中双向转换：

```cpp
Mat R;
Rodrigues(rvec, R);    // 旋转向量 -> 旋转矩阵 (3x3)
Rodrigues(R, rvec);    // 旋转矩阵 -> 旋转向量
```

**欧拉角**：绕三个轴依次旋转——常用 ZYX 顺序（偏航 Yaw → 俯仰 Pitch → 滚转 Roll）。直观但有一个致命缺陷：**万向节死锁**。当 Pitch = ±90° 时，Yaw 和 Roll 变成同一个旋转方向，丢失一个自由度。这就是为什么 SLAM/VIO 中不用欧拉角做状态估计。

**四元数**：一个 4D 向量 `q = (w, x, y, z)`，不冗余不奇异。旋转向量 → 四元数：

```
q = [cos(θ/2), sin(θ/2)·n_x, sin(θ/2)·n_y, sin(θ/2)·n_z]
```

四元数乘法对应旋转的复合，是 SLAM 中状态估计的标准姿态表示。

### 3.3 PnP：从 2D-3D 对应求解相机位姿

PnP（Perspective-n-Point）是单目视觉中最重要的位姿估计方法——已知 N 个点的 3D 世界坐标和 2D 像素坐标，求解相机的旋转 R 和平移 t。最少需要 **3 对点**（P3P），实际中用 4 对以上（PnP）加 RANSAC 获得稳定解。

几何直觉：已知 3D 点和它在图像中的投影，反推相机在哪里、朝哪个方向——就是解一个从世界到像素的逆映射。

```cpp
solvePnP(objectPoints, imagePoints, K, distCoeffs, rvec, tvec,
    false,              // useExtrinsicGuess
    SOLVEPNP_ITERATIVE  // 迭代优化法（默认，最通用）
);
// rvec, tvec: 输出，相机坐标系相对于世界坐标系的旋转和平移
// tvec 的模长 = 相机到世界原点的距离
```

其他算法选择：`SOLVEPNP_P3P`（只需 3 对，有歧义需验证点）、`SOLVEPNP_EPNP`（4+ 对，高效）、`SOLVEPNP_UPNP`（带焦距估计）、`SOLVEPNP_IPPE`（平面场景）。

**测距**：把世界原点设在目标物体上，`solvePnP` 返回的 `tvec` 的模长就是相机到目标的距离。

### 3.4 针孔投影手写验证

手写实现的每一步必须和 OpenCV `projectPoints` 完全一致，否则说明公式理解有偏差。验证方式：用同一组 3D 点、同一个外参（R, t）、同一组内参和畸变系数，分别手写投影和调 OpenCV，比对像素坐标：

```cpp
// 构造 20 个 3D 点 (5x4 棋盘格角点, Z=0 平面, 格子 20mm)
vector<Point3f> obj_pts;
for (int y = 0; y < 4; y++)
    for (int x = 0; x < 5; x++)
        obj_pts.push_back(Point3f(x * 0.02f, y * 0.02f, 0));

// 假定的外参
Mat rvec = (Mat_<double>(3,1) << 0.1, -0.05, 0.02);
Mat tvec = (Mat_<double>(3,1) << 0.05, 0.02, 0.5);

// OpenCV 投影 (标准答案)
vector<Point2f> cv_proj;
projectPoints(obj_pts, rvec, tvec, K_mat, dist_coeffs, cv_proj);

// 手写投影
Mat R;
Rodrigues(rvec, R);  // 旋转向量 -> 3x3 旋转矩阵
for (auto& Pw : obj_pts) {
    // 世界 -> 相机
    double Xc = R.at<double>(0,0)*Pw.x + R.at<double>(0,1)*Pw.y + tvec.at<double>(0);
    double Yc = R.at<double>(1,0)*Pw.x + R.at<double>(1,1)*Pw.y + tvec.at<double>(1);
    double Zc = R.at<double>(2,0)*Pw.x + R.at<double>(2,1)*Pw.y + tvec.at<double>(2);

    // 归一化平面
    double xn = Xc / Zc, yn = Yc / Zc;

    // 畸变 (Brown-Conrady / plumb_bob)
    double r2 = xn*xn + yn*yn, r4 = r2 * r2;
    double radial = 1 + K1*r2 + K2*r4;
    double xd = xn*radial + 2*P1*xn*yn     + P2*(r2 + 2*xn*xn);
    double yd = yn*radial + P1*(r2 + 2*yn*yn) + 2*P2*xn*yn;

    // 内参 -> 像素
    double u = FX * xd + CX;
    double v = FY * yd + CY;
    hand_proj.push_back(Point2f(u, v));
}
// 比对误差: 20 个点最大误差 < 0.01 px
```

结果：20 个点的手写投影和 `cv::projectPoints` 误差 < 0.01 px，说明每步公式完全正确。

### 3.5 畸变模型与手写去畸变

畸变模型（Brown-Conrady / plumb_bob）有两部分：

**径向畸变**（镜头形状引起——光线在透镜边缘折射更多）：
```
x_radial = x * (1 + k1*r^2 + k2*r^4 + k3*r^6)
y_radial = y * (1 + k1*r^2 + k2*r^4 + k3*r^6)
```

**切向畸变**（镜头装配误差——镜头和传感器不严格平行）：
```
x_tang = 2*p1*x*y        + p2*(r^2 + 2*x^2)
y_tang = p1*(r^2 + 2*y^2) + 2*p2*x*y
```

最终畸变坐标 = 径向 + 切向。`k1 ≈ -0.45` 是负值，说明相机有明显的**桶形畸变**（图像边缘的直线向画面中心弯曲），这是广角镜头的共同特征。

手写去畸变就是对每个像素坐标迭代求解"无畸变坐标 → 畸变坐标"的逆映射，然后用 `remap`：

```cpp
Mat map_x(src.size(), CV_32FC1), map_y(src.size(), CV_32FC1);
for (int v = 0; v < src.rows; v++) {
    for (int u = 0; u < src.cols; u++) {
        double xn = (u - CX) / FX;
        double yn = (v - CY) / FY;
        double r2 = xn*xn + yn*yn, r4 = r2*r2;
        double radial = 1 + K1*r2 + K2*r4;
        double xd = xn*radial + 2*P1*xn*yn     + P2*(r2 + 2*xn*xn);
        double yd = yn*radial + P1*(r2 + 2*yn*yn) + 2*P2*xn*yn;
        map_x.at<float>(v, u) = FX * xd + CX;
        map_y.at<float>(v, u) = FY * yd + CY;
    }
}
Mat hand_undist;
remap(src, hand_undist, map_x, map_y, INTER_LINEAR);
```

和 `cv::undistort` 做差分（`absdiff` 后乘 5 放大），几乎全黑的图说明手写实现和 OpenCV 完全一致。

### 3.6 对极几何：E 与 F

对极几何描述的是**两个相机从不同位置拍摄同一场景**时的几何约束。

**本质矩阵 E**（在归一化相机坐标系下）：
```
x_norm^T * E * x_norm' = 0
E = [t]_× * R
```
E 是一个 3×3 矩阵，rank=2，有 5 个自由度（R 有 3 个，t 有 3 个，减 scale 的 1 个 = 5）。它只编码了两个相机之间的旋转 R 和平移 t（scale 未知）。

**基础矩阵 F**（在像素坐标系下）：
```
x_pixel^T * F * x_pixel' = 0
F = K'^{-T} * E * K^{-1}
```
F 也是 3×3，rank=2，有 7 个自由度（E 的 5 个 + 两个 K 各 2 个偏置）。F 在工作在像素空间——可以直接用图像中的匹配点对来估计。

从匹配点估计 F（最少需要 7 对，通常用 8 对 + RANSAC）：

```cpp
Mat F = findFundamentalMat(pts1, pts2, FM_RANSAC, 3.0, 0.99);
// param1=3.0: RANSAC 的像素距离阈值
// param2=0.99: 置信度
```

有了 F 就能从中恢复 E（需要已知内参 K）：

```cpp
Mat E = K_mat.t() * F * K_mat;  // 像素空间 -> 归一化空间
```

从 E 做 SVD 分解能恢复 R 和 t：

```cpp
Mat R1, R2, t;
decomposeEssentialMat(E, R1, R2, t);
// SVD(E) = U·diag(1,1,0)·V^T
// 得到 4 组候选 (R1,t), (R1,-t), (R2,t), (R2,-t)
// 用"三角化后 Z>0"筛选出唯一正确的解
```

**t 只有方向有意义——这是单目的根本限制**。真实距离无法恢复，因为 E 中 scale 消失了。

**对极线和对极点的几何含义**：

```
l2 = F * x1         ← 右图中对应左图点 x1 的对极线
l1 = F^T * x2       ← 左图中对应右图点 x2 的对极线
e2: F * e2 = 0      ← 对极点：左相机光心在右图上的投影
e1: F^T * e1 = 0    ← 对极点：右相机光心在左图上的投影
```

验证对极约束——对每对匹配点，右图点必须落在左图点对应的对极线上：

```cpp
// 点到线的距离
Vec3f l2 = F * Vec3f(x1.x, x1.y, 1);  // 对极线
float dist = |l2[0]*x2.x + l2[1]*x2.y + l2[2]|
           / sqrt(l2[0]^2 + l2[1]^2);
// 平均距离 < 0.5 px 说明约束成立
```

```cpp
// 画对极线
vector<Vec3f> lines2;
computeCorrespondEpilines(pts1, 1, F, lines2);  // 图1 -> 图2
// 每条线: a*u + b*v + c = 0  →  画 v = (-c - a*u) / b
```

8 条彩色对极线在右图上必须满足两个性质：每条线穿过对应匹配点、所有线汇聚于同一点（对极点）。

### 3.7 双目立体匹配

两个已经过**极线校正**（rectified）的图像，匹配点在同一行上——搜索从 2D 降为 1D。

用左图纯水平平移 50px 构造一个理想的"已校正"右图来模拟：

```cpp
Mat gray_right = Mat::zeros(gray_left.size(), CV_8UC1);
gray_left(Rect(0, 0, gray_left.cols - 50, gray_left.rows))
    .copyTo(gray_right(Rect(50, 0, gray_left.cols - 50, gray_left.rows)));
```

两种算法对比：

```cpp
// StereoBM: 块匹配 + SAD 代价
Ptr<StereoBM> bm = StereoBM::create(numDisparities=64, blockSize=15);
bm->compute(left, right, disp_bm);
// BM 输出是 CV_16S, 除以 16 得到真实视差值

// StereoSGBM: 半全局匹配 (SAD + 多方向平滑)
Ptr<StereoSGBM> sgbm = StereoSGBM::create(
    0, 64, 15,                          // minDisp, numDisp, blockSize
    8*15*15, 32*15*15,                  // P1 (小惩罚), P2 (大惩罚)
    1, 63, 10, 100, 32                  // 其他参数
);
sgbm->compute(left, right, disp_sgbm);
```

| 算法 | 代价函数 | 平滑约束 | 效果 | 速度 |
|------|---------|---------|------|------|
| **StereoBM** | SAD (像素差绝对值和) | 无 | 块状条纹明显 | 快 |
| **StereoSGBM** | SAD + 多方向动态规划 | 有（P1小惩罚, P2大惩罚） | 平滑、空洞少 | 慢些 |

**SGBM 的核心思想**：如果你在 8 个（或 16 个）方向上做一维动态规划并累加代价值，就能近似全局的 2D 平滑——比真正的全局优化快几百倍，但效果接近。

**从视差图到深度图**只需一个除法：

```
Z = f * B / d
f = (fx + fy) / 2      (像素焦距，这里 ~455 px)
B = 基线距离            (两相机光心间距，单位 **米**)
d = 视差值              (像素)
```

```cpp
Mat depth_map(disp.size(), CV_32FC1);
for (int y = 0; y < disp.rows; y++) {
    for (int x = 0; x < disp.cols; x++) {
        float d = disp.at<short>(y, x) / 16.0f;
        if (d > 1)
            depth_map.at<float>(y, x) = f * B / d;
        else
            depth_map.at<float>(y, x) = 0;  // 遮挡 / 无匹配
    }
}
```

**B 必须是米的量纲**。2cm 的基线配 0.02m，不是 0.02px。这个换算一旦搞错，整个深度图就差了数量级。

### 3.8 三角化：从 2D 匹配恢复 3D 坐标

已知左相机投影矩阵 P1、右相机投影矩阵 P2 和一对匹配点 (u1,v1) ↔ (u2,v2)，求解 3D 点坐标。几何上就是**两条射线的交点**——但由于测量噪声，两条射线不会严格相交，实际用 SVD 求最小二乘解。

```cpp
Mat P1 = (Mat_<double>(3,4) << FX, 0, CX, 0,
                               0, FY, CY, 0,
                               0, 0,  1,  0);

// 右相机：基线体现在第四列
double Tx = -50;  // 像素单位基线
Mat P2 = (Mat_<double>(3,4) << FX, 0, CX, Tx,
                               0, FY, CY, 0,
                               0, 0,  1,  0);

Mat pts4D;
triangulatePoints(P1, P2, pts_left, pts_right, pts4D);
// 输出是齐次坐标 (X, Y, Z, W)，除以 W 得 3D 坐标
Point3f p3d(pts4D.at<float>(0,i) / pts4D.at<float>(3,i),
            pts4D.at<float>(1,i) / pts4D.at<float>(3,i),
            pts4D.at<float>(2,i) / pts4D.at<float>(3,i));
```

**为什么用 SVD**：每对匹配点给出 4 个方程（左图 u=v1, v=v1 和右图 u=u2, v=v2），但只有 3 个未知数 (X,Y,Z) — 超定。当射线不严格相交时，SVD 给出最小化重投影误差的 3D 点。

`reprojectImageTo3D` 能从视差图一键生成整个点云：

```cpp
Mat Q = (Mat_<double>(4,4) <<
         1, 0, 0, -CX,
         0, 1, 0, -CY,
         0, 0, 0, FX,
         0, 0, -1.0/Tx, 0);  // Q 矩阵从校正参数构造

Mat points3D;
reprojectImageTo3D(disp, points3D, Q, true);
// points3D 是 3 通道 Mat: (X, Y, Z) 对应每个像素的 3D 坐标
```

Q 矩阵只能用于**校正后**的双目图像（两相机光轴平行、极线水平对齐）。校正前的图像需要先 `stereoRectify` + `initUndistortRectifyMap` + `remap` 处理。

---

## 小结

三个阶段 跑下来，是从图像像素到 3D 几何的一整条管线：

```
imread → cvtColor → 滤波/形态学 → 边缘检测 → 直方图均衡
       → 特征提取 (Harris/SIFT/ORB) → 特征匹配 (BF/FLANN)
       → Lowe 过滤 → RANSAC 去外点 → 单应性 / 基础矩阵
       → 对极几何 → 双目匹配 → 视差图 → 深度图 → 三角化 → 3D 点云
```

值得看的：

**工程习惯**
1. `imread` 永远检查 `empty()`——不抛异常，隐式 Bug 来源
2. **BGR 不是 RGB**——和 Matplotlib/PIL 互转必须 `cvtColor`
3. Sobel/Laplacian 输出用 `CV_16S`——导数有正有负，`CV_8U` 丢一半信息
4. `.clone()` 和浅拷贝的区别——知道什么时候省内存，什么时候防 Bug

**算法选型**
5. 椒盐用中值，高斯噪声用高斯，保边用双边
6. CLAHE 永远优于全局直方图均衡——分块均衡 + 对比度限制
7. 颜色分割用 HSV——H 通道和亮度解耦，设阈值直观
8. ORB 是实时特征匹配的默认选择——Hamming 快到单周期指令
9. Canny 是边缘检测的工业标配——低错误率 + 定位准 + 单响应
10. SGBM 优于 BM——多方向平滑近似全局优化，视差图干净得多

**数学直觉**
11. Lowe 比值 ≤ 0.75——最近邻和次近邻差距不够大，匹配不可靠
12. RANSAC 随机抽 4 对求 H/F，内点最多即最优——简单粗暴但有理论保证
13. E 矩阵 rank=2，5 自由度——编码 R 和 t，但 scale 丢失（单目的根本限制）
14. F 矩阵 rank=2，7 自由度——= E 加上左右相机内参
15. 对极线全部汇聚于对极点——这是对极几何最本质的可视化验证
16. **Z = f × B / d**——B 必须是米量纲，用像素值直接错数量级

## 后续

阶段四准备做多传感器外参标定：Camera-IMU（Kalibr + EuRoC 数据集）和 Camera-LiDAR（手写 PnP + 点云投影验证）。有硬件时用自己设备标，没硬件时用公开数据集理解完整 pipeline。

> 本文部分内容由 AI 辅助整理和润色。
