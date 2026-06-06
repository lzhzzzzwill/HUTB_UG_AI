# 4_ml -- 机器学习教学

本目录包含一个 Jupyter 教学笔记本 `4_teach_ml.ipynb`，面向本科生讲授机器学习中的三个核心主题：**线性回归**（含梯度下降、多项式回归与正则化）、**KNN 分类**、以及**基于粒子群算法的超参数优化**（结合 K 折交叉验证）。

---

## 笔记本结构概览

笔记本按教学顺序组织为以下三个部分：

1. **线性回归**
   - 合成数据生成与可视化
   - 使用 sklearn 的 `LinearRegression` 进行基础线性回归
   - 手动实现 MSE 损失函数
   - 手动实现梯度下降法（含动态可视化）
   - 多项式回归：比较不同度数（degree = 1, 2, 3, 5, 8, 12）
   - 欠拟合与过拟合分析
   - 岭回归（Ridge，L2 正则化）
   - LASSO 回归（L1 正则化）
   - 多模型对比与系数分析

2. **KNN 分类**
   - `make_moons` 合成数据集
   - 数据标准化（`StandardScaler`）
   - KNN 分类器训练与评估
   - 混淆矩阵与分类报告
   - 超参数 k 值调优（k = 1 ~ 30）
   - 决策边界可视化

3. **超参数优化：PSO + K 折交叉验证**
   - 定义多项式 Ridge 的 K 折交叉验证目标函数
   - 实现粒子群优化（PSO）算法
   - 搜索最优 (degree, alpha) 组合
   - 用最优参数重新训练并评估最终模型
   - 与其他回归模型对比

---

## 第一部分：线性回归

### 1.1 数据生成

使用合成数据集，真实函数为一个三次多项式加上高斯噪声：

```
y_true = 0.6 * x^3 - 1.5 * x^2 + 2.0 * x + 5.0
y = y_true + N(0, 4)
```

- x 范围：[-4, 4]，共 300 个样本点
- 随机种子固定为 42，保证可复现

### 1.2 数据划分

使用 `train_test_split` 按 7:3 比例划分为训练集（210 条）和测试集（90 条），随机种子为 42。

### 1.3 基础线性回归（sklearn）

使用 `sklearn.linear_model.LinearRegression` 拟合训练数据，模型形式为 `y_pred = w * x + b`。

评估指标：
- **MSE**（均方误差）：衡量预测值与真实值偏差的平方平均，越小越好
- **R²**（决定系数）：模型解释的方差比例，越接近 1 越好，0 表示等同于预测均值

代码输出模型的系数 `w`、截距 `b`，以及训练集和测试集上的 MSE 和 R²，并绘制拟合直线。

### 1.4 手动 MSE 损失函数

手动实现均方误差损失函数：

```
MSE = (1/n) * Σ(y_true - y_pred)^2
```

梯度公式（对参数 w 和 b）：

```
dw = (-2/n) * Σ(x * (y_true - y_pred))
db = (-2/n) * Σ(y_true - y_pred)
```

手动计算得到的 MSE 与 sklearn 的 `mean_squared_error` 结果一致。

### 1.5 手动梯度下降法

从头实现梯度下降算法训练线性回归模型，不使用 sklearn 的优化器：

- 初始参数：`w = 0.0`, `b = 0.0`
- 学习率：`lr = 0.003`
- 迭代次数：300 epochs
- 使用全部数据进行批量梯度下降

训练过程使用 `plt.ion()` 进行实时动态可视化：
- **左图**：数据散点与当前拟合直线，随迭代动态更新
- **右图**：MSE 损失曲线，展示损失下降过程

每 10 个 epoch 输出当前参数值和损失值。训练完成后绘制最终拟合直线以及多轮 snapshot（epoch 1, 10, 30, 60, 100, 150, 200, 300）的对比图。

### 1.6 多项式回归

定义一个辅助函数 `fit_polynomial_regression`，内部使用 `make_pipeline` 组合 `PolynomialFeatures` 和 `LinearRegression`。

