import streamlit as st
import torch
import pandas as pd

from pathlib import Path
from transformers import BertForSequenceClassification, BertTokenizer


# =========================
# 页面配置
# =========================

st.set_page_config(
    page_title="BERT 中文情感分析",
    page_icon="🤖",
    layout="centered"
)

st.title("BERT 中文情感分析系统")

st.write("输入一句中文评论，模型会判断其情感倾向。")


# =========================
# 路径配置
# =========================

MODEL_FILE = Path(
    "/Users/linzuhong/Downloads/HUTBCourse_AI_Undergraduate-main/8_nlp/saved_models_bert/bert_chinese_sentiment.pth"
)

TOKENIZER_DIR = Path(
    "/Users/linzuhong/Downloads/HUTBCourse_AI_Undergraduate-main/8_nlp/saved_models_bert/bert_tokenizer"
)


# =========================
# 设备选择
# =========================

device = torch.device(
    "mps"
    if torch.backends.mps.is_available()
    else "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# =========================
# 加载模型
# =========================

@st.cache_resource
def load_model():

    checkpoint = torch.load(
        MODEL_FILE,
        map_location=device
    )

    label_names = checkpoint["label_names"]

    model = BertForSequenceClassification.from_pretrained(
        "bert-base-chinese",
        num_labels=2
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.to(device)
    model.eval()

    tokenizer = BertTokenizer.from_pretrained(
        TOKENIZER_DIR
    )

    return model, tokenizer, label_names


model, tokenizer, label_names = load_model()


# =========================
# 预测函数
# =========================

def predict_sentiment(text):

    encoding = tokenizer(
        text,
        max_length=128,
        padding="max_length",
        truncation=True,
        return_tensors="pt"
    )

    input_ids = encoding["input_ids"].to(device)
    attention_mask = encoding["attention_mask"].to(device)

    with torch.no_grad():

        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask
        )

        probs = torch.softmax(
            outputs.logits,
            dim=1
        )[0]

        pred_idx = torch.argmax(
            probs
        ).item()

    return {
        "prediction": label_names[pred_idx],
        "negative_prob": float(probs[0]),
        "positive_prob": float(probs[1])
    }


# =========================
# 输入区域
# =========================

st.subheader("输入文本")

text = st.text_area(
    "请输入中文文本：",
    height=120,
    placeholder="例如：这家餐厅环境很好，但是服务很差。"
)


# =========================
# 预测
# =========================

if st.button("开始预测"):

    if text.strip() == "":

        st.warning("请输入文本。")

    else:

        result = predict_sentiment(text)

        st.subheader("预测结果")

        st.write("预测类别：", result["prediction"])

        st.write(
            "Negative 概率：",
            f"{result['negative_prob']:.4f}"
        )

        st.write(
            "Positive 概率：",
            f"{result['positive_prob']:.4f}"
        )

        prob_df = pd.DataFrame({
            "类别": ["Negative", "Positive"],
            "概率": [
                result["negative_prob"],
                result["positive_prob"]
            ]
        })

        st.subheader("概率分布")

        st.bar_chart(
            prob_df.set_index("类别")
        )

        st.dataframe(
            prob_df,
            use_container_width=True
        )


# =========================
# 示例文本
# =========================

st.markdown("---")

st.subheader("示例文本")

examples = [
    "这家餐厅环境很好，下次还会再来。",
    "服务态度太差了，再也不会来了。",
    "虽然价格有点贵，但是整体体验很好。",
    "环境不错，但是菜真的不好吃。",
    "这门课内容很清楚，收获很大。",
    "讲得太乱了，完全听不懂。"
]

for example in examples:

    if st.button(example):

        result = predict_sentiment(example)

        st.write("文本：", example)
        st.write("预测类别：", result["prediction"])
        st.write("Negative 概率：", f"{result['negative_prob']:.4f}")
        st.write("Positive 概率：", f"{result['positive_prob']:.4f}")