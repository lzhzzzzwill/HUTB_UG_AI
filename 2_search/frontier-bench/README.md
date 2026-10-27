# 边界台 · Frontier bench

一个用 anatomy 等轴测投影实现的交互式教学实验台，把 A*/BFS/DFS 三种搜索算法的"边界（frontier）"呈现为一台**实验台式的机器**。

`frontier-bench.html`（深色）与 `frontier-bench-light.html`（浅色，投影用）就在本目录，双击浏览器打开即可，离线可用。

## 工位与对应概念

| 工位 | 对应 notebook 概念 | 动画里看到什么 |
|------|------------------|--------------|
| 🎯 **目标针** | 目标状态 | 棋盘 1-2-3 / 8-0-4 / 7-6-5 按位插在台面上 |
| 📊 **料台 / 探吸头** | 搜索前沿 | 探吸头从料台逐个取出状态，顶部读数格实时显示当前 g/h/f 和规则 |
| ✂️ **切断机** | 邻居扩展 | 每取一个状态，切断机把 2-4 个邻居"切"出来放进料台 |
| 🗃️ **料仓** | Closed / 已访问集合 | 加工过的状态落入料仓，不再被取到 |
| 🔘 **规则旋钮** | A* / BFS / DFS | 1→A*（料台按 f 值排序）、2→BFS（FIFO 队列）、3→DFS（LIFO 栈）；可随时切换观察料台顺序变化 |

## 文件

- `frontier-bench.html` — 深色版（默认）
- `frontier-bench-light.html` — 浅色版（投影仪更亮）
- `preview-dark.png` / `preview-light.png` — 预览截图
- `model.mjs` — 8 数码与四种边界规则的纯模型；图里每一个数字都从这里来
- `geometry.mjs` — 静态零件（台面、料台、切断机、龙门、料仓、旋钮）与可动件（料条、探吸头、探针、目标针）的几何
- `live.js` — 运行时：一步的取料顺序、扫描、动画、读数与键盘/指针交互
- `build.mjs` — 组装页面，输出到本目录同名 html
- `kit/iso-kit.mjs` / `kit/inline-kit.mjs` / `kit/iso.css` — anatomy 等轴测工具链

## 操作

- **空格 / 按钮 / 点击**：走一步
- **1 / 2 / 3**：切换规则（A* / BFS / DFS）
- **旋钮**：鼠标悬停在右上角旋钮上可直接切换

## 重新生成

```bash
cd 2_search/frontier-bench
node build.mjs          # frontier-bench.html（深色）
node build.mjs --light  # frontier-bench-light.html（浅色）
```

改题目：`model.mjs` 里的 `START` / `GOAL`；改料台容量：`geometry.mjs` 的 `SLOTS`（容量小于 A* 的边界峰值时，A* 也会停在"料台已满"）。
