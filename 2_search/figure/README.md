# 边界台 · Frontier bench

`2_search/frontier-bench.html`（深色）与 `2_search/frontier-bench-light.html`（浅色，投影用）由本目录生成。

- `model.mjs` — 8 数码与四种边界规则（A* / BFS 队列 / DFS 栈）的纯模型；图里每一个数字都从这里来。
- `geometry.mjs` — 全部静态零件（台面、料台、切断机、取料龙门、料仓、旋钮）与可动件（料条、探吸头、探针、目标针）的几何。
- `live.js` — 运行时：一步的取料顺序、扫描、动画、读数与键盘/指针交互。
- `build.mjs` — 组装页面并写入 `../frontier-bench*.html`。

重新生成：

```bash
cd 2_search/figure
node build.mjs          # 深色
node build.mjs --light  # 浅色
```

改题目：`model.mjs` 里的 `START` / `GOAL`；改料台容量：`geometry.mjs` 的 `SLOTS`（容量小于 A* 的边界峰值时，A* 也会停在“料台已满”）。
