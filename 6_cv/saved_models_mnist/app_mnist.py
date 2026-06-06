import streamlit as st
import torch
import torch.nn as nn
import torch.nn.functional as F

from torchvision import transforms
from PIL import Image

import pandas as pd
import matplotlib.pyplot as plt


# =========================
# 定义 CNN
# 必须与训练时一致
# =========================

class SimpleCNN(nn.Module):

    def __init__(self):
        super().__init__()

        self.conv1 = nn.Conv2d(
            1,
            16,
            kernel_size=3,
            padding=1
        )

        self.conv2 = nn.Conv2d(
            16,
            32,
            kernel_size=3,
            padding=1
        )

        self.pool = nn.MaxPool2d(2, 2)

        self.fc1 = nn.Linear(
            32 * 7 * 7,
            128
        )

        self.fc2 = nn.Linear(
            128,
            10
        )

    def forward(self, x):

        x = self.pool(
            F.relu(self.conv1(x))
        )

        x = self.pool(
            F.relu(self.conv2(x))
        )

        x = x.view(x.size(0), -1)

        x = F.relu(self.fc1(x))

        x = self.fc2(x)

        return x


# =========================
# 加载模型
# =========================

@st.cache_resource
def load_model():

    checkpoint = torch.load(
        "mnist_simple_cnn.pth",
        map_location="cpu"
    )

    model = SimpleCNN()

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.eval()

    return model


model = load_model()


# =========================
# 图像预处理
# =========================

transform = transforms.Compose([

    transforms.Grayscale(),

    transforms.Resize((28, 28)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=(0.1307,),
        std=(0.3081,)
    )
])


# =========================
# 页面
# =========================

st.title("MNIST 手写数字识别")

st.write("上传一张手写数字图片。")

uploaded_file = st.file_uploader(
    "上传图片",
    type=["png", "jpg", "jpeg"]
)

if uploaded_file is not None:

    image = Image.open(uploaded_file)

    st.image(
        image,
        caption="上传图片",
        width=200
    )

    input_tensor = transform(image)

    st.subheader("Tensor 信息")

    st.write("Tensor shape:")
    st.write(input_tensor.shape)

    st.write("最小值:", float(input_tensor.min()))

    st.write("最大值:", float(input_tensor.max()))

    input_batch = input_tensor.unsqueeze(0)

    with torch.no_grad():

        outputs = model(input_batch)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )[0]

        pred_idx = torch.argmax(
            probabilities
        ).item()

    st.subheader("预测结果")

    st.write(f"预测数字：{pred_idx}")

    st.write(
        f"预测置信度：{probabilities[pred_idx]:.4f}"
    )

    result_df = pd.DataFrame({
        "数字": list(range(10)),
        "概率": probabilities.numpy()
    })

    st.dataframe(result_df)

    st.bar_chart(
        result_df.set_index("数字")
    )