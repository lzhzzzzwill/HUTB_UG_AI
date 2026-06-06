# 7_asr — 智能语音机器学习

## 教学内容

本实验介绍语音信号处理和机器学习在语音理解中的应用。notebook 共约 68 个 cell，交替穿插 Markdown 讲解与可执行代码。

### 覆盖模块

1. **语音信号处理基础** -- 波形、频谱、梅尔频谱、MFCC 特征
2. **情绪识别** -- 基于语音特征的 SVM 情绪分类（normal / happy / angry）
3. **方言识别** -- 普通话 vs 方言语音分类
4. **Hugging Face Space 外部演示** -- 音乐生成、语音克隆、格式转换的在线链接

### 四种语音表示

| 表示方式 | 维度 | 横轴 | 纵轴 | 优点 | 缺点 | 教学类比 |
|---------|------|------|------|------|------|---------|
| 波形 | 1D | 时间 | 振幅 | 最原始，信息完整 | 维度高，难直接使用 | 心电图 |
| 频谱 | 2D | 时间 | 频率(Hz) | 显示频率分布 | 维度高 | 钢琴琴键分布 |
| Mel频谱 | 2D | 时间 | Mel频率 | 符合人耳听觉 | 有信息损失 | 放大镜和望远镜 |
| MFCC | 2D | 时间 | 系数编号 | 信息紧凑，ML友好 | 抽象难解释 | 身份证号码 |

### 语音信号处理流水线

```
语音波形(1D时域) → 短时傅里叶变换(STFT) → 频谱(2D时频) → Mel滤波器 → Mel频谱 → DCT → MFCC
```

## 环境要求

```bash
conda activate teach
pip install numpy pandas matplotlib scikit-learn librosa sounddevice scipy ipython
```

| 库 | 用途 |
|----|------|
| `librosa` | 音频加载、特征提取（MFCC、梅尔频谱、过零率、谱质心、RMS） |
| `sounddevice` | 麦克风录音 |
| `scipy` | 音频文件写入（WAV 格式） |
| `numpy` / `pandas` / `matplotlib` | 数据处理与可视化 |
| `scikit-learn` | SVM（SVC）分类器、标准化、Pipeline、评估指标 |
| `IPython.display.Audio` | notebook 内播放音频 |

> Notebook 中还 `import whisper` 和 `import requests`，但这两个库在 notebook 中**未被实际调用**，无需安装。

## Notebook 结构

### 0. 导入与设备检查（cell 1-3）

- 导入所有依赖库
- 打印默认音频设备及可用设备列表

### 1. 观测自己的声音（cell 4-20）

使用 `sounddevice` 录制 3 秒语音（16 kHz 采样率，单声道），保存为 `student_voice.wav`，然后用 `librosa` 逐步处理并可视化：

| 步骤 | 关键 API | 输出 |
|------|----------|------|
| 录音 | `sd.rec()` + `sd.wait()` | `student_voice.wav` |
| 播放 | `IPython.display.Audio` | 内嵌音频播放器 |
| 读取 | `librosa.load()` | 采样率、数据长度、时长 |
| 波形图 | `librosa.display.waveshow()` | 时域振幅图 |
| 频谱图 | `librosa.stft()` → `amplitude_to_db()` → `specshow()` | 时频谱（STFT，Hz 刻度） |
| 梅尔频谱 | `librosa.feature.melspectrogram()` → `power_to_db()` | 时频谱（Mel 刻度，128 个 mel 频带） |
| MFCC 特征 | `librosa.feature.mfcc(n_mfcc=13)` | 13 维 MFCC 系数矩阵 |

- **频谱图解读**：横轴时间、纵轴频率、颜色深浅表示能量强弱；横条纹对应基频和谐波。
- **Mel 刻度**：模拟人耳对低频敏感、高频不敏感的特性（`mel = 2595 * log10(1 + f/700)`）。
- **MFCC 13 个系数**：MFCC 1 代表整体能量，MFCC 2-4 代表频谱包络形状，MFCC 5-8 代表精细频谱细节，MFCC 9-13 为更高频细节。

### 2. 情绪判断（cell 21-53）

**三类情绪**：normal（正常）、happy（高兴）、angry（生气）

**流程**：

