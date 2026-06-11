# 🤖 人工智能导论本科教学实验课程

本仓库包含一套完整的**人工智能导论本科教学实验**，覆盖知识空间、搜索算法、遗传算法、机器学习、神经网络、计算机视觉、语音识别、自然语言处理共 8 个教学模块。

## 📚 模块一览

| 模块 | 内容 | 核心技术 |
|------|------|---------|
| [1_kr](1_kr/) | 15 数码难题 — 状态空间搜索 | 状态空间图、可解性判定、BFS |
| [2_search](2_search/) | 8 数码难题 — 搜索算法 | 启发式搜索、A*、曼哈顿距离 |
| [3_ci](3_ci/) | 遗传算法 — 特征选择 | 遗传算法(GA)、适应度函数、交叉变异 |
| [4_ml](4_ml/) | 线性回归 — 机器学习入门 | 最小二乘法、梯度下降、模型评估 |
| [5_nn](5_nn/) | 感知器与神经网络 | 反向传播、激活函数、PyTorch 基础 |
| [6_cv](6_cv/) | CIFAR-10 图像分类 | CNN、卷积池化、传统方法 vs 深度学习 |
| [7_asr](7_asr/) | 智能语音识别 | MFCC、梅尔频谱、情绪识别、方言识别 |
| [8_nlp](8_nlp/) | NLP：BERT 情感分类 + GPT 文本生成 | Tokenizer、Attention、Transformer |

## 🛠 环境配置（必读）

### 推荐方案：VSCode + Conda

```
VSCode（编写/运行代码）+ Conda（管理 Python 环境）
```

### 第 1 步：安装 Miniconda（或 Anaconda）

从官网下载安装：[https://docs.conda.io/miniconda.html](https://docs.conda.io/miniconda.html)

安装后在终端验证：

```bash
conda --version
```

### 第 2 步：创建统一环境

所有模块共享一个 conda 环境，避免重复安装：

```bash
conda create -n teach python=3.10 -y
conda activate teach
```

### 第 3 步：安装依赖

建议在 `teach` 环境中执行以下命令：

```bash
# 基础科学计算
pip install numpy pandas matplotlib scikit-learn

# 深度学习（根据硬件选择其一）
# 方案 A：仅 CPU（所有 Mac/Windows/Linux 通用）
pip install torch torchvision torchaudio

# 方案 B：macOS (MPS 加速，M1/M2/M3 Mac)
pip install torch torchvision torchaudio

# 方案 C：Windows/Linux 有 NVIDIA GPU
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# NLP & 语音
pip install transformers datasets huggingface_hub librosa sounddevice

# Jupyter 内核（在 VSCode 中运行 notebook 需要）
pip install ipykernel jupyter
python -m ipykernel install --user --name teach --display-name "teach"
```

**国内用户加速**（可选，在 pip install 后加 `-i` 参数）：

```bash
pip install numpy pandas -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 第 4 步：在 VSCode 中打开

然后在 VSCode 中打开任意 `.ipynb` 文件 → 右上角选择 Kernel → **teach**。

> 💡 **提示**：如果 Kernel 列表中没有 "teach"，请重启 VSCode 或在命令面板（Cmd+Shift+P）中运行 `Python: Select Interpreter` 选择 teach 环境。

## 🔧 各模块特殊依赖

| 模块 | 额外依赖 | 说明 |
|------|---------|------|
| 1_kr | 无 | 纯 Python 实现，无需额外库 |
| 2_search | 无 | 纯 Python 实现 |
| 3_ci | 无（纯 Python 实现） | 遗传算法与粒子群优化 |
| 4_ml | sklearn | 机器学习工具包 |
| 5_nn | torch | PyTorch 深度学习框架 |
| 6_cv | torch, torchvision | CV 必备，需下载 CIFAR-10 数据集 |
| 7_asr | librosa, sounddevice | 音频处理，运行时需麦克风权限 |
| 8_nlp | transformers, datasets | BERT/GPT 模型，首次运行需下载预训练模型 |

## 📝 教学操作建议

1. **按顺序学习**：建议从 1_kr → 8_nlp 按编号顺序学习，难度递进。
2. **VSCode 中运行**：每个 notebook 建议**从头到尾一次性运行**，避免中间跳过后导致变量未定义。
3. **遇错重启**：如果某个 cell 报错，建议 `Kernel → Restart & Run All` 从头运行。
4. **网络问题**：6_cv、7_asr、8_nlp 需要下载模型或数据集，如遇下载失败，可尝试配置代理或使用国内镜像。
5. **硬件要求**：7_asr 需要麦克风；8_nlp 的 BERT 微调建议使用 GPU（Mac 用户会自动使用 MPS 加速）。

## 📂 目录结构

```
.
├── README.md              ← 本文件
├── 1_kr/                  # 15 数码 — 状态空间搜索
│   └── 1_teach_kr.ipynb
├── 2_search/              # 8 数码 — 搜索算法
│   └── 2_teach_search.ipynb
├── 3_ci/                  # 遗传算法 — 特征选择
│   └── 3_teach_ci.ipynb
├── 4_ml/                  # 机器学习 — 线性回归
│   └── 4_teach_ml.ipynb
├── 5_nn/                  # 神经网络 — 感知器与 PyTorch
│   └── 5_teach_nn.ipynb
├── 6_cv/                  # 计算机视觉 — CNN
│   ├── 6_teach_cv.ipynb
│   └── saved_models_cifar/
├── 7_asr/                 # 语音识别
│   └── 7_teach_asr.ipynb
├── 8_nlp/                 # NLP — BERT & GPT
│   ├── 8_teach_nlp.ipynb
│   ├── data/
│   └── models/
```

## 👏 共创
欢迎各位老师同学贡献力量，期待与您的合作[📪](mailto:lzhzzzzgkbs@163.com).