系统评估 degree = [1, 2, 3, 5, 8, 12] 的多项式回归性能，以及绘制 degree = 1, 3, 12 的拟合曲线对比：
- degree=1：欠拟合，无法捕捉数据的三次曲线形态
- degree=3：拟合较好，接近真实函数
- degree=12：过拟合，曲线剧烈振荡以穿过每个训练点

绘制训练 MSE 和测试 MSE 随多项式度数的变化曲线，展示偏差-方差权衡。

### 1.7 无正则化的高阶多项式（degree=12）

使用 degree=12 的多项式配合 `LinearRegression`（无正则化），展示典型过拟合：训练集 MSE 极低、R² 接近 1，但测试集 MSE 远高于训练集。

### 1.8 岭回归（Ridge）

使用 `make_pipeline` 组合 `PolynomialFeatures(degree=12)` + `StandardScaler` + `Ridge(alpha=1.0)`：

- **正则化项**：L2 范数（`α * Σw_i²`），惩罚过大的权重
- **效果**：缩小所有权重但不压缩至零，不能做特征选择
- **StandardScaler**：在进入 Ridge 之前对多项式特征进行标准化

### 1.9 LASSO 回归

使用 `make_pipeline` 组合 `PolynomialFeatures(degree=12)` + `StandardScaler` + `Lasso(alpha=0.03, max_iter=20000)`：

- **正则化项**：L1 范数（`α * Σ|w_i|`），惩罚权重的绝对值之和
- **效果**：可将部分权重精确压缩至 0，天然具备特征选择能力
- 需要更多的迭代次数（`max_iter=20000`）以保证收敛

### 1.10 多模型回归对比

拟合曲线对比、真实值 vs 预测值散点图（以对角线 `y = x` 为理想参考线）、模型性能汇总（Linear Regression、Polynomial Regression、Ridge、LASSO 的 Train/Test MSE 和 R²），以及三种模型的系数对比。

### 1.11 教学要点

| 概念 | 要点 |
|------|------|
| 模型形式 | y = wx + b |
| 梯度下降 | 沿梯度反方向迭代更新参数，学习率控制步长 |
| 欠拟合 | 训练和测试误差都高，模型过于简单 |
| 过拟合 | 训练误差极低但测试误差高，模型过于复杂 |
| 岭回归 (Ridge) | L2 正则化，系数缩小但不为零，不能做特征选择 |
| LASSO | L1 正则化，系数可被压缩为零，具备特征选择能力 |

---

## 第二部分：KNN 分类

### 2.1 数据集

使用 `sklearn.datasets.make_moons` 生成合成数据：300 个样本，噪声水平 0.25，两个交错月牙形类别（非线性可分）。

### 2.2 数据划分与标准化

使用 `train_test_split` 按 7:3 划分，且设置 `stratify=y` 保证各类别比例一致。使用 `StandardScaler` 对特征进行标准化（`x_scaled = (x - mean) / std`），展示标准化前后的前 5 行数据对比。

### 2.3 训练 KNN（k=5）

使用 `KNeighborsClassifier(n_neighbors=5)` 训练，评估训练集和测试集的准确率。

### 2.4 分类结果评估

- 测试集前 15 条样本真实标签与预测标签对比
- 测试样本在特征空间中的正确/错误标记散点图（正确为圆形、错误为叉号）
- **混淆矩阵**（DataFrame 格式，行=真实类别，列=预测类别）
- **分类报告**（`classification_report`）：每个类别的 precision、recall、f1-score

### 2.5 k 值超参数调优

遍历 k = 1 到 30，记录每个 k 值下的训练准确率和测试准确率，绘制准确率随 k 值变化的曲线：
- k=1：训练准确率极高但测试准确率下降（过拟合）
- k 适中（约 5-15）：训练和测试准确率趋于平衡
- k 过大：训练和测试准确率同步下降（欠拟合）

选出测试准确率最高对应的 k 值作为最佳 k。

### 2.6 决策边界可视化

调用 `plot_decision_boundary` 函数，绘制 k=1, 5, 10, 25 时的决策边界图。使用最佳 k 值训练模型，绘制最优模型的决策边界。

### 2.7 教学要点