1. 录制情绪数据集：每类 8 个样本，每人说同一句话"今天的实验完成了"，分别用三种情绪录制（`voice_emotion_dataset/`）。
2. 查看数据集结构，随机读取一个样本并依次绘制波形、频谱、Mel 频谱、MFCC 特征图。
3. 定义特征提取函数 `extract_voice_features()`，提取以下特征：
   - MFCC 均值（13 维）和标准差（13 维）
   - 过零率（ZCR）均值和标准差
   - 谱质心（Spectral Centroid）均值和标准差
   - RMS 能量均值和标准差
   - 共计 30 维特征向量
4. 构建特征矩阵 X（样本数 x 30）和标签 y。
5. 用 `train_test_split(stratify=y_labels, test_size=0.3)` 划分训练/测试集。
6. 训练 SVM 分类器（Pipeline：`StandardScaler` + `SVC(kernel="rbf", probability=True)`）。
7. 评估：准确率、分类报告（precision / recall / f1-score）、混淆矩阵可视化。
8. 录制新语音并预测情绪类别及概率。

**分类器说明**：仅使用 **SVM（SVC）**，核函数为 RBF，用于处理语音特征的非线性关系。notebook 中无 MLP 或其他神经网络分类器。

**语音情绪特征含义**：

| 特征 | 物理含义 | 与情绪的关系 |
|------|---------|-------------|
| MFCC | 频谱包络（反映声道形状） | 不同情绪改变发音方式 |
| 过零率 | 信号穿过零轴的频率 | 生气时高，平静时低 |
| 谱质心 | 频率的重心位置 | 高兴时偏高，悲伤时偏低 |
| RMS能量 | 声音的强度 | 生气时高，平静时低 |

### 3. 普通话 vs 方言（cell 54-66）

**四类标签**：`mandarin_hello`、`mandarin_goodbye`、`dialect_hello`、`dialect_goodbye`

**流程**：

1. 录制方言数据集：每类 3 个样本，2 秒时长（`dialect_voice_dataset/`）。
2. 定义翻译字典 `translation_dict`，将标签映射为中文（"你好" / "再见"）。
3. 定义特征提取函数 `extract_mfcc_feature()`，仅提取 MFCC 均值（13 维）和标准差（13 维），共 26 维特征向量。
4. 构建特征矩阵并划分训练/测试集（`test_size=0.2`）。
5. 训练 SVM（Pipeline：`StandardScaler` + `SVC(kernel="rbf", probability=True)`）。
6. 评估：准确率、分类报告。
7. 录制新语音，预测类别并结合翻译字典输出中文含义及各类别概率。

**普通话 vs 方言特征差异**：

| 特征 | 普通话 | 方言 |
|------|--------|------|
| MFCC系数 | 标准发音模式 | 可能偏移（口音） |
| 谱质心 | 较稳定 | 可能变化（发音习惯） |
| 过零率 | 标准范围 | 可能不同（语速、语调） |

### 4. Hugging Face Space 外部演示（cell 67-68）

本部分**仅包含三个外部 Hugging Face Space 链接**，无代码实现：

- 音乐生成：`https://huggingface.co/spaces/tencent/SongGeneration`
- 语音克隆与生成：`https://huggingface.co/spaces/k2-fsa/OmniVoice`
- 格式转换：`https://huggingface.co/spaces/techfreakworm/LTX2.3-Studio`

> 这不是教学模块，而是供学生体验前沿语音 AI 应用的课外参考链接。

## 完整处理流水线

```
音频录制 → 信号可视化 → 特征提取(MFCC等) → ML模型(SVM) → 预测分类
    ↓          ↓              ↓                  ↓            ↓
 sounddevice  波形/频谱      librosa           sklearn      confidence
```

**本实验覆盖的知识点**：
1. 语音信号时域分析（波形）
2. 语音信号频域分析（频谱、Mel 频谱）
3. 特征提取（MFCC、过零率、谱质心、RMS）
4. 传统机器学习分类（SVM）
5. 情绪识别与方言识别两个实际应用

## 操作说明

1. 打开 `7_teach_asr.ipynb`
2. 选择 Kernel → **teach**
3. 按顺序执行 cell

> macOS 用户首次使用麦克风时需要在系统设置中授权（系统设置 → 隐私 → 麦克风）。
