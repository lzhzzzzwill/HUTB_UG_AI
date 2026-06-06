# 5_nn: 神经网络教学

本目录包含一个完整的神经网络教学 Jupyter Notebook (`5_teach_nn.ipynb`)，从零开始逐步教授神经网络的基础概念和实践。内容分为三个部分：(1) 使用 NumPy 手动实现神经网络，(2) 使用 scikit-learn 的 MLPClassifier，(3) 使用 PyTorch 的 nn.Module。

---

## 第一部分：使用 NumPy 手动构造感知器与神经网络

### 1.1 线性可分数据集

使用 `sklearn.datasets.make_blobs` 生成线性可分数据集：
- 300 个样本，2 个特征，2 个类别
- `cluster_std=1.8`
- 使用 `train_test_split` 按 7:3 划分训练集和测试集（`stratify=y`）
- 使用 `StandardScaler` 进行特征标准化

### 1.2 激活函数

定义了以下激活函数并绘制其图像：

| 函数 | 公式 | 输出范围 | 说明 |
|------|------|---------|------|
| 无激活（线性） | `f(z) = z` | (-∞, ∞) | 等价于线性变换 |
| Step | `f(z) = (z >= 0).astype(float)` | {0, 1} | 阶跃函数 |
| Sigmoid | `1 / (1 + e^(-z))` | (0, 1) | 输出可解释为概率；易饱和导致梯度消失 |
| ReLU | `max(0, z)` | [0, ∞) | 计算简单，缓解梯度消失；可能出现"神经元死亡" |

> 注：Tanh 在 Markdown 的激活函数对比表格中被提及（公式 `(e^z - e^(-z)) / (e^z + e^(-z))`，输出范围 (-1, 1)），但未在代码中绘制。

### 1.3 单神经元模型（无激活函数）

**模型形式：** `y = z = Xw + b`

- **损失函数：** MSE（均方误差）
- **优化算法：** 梯度下降（学习率 0.05，共 200 轮）
- **梯度公式：**
  - `dw = (2/n) * X^T @ (y_pred - y)`
  - `db = (2/n) * sum(y_pred - y)`
- **分类方式：** 使用阈值 0.5（`z >= 0.5` 预测为类 1）

### 1.4 单神经元模型（Sigmoid 激活函数）

**模型形式：** `y = sigmoid(Xw + b)`

- **损失函数：** 二元交叉熵（Binary Cross-Entropy, BCE）
  - `BCE = -mean(y * log(y_pred) + (1 - y) * log(1 - y_pred))`
  - 使用 `eps=1e-8` 和 `np.clip` 防止数值溢出
- **优化算法：** 梯度下降（学习率 0.1，共 500 轮）
- **梯度公式（Sigmoid + BCE 的简化梯度）：**
  - `dz = y_pred - y`
  - `dw = (1/n) * X^T @ dz`
  - `db = (1/n) * sum(dz)`

### 1.5 对比分析

对比无激活函数模型和 Sigmoid 激活模型的：
- **损失曲线**：在同一张图中比较两种模型的损失下降过程
- **决策边界**：使用 `plot_decision_boundary_linear` 函数在特征空间绘制分类边界（300x300 网格），均为线性决策边界

### 1.6 为什么需要神经网络

讨论了单层感知器的局限性：
- 单层感知器只能学习线性决策边界，无法处理 XOR 等线性不可分问题
- 1969 年 Minsky 在《感知器》中证明了这一局限，导致 AI 第一次寒冬
- 解决方案：添加隐藏层和激活函数

### 1.7 非线性数据集

使用 `sklearn.datasets.make_moons` 生成非线性可分数据集：
- 400 个样本，2 个特征，`noise=0.2`
- 同样进行 7:3 划分和标准化

### 1.8 两层神经网络（手动实现）

**网络结构：**
```
输入层(2) → 隐藏层(8, ReLU) → 输出层(1, Sigmoid)
```

**参数初始化：**
- `W1`: `np.random.randn(2, 8) * 0.1`
- `b1`: `np.zeros((1, 8))`
- `W2`: `np.random.randn(8, 1) * 0.1`
- `b2`: `np.zeros((1, 1))`

**前向传播：**
```
Z1 = X @ W1 + b1
A1 = ReLU(Z1)
Z2 = A1 @ W2 + b2
A2 = Sigmoid(Z2)
```

**反向传播（手动链式法则）：**
```
dZ2 = A2 - y
dW2 = (1/n) * A1.T @ dZ2
db2 = (1/n) * sum(dZ2)

dA1 = dZ2 @ W2.T
dZ1 = dA1 * (Z1 > 0)          # ReLU 导数
dW1 = (1/n) * X.T @ dZ1
db1 = (1/n) * sum(dZ1)
```

**训练参数：** 学习率 0.05，共 3000 轮，BCE 损失函数。

**可视化：**
- 训练损失曲线
- 决策边界（`plot_decision_boundary_nn` 函数，在 300x300 网格上评估）

### 1.9 模型总结

对比三种模型在各自数据集上的准确率：