| 概念 | 要点 |
|------|------|
| 核心思想 | 根据最近的 K 个邻居投票决定类别（"近朱者赤"） |
| k 值影响 | k 太小易过拟合，k 太大易欠拟合 |
| 标准化必要性 | 基于距离的算法必须先标准化，否则量纲大的特征会主导距离计算 |
| 决策边界 | 模型在特征空间中划分不同类别区域的分界线 |

---

## 第三部分：PSO 超参数优化 + K 折交叉验证

### 3.1 K 折交叉验证目标函数

定义 `evaluate_polynomial_ridge_cv` 函数：
- 输入 `degree`（自动取整且 >= 1）和 `alpha`（>= 1e-6）
- 构建 `PolynomialFeatures(degree)` + `StandardScaler` + `Ridge(alpha)` 的 pipeline
- 使用 5 折交叉验证（`KFold(n_splits=5, shuffle=True)`），以 `neg_mean_squared_error` 评分
- 返回 5 折 CV 的平均 MSE

### 3.2 PSO 算法实现

实现 `particle_swarm_optimization` 函数用于 2D 超参数搜索：

- **惯性权重 w**：0.7
- **认知系数 c1**：1.5
- **社会系数 c2**：1.5

每轮迭代更新粒子速度与位置并裁剪到边界内，以 K 折 CV 的 MSE 作为适应度函数，保留个体最优和全局最优，每轮输出当前最优解。

### 3.3 优化运行

- **搜索空间**：degree ∈ [1, 12]，alpha ∈ [0.0001, 10.0]
- **PSO 参数**：15 个粒子，25 次迭代

运行后输出最优参数和对应的 5 折 CV MSE，并绘制优化过程曲线（全局最优 MSE 随迭代次数的下降）。

### 3.4 用最优参数重新训练

使用 PSO 找到的最优 `(degree, alpha)` 构建最终模型，在全量训练集上训练，在测试集上评估 MSE 和 R²，绘制拟合曲线和真实值 vs 预测值散点图。

### 3.5 最终模型对比

将 Optimized Polynomial Ridge (PSO + KFold) 与多项式回归、Ridge、LASSO 四个模型汇总对比（Train MSE、Test MSE、Train R²、Test R²）。

---

## 依赖库

- `numpy` -- 数值计算
- `matplotlib` -- 数据可视化（含动态绘图 `plt.ion()`）
- `pandas` -- 数据展示（DataFrame）
- `IPython.display` -- `display`, `clear_output`
- `time` -- `time.sleep` 动画延时
- `sklearn.linear_model` -- `LinearRegression`, `Ridge`, `Lasso`
- `sklearn.preprocessing` -- `PolynomialFeatures`, `StandardScaler`
- `sklearn.pipeline` -- `make_pipeline`
- `sklearn.model_selection` -- `train_test_split`, `KFold`, `cross_val_score`
- `sklearn.metrics` -- `mean_squared_error`, `r2_score`, `accuracy_score`, `confusion_matrix`, `classification_report`
- `sklearn.neighbors` -- `KNeighborsClassifier`
- `sklearn.datasets` -- `make_moons`

## 环境要求

```bash
conda activate teach
pip install numpy pandas matplotlib scikit-learn
```

## 操作说明

1. 打开 `4_teach_ml.ipynb`
2. 选择 Kernel -> **teach**
3. 从头运行（Run All）

---

## 教学特色

- **手动实现与库调用并重**：梯度下降从头实现（含实时动态可视化），同时使用 sklearn 的 `LinearRegression`、`Ridge`、`Lasso` 作为基准
- **从简单到复杂**：基础线性回归 -> 多项式回归 -> 正则化 -> KNN 分类 -> PSO 超参数优化
- **可视化驱动**：散点图、拟合曲线、损失曲线、正确/错误标记图、混淆矩阵、决策边界、优化过程曲线
- **数据集可控**：全部使用合成数据（三次多项式+噪声、make_moons），随机种子固定，结果可复现
- **正则化对比**：同一数据上一一对比 Polynomial（无正则化）、Ridge（L2）、LASSO（L1）的系数和性能
- **超参数优化实战**：用 PSO 配合 K 折交叉验证自动搜索多项式 Ridge 的最优 (degree, alpha) 组合
