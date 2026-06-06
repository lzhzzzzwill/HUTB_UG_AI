# 6_cv -- 计算机视觉实验

## 教学内容

本 Jupyter Notebook（`6_teach_cv.ipynb`，共 166 个 cell）覆盖四个实验，贯穿图像分类与回归任务，核心教学思路是对比**传统机器学习方法（像素展平）**与**卷积神经网络（CNN）**在图像任务上的性能差异。

### 四个实验

| 实验 | 数据集 | 任务类型 | 传统方法基线 | CNN 模型 |
|------|--------|---------|-------------|---------|
| 1 | CIFAR-10 | 10 分类 | 像素展平 + Logistic Regression | SimpleCNN |
| 2 | MNIST | 10 分类 | 像素展平 + Logistic Regression | SimpleMNISTCNN |
| 3 | Fashion-MNIST（旋转） | 回归（角度预测） | 像素展平 + Ridge 回归 | RotationCNN |
| 4 | House Prices and Images - SoCal | 回归（房价预测） | 纯图像 CNN 基线 | HousePriceCNN / MultiModalHouseCNN |

### 核心概念

- **图像张量**：PyTorch 中图像格式为 `[C, H, W]`（通道数、高度、宽度）
- **传统方法的局限**：将图像展平为一维向量（如 CIFAR-10 的 3072 维、MNIST 的 784 维），破坏了像素之间的空间结构，无法利用局部邻域信息
- **CNN 的优势**：通过卷积层保留二维空间结构，卷积核学习边缘、纹理等局部特征，池化层逐步降低空间尺寸，最终由全连接层完成分类或回归
- **分类 vs 回归**：分类输出离散类别（损失函数：CrossEntropyLoss，评估指标：准确率）；回归输出连续数值（损失函数：MSE/MAE，评估指标：R^2, MAE, RMSE）
- **多模态学习**：实验 4 演示了同时利用图像特征和结构化表格特征（bed, bath, sqft, n_citi）进行房价预测，更接近真实工业场景

### 教学流程

实验 1（CIFAR-10）作为主线详细展开，后续实验复用相同的模式：

1. **数据集介绍与加载** -- 下载数据集，了解图像尺寸、通道数、类别数
2. **数据探索（EDA）** -- 检查 batch 张量形状、可视化样本图像、查看类别分布
3. **传统基线方法** -- 像素展平 + 机器学习模型（Logistic Regression 或 Ridge 回归），建立性能对比基准
4. **CNN 模型定义** -- 定义自定义 CNN（含 Debug 版本用于打印张量流动），统计参数量
5. **前向传播张量检查** -- 用一个 batch 验证各层输入输出形状
6. **CNN 训练** -- CrossEntropyLoss 或 MSELoss + Adam 优化器 + Early Stopping
7. **训练过程可视化** -- Loss 曲线、准确率变化
8. **测试集评估** -- 整体准确率、分类报告、混淆矩阵（分类任务）；MAE / RMSE / R^2（回归任务）
9. **错误分析与可视化** -- 错误分类样本展示、卷积核可视化
10. **传统方法与 CNN 对比** -- 柱状图对比，总结核心差异
11. **模型应用** -- 加载保存的模型，对新图像进行推理

实验 4 在此基础上额外展示了：纯图像 CNN 的局限性 -> 引入结构化特征的必要性 -> 构建多模态模型（CNN 图像分支 + 全连接结构化特征分支 + 特征融合）。

## 环境要求

```bash
conda activate teach
pip install torch torchvision numpy pandas matplotlib scikit-learn tqdm pillow kagglehub
```

| 库 | 用途 |
|----|------|
| `torch` / `torchvision` | CNN 构建、CIFAR-10 / MNIST / Fashion-MNIST 数据集加载 |
| `kagglehub` | 下载 House Prices and Images - SoCal 房价数据集 |
| `sklearn` | 传统方法（Logistic Regression、Ridge 回归）、评估指标 |
| `PIL` | 图像读取与预处理 |

> **首次运行需下载数据集**：CIFAR-10 / MNIST / Fashion-MNIST 由 `torchvision` 自动下载；房价数据集通过 `kagglehub` 从 Kaggle 下载。

## 运行说明

1. 打开 `6_teach_cv.ipynb`
2. 选择 Kernel -> **teach**
3. 首次运行需要下载数据集，请保持网络畅通

## 设备支持

Notebook 中自动检测设备的优先级为：

```python
device = torch.device(
    "mps" if torch.backends.mps.is_available()      # Apple Silicon GPU
    else "cuda" if torch.cuda.is_available()         # NVIDIA GPU
    else "cpu"                                        # 回退到 CPU
)
```

MPS（Apple Silicon GPU）、CUDA（NVIDIA GPU）和 CPU 均可运行。无 GPU 时训练速度较慢，但不影响功能。

## 注意事项

- **数据集下载**：`torchvision` 首次运行时会自动下载 CIFAR-10 / MNIST / Fashion-MNIST。房价数据集需通过 `kagglehub` 下载，需要 Kaggle 账号认证。
- **训练时间**：CIFAR-10 CNN 训练默认 5 个 epoch，适合 90 分钟课堂演示；电脑较慢可减至 3 个 epoch，想获得更好结果可增至 10--20 个 epoch。
- **Early Stopping**：所有 CNN 训练均配置了早停机制（验证集连续 5 个 epoch 不提升则停止），训练完成后自动恢复最佳模型参数。
- **过拟合观察**：对比训练集和测试集的准确率曲线 -- 如果训练准确率远高于测试准确率，可能出现过拟合，这是课堂讲解的重要案例。
- **模型保存**：CIFAR-10 和 MNIST 的 CNN 模型分别保存到 `saved_models_cifar/` 和 `saved_models_mnist/` 目录。