| 模型 | 数据集 |
|------|--------|
| 无激活的单神经元 | make_blobs（线性可分） |
| Sigmoid 单神经元 | make_blobs（线性可分） |
| 两层神经网络 | make_moons（非线性） |

---

## 第二部分：scikit-learn MLPClassifier

### 2.1 数据集

使用 **乳腺癌 Wisconsin 数据集** (`sklearn.datasets.load_breast_cancer`)：
- 569 个样本，30 个特征
- 2 个类别：恶性 (malignant) / 良性 (benign)
- 按 8:2 划分训练集和测试集（`stratify=y`）
- 进行了类别分布检查和可视化

### 2.2 特征缩放

使用 `StandardScaler` 对特征进行标准化，并展示了缩放前后的数据对比。

### 2.3 基线 MLP 模型

```python
MLPClassifier(
    hidden_layer_sizes=(32, 16),
    activation="relu",
    solver="sgd",
    learning_rate_init=0.01,
    max_iter=300,
    random_state=42
)
```

输出：训练集和测试集准确率、分类报告（精确率/召回率/F1）、混淆矩阵、损失曲线。

### 2.4 激活函数对比

比较三种激活函数：
- `relu`（ReLU）
- `logistic`（Sigmoid）
- `tanh`（双曲正切）

每种激活函数都使用相同的网络结构 `(32, 16)`、SGD 优化器、学习率 0.01，训练并比较训练准确率、测试准确率、最终损失值和迭代次数。

### 2.5 网络结构对比

比较三种隐藏层配置：
- `(10,)` -- 单层 10 个神经元
- `(32, 16)` -- 两层，32 和 16 个神经元
- `(64, 32, 16)` -- 三层，64、32 和 16 个神经元

保持 `activation="relu"`、`solver="sgd"`、`learning_rate_init=0.01` 不变。

### 2.6 学习率对比

比较三种学习率：`0.001`、`0.01`、`0.1`，并绘制对应的损失曲线。

### 2.7 网格搜索

将激活函数（3 种）、网络结构（3 种）、学习率（3 种）进行全组合，共 27 种配置。通过系统搜索找到测试准确率最高的参数组合。

### 2.8 最佳模型重训练

使用网格搜索找到的最优参数（激活函数、网络结构、学习率）重新训练最终模型，并输出其损失曲线。

---

## 第三部分：PyTorch nn.Module

### 3.1 设备检测

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
```

仅检测 CUDA 可用性，若不可用则回退到 CPU。

### 3.2 数据准备

使用与第二部分相同的乳腺癌数据集，经过相同的 train_test_split 和 StandardScaler 处理后，转换为 PyTorch 张量（`dtype=torch.float32`）并移至对应设备。

### 3.3 模型定义

使用 `nn.Module` 和 `nn.Sequential` 定义前馈神经网络：

```
输入(30) → Linear(30, 32) → ReLU → Linear(32, 16) → ReLU → Linear(16, 1)
```

> 注意：输出层未添加 Sigmoid，因为损失函数使用 `BCEWithLogitsLoss`，内部已包含 Sigmoid 运算，数值上更稳定。

### 3.4 损失函数与优化器

- **损失函数：** `nn.BCEWithLogitsLoss()`（二元交叉熵 + Sigmoid，适用于二分类）
- **优化器：** `optim.SGD(model.parameters(), lr=0.01)`

### 3.5 精度计算

定义了 `binary_accuracy_from_logits` 函数：
1. 对 logits 应用 `torch.sigmoid` 得到概率
2. 以 0.5 为阈值进行二分类
3. 计算与真实标签一致的样本比例

### 3.6 训练循环

共 300 轮，每轮包含：

1. **训练模式 (`model.train()`)：**
   - 前向传播得到 logits
   - 计算 BCEWithLogitsLoss
   - `optimizer.zero_grad()` 清空梯度
   - `loss.backward()` 反向传播
   - `optimizer.step()` 更新参数
   - 计算训练精度

2. **评估模式 (`model.eval()` + `torch.no_grad()`)：**
   - 在测试集上计算损失和精度

记录每轮的训练损失、训练精度、测试损失、测试精度，每 20 轮打印一次。

### 3.7 结果可视化

- 训练损失和测试损失曲线（同一图表）
- 最终测试准确率
- 分类报告（精确率、召回率、F1-score）
- 混淆矩阵
- 前 15 个测试样本的预测概率展示

---

## 依赖项

```
numpy
matplotlib
pandas
scikit-learn
torch
```

## 学习要点汇总

1. 单神经元模型的基本形式：`z = Xw + b`
2. 激活函数（Sigmoid、ReLU）的特性和用途
3. 前向传播和反向传播的数学原理（链式法则）
4. 隐藏层赋予网络非线性表达能力，突破单层感知器的局限
5. MLPClassifier 的使用方法及超参数（激活函数、网络结构、学习率）的影响
6. PyTorch 中 nn.Module 的构建、训练循环的标准流程（`model.train()` / `model.eval()`、`zero_grad` / `backward` / `step`）
7. BCEWithLogitsLoss 的内部 Sigmoid 机制
