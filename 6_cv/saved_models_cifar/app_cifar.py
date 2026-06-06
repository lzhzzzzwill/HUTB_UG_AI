import streamlit as st
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import pandas as pd


# =========================
# 1. 定义模型结构
# 必须和训练时完全一致
# =========================

class SimpleCNN(nn.Module):
    def __init__(self):
        super().__init__()

        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)

        self.pool = nn.MaxPool2d(2, 2)

        self.fc1 = nn.Linear(32 * 8 * 8, 128)
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))  # [B, 16, 16, 16]
        x = self.pool(F.relu(self.conv2(x)))  # [B, 32, 8, 8]

        x = x.view(x.size(0), -1)

        x = F.relu(self.fc1(x))
        x = self.fc2(x)

        return x


# =========================
# 2. 加载模型
# =========================

@st.cache_resource
def load_model():
    checkpoint = torch.load(
        "cifar10_simple_cnn.pth",
        map_location="cpu"
    )

    model = SimpleCNN()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    class_names = checkpoint["class_names"]
    mean = checkpoint["mean"]
    std = checkpoint["std"]

    return model, class_names, mean, std


model, class_names, mean, std = load_model()


# =========================
# 3. 图像预处理
# =========================

transform = transforms.Compose([
    transforms.Resize((32, 32)),
    transforms.ToTensor(),
    transforms.Normalize(mean=mean, std=std)
])


# =========================
# 4. Streamlit 页面
# =========================

st.title("CIFAR-10 图像分类演示系统")
st.write("上传一张图片，模型会预测其属于 CIFAR-10 的哪一类。")

st.write("支持类别：")
st.write(class_names)

uploaded_file = st.file_uploader(
    "上传图片",
    type=["jpg", "jpeg", "png"]
)

if uploaded_file is not None:
    image = Image.open(uploaded_file).convert("RGB")

    st.image(
        image,
        caption="上传的原始图像",
        use_container_width=True
    )

    input_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        predicted_idx = torch.argmax(probabilities).item()
        predicted_class = class_names[predicted_idx]
        confidence = probabilities[predicted_idx].item()

    st.subheader("预测结果")

    st.write(f"预测类别：**{predicted_class}**")
    st.write(f"置信度：**{confidence:.4f}**")

    result_df = pd.DataFrame({
        "类别": class_names,
        "概率": probabilities.numpy()
    }).sort_values(
        by="概率",
        ascending=False
    )

    st.subheader("各类别预测概率")
    st.dataframe(result_df, use_container_width=True)

    st.bar_chart(
        result_df.set_index("类别")
    )