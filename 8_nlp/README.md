# 8_nlp -- 自然语言处理：BERT 情感分类 & GPT/LLM 文本生成

## 教学内容

本模块围绕 NLP 的两大核心范式展开：**文本理解**（BERT 情感分类）和**文本生成**（GPT/LLM）。

### 路线 A：BERT 情感分类（理解）

```
原始文本 -> Tokenizer -> BERT Embedding -> Attention -> 分类头 -> Positive / Negative
```

- TF-IDF + 传统分类器（传统 NLP 基线）
- BERT Tokenizer（文本如何转换为数字编号）
- BERT Embedding（token -> 语义向量）
- Attention 可视化（模型如何关注上下文）
- BERT Fine-tuning（微调完成情感分类）
- 模型迁移测试（跨领域泛化能力验证）

### 路线 B：GPT / LLM 文本生成（生成）

```
前文 prompt -> Tokenizer -> GPT Decoder -> Causal Attention -> 下一个 token
```

- GPT Decoder-only 架构详解
- Causal Attention（因果注意力 / 下三角掩码）
- 自回归生成（逐 token 手动循环）
- 概率分布可视化（模型做选择而非背答案）
- 解码策略（Greedy / Sampling / Top-k / Temperature）
- GPT-2 中文文本生成
- 现代 LLM 扩展（Llama / Ollama 对话）
- In-context Learning（上下文学习）

### Notebook

| 文件 | 内容 |
|------|------|
| `8_teach_nlp.ipynb` | BERT 情感分类全流程 + GPT 架构与文本生成 + LLM 扩展（In-context Learning、Ollama 对话等） |

## 环境要求

```bash
conda activate teach
pip install torch transformers datasets huggingface_hub \
    numpy pandas matplotlib scikit-learn tqdm requests
```

| 库 | 用途 |
|----|------|
| `transformers` | Hugging Face 模型加载（BERT / GPT-2） |
| `datasets` | ChnSentiCorp 中文情感数据集 |
| `huggingface_hub` | 模型与数据集下载 |
| `torch` | PyTorch 训练 BERT 分类器 |
| `scikit-learn` | TF-IDF + 传统分类器基线、评估指标 |

## 操作说明

### 首次运行前

```bash
conda activate teach
cd 8_nlp
```

### 模型与数据

首次运行时会自动下载以下资源：

- **BERT 模型**：`bert-base-chinese` -> `models/bert-base-chinese/`
- **GPT-2 模型**：`uer/gpt2-chinese-cluecorpussmall` -> `models/gpt2-chinese-cluecorpussmall/`
- **中文情感数据集**：ChnSentiCorp -> `data/chnsenticorp/`

> 请确保网络畅通，或在课前预先下载好模型与数据集。

## 配套应用

`app.py` 是基于 Streamlit 的 BERT 中文情感分析系统。训练完成后，可以使用训练好的模型权重部署交互式 Web 演示：

- 输入中文评论文本，实时返回情感预测结果
- 展示 Negative / Positive 的概率分布
- 内置多条示例文本，覆盖不同情感倾向

## 注意事项

- ChnSentiCorp 是中文酒店评论情感数据集。训练完成后可通过迁移测试（电影 / 手机 / 课程评论等）检验模型的泛化能力。
- `uer/gpt2-chinese-cluecorpussmall` 是通用中文 GPT-2 模型，生成结果展示语言建模规律，供教学理解自回归生成机制。
- 所有模型下载到 `models/` 目录，数据集下载到 `data/` 目录。
