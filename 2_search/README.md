# 2_search -- 8数码难题 . 搜索算法

## 教学内容

本实验围绕 **8数码难题**（8-Puzzle，3x3棋盘）展开，依次介绍可解性判定、无信息搜索（BFS、DFS）和启发式搜索（A*）。

核心知识点：
- **问题建模**：将棋盘状态编码为一维数组，0 表示空格
- **可解性判定**：通过逆序数（inversion count）奇偶性判断初始状态是否可达到目标状态
- **BFS（宽度优先搜索）**：使用队列，层次遍历，保证找到最短路径
- **DFS（深度优先搜索）**：使用栈/递归，沿分支深入，需要深度限制防止无限搜索
- **A\* 算法**：使用优先队列，评估函数 f(n) = g(n) + h(n)，曼哈顿距离作为启发式函数

## 环境要求

需要 conda 环境 `teach`（Python 3.10）：

```bash
conda create -n teach python=3.10
conda activate teach
```

所需 Python 标准库：`collections`（`deque`、`defaultdict`）、`heapq`。无需安装第三方库。

## 操作说明

1. 打开 `2_teach_search.ipynb`
2. 选择 Kernel → **teach**
3. 按顺序从 Cell 1 执行到 Cell 10

## Notebook 单元结构（共 10 个 Cell）

| Cell | 类型 | 内容 |
|------|------|------|
| 1 | Markdown | 环境配置：`conda create` 和 `conda activate` 命令 |
| 2 | Markdown | 8数码难题介绍：问题描述、3x3棋盘、可解性判定原理、学习重点 |
| 3 | Code | 可解性判定：`inversion_count()` 和 `is_solvable_3x3()` 的实现与示例 |
| 4 | Markdown | BFS 介绍：核心特点（层次遍历、最优性、完备性）、算法思想、应用场景、BFS vs DFS vs A* 对比表 |
| 5 | Code | BFS 实现：`bfs_all_shortest_paths()` 返回所有最短路径，含完整演示 |
| 6 | Markdown | DFS 介绍：核心特点（深度优先、空间效率高、不一定最优）、算法思想、应用场景、深度限制的重要性 |
| 7 | Code | DFS 实现：`dfs_limited()` 带深度约束的递归搜索，含完整演示 |
| 8 | Markdown | A* 介绍：核心思想 f(n)=g(n)+h(n)、启发式函数类型（曼哈顿距离、欧几里得距离、对角距离）、算法优势、应用场景 |
| 9 | Code | A* 实现：`a_star()` 使用 `heapq` 优先队列 + 曼哈顿距离启发函数，含完整演示 |
| 10 | Markdown | 参考资料：外部链接（Red Blob Games A* 介绍、遗传算法可视化）及拓展阅读说明 |

## 关键函数说明

### 可解性判定（Cell 3、5、7、9 中均出现）

- **`inversion_count(board)`**：计算一维数组中非零元素的逆序数。遍历每一对 (i, j) 满足 i < j，若 `nums[i] > nums[j]` 则计数加一。
- **`is_solvable_3x3(start, goal)`**（在 A* 代码中命名为 `is_solvable`）：3x3 八数码的可解条件为初始状态与目标状态的逆序数奇偶性相同，即 `inversion_count(start) % 2 == inversion_count(goal) % 2`。

### 状态扩展（Cell 5、7、9 中均出现）

- **`get_neighbors(state)`**：找到空格（0）的索引，根据其行列位置尝试上、下、左、右四个方向移动，返回所有合法的相邻状态列表 `[(next_state, action), ...]`。动作名称在 BFS/DFS 中为 "空格上移/下移/左移/右移"，在 A* 中为 "上/下/左/右"。

### 打印棋盘

- **`print_board(state)`**：将一维 9 元素列表按 3x3 形式打印。BFS/DFS 用 "□" 表示空格，A* 用空格字符 " " 表示空格。

## 三种搜索算法对比

| 特性 | BFS | DFS | A* |
|------|-----|-----|-----|
| 数据结构 | 队列 (Queue) | 栈 (Stack) | 优先队列 (Priority Queue) |
| 搜索策略 | 广度优先 | 深度优先 | 启发式优先 |
| 最优性 | 保证最短路径 | 不保证最优 | 保证最优（h 可采纳时） |
| 空间复杂度 | O(b^d) 高 | O(bd) 低 | O(b^d) 中等 |
| 完备性 | 有解必找到 | 可能无限循环 | 有解必找到 |

## BFS 实现特点

- 使用 `deque` 作为队列，`dist` 字典记录每个状态的最短距离
- `parents` 字典（`defaultdict(list)`）记录每个状态的所有最短前驱，支持回溯**所有**最短路径
- `backtrack()` 递归函数从目标状态回溯到初始状态，重建完整路径
- 输出：最短步数、最短路径条数、每条路径的逐步状态

## DFS 实现特点

- 使用递归 + `visited_in_path` 集合进行路径上的循环检测
- **`depth_limit` 参数**防止无限搜索（代码示例中默认设为 10，可改为 4、6、8 等）
- 找到第一个解即返回，不保证是最短路径
- `path` 列表实时记录当前搜索路径，回溯时弹出

## A* 实现特点

- 使用 `heapq` 优先队列（最小堆），堆元素为 `(f_score, g_score, state)`
- 启发式函数：**曼哈顿距离** `manhattan_distance(state, goal)` -- 计算每个非零数码的当前位置与目标位置的 `|x1-x2| + |y1-y2|` 之和
- `g_score` 记录从起点到当前状态的实际代价，`f_score = g_score + h_score`
- `visited` 集合防止重复扩展
- `reconstruct_path()` 通过 `came_from` 和 `move_from` 字典回溯完整路径
- 初始状态与 BFS/DFS 中使用的不完全相同（初始状态为 `(2,8,3,1,6,4,7,0,5)`）

## 注意事项

- **所有初始状态均为代码中手动定义**，未使用随机生成或反向随机移动。
- **曼哈顿距离是 A* 中唯一实现的启发式函数**，是可采纳的（不会高估实际代价），因此 A* 保证找到最优解。
- **DFS 依赖 `depth_limit`**：若深度限制过小（如 4），可能找不到解；需逐步增大限制值（如 6、8、10）。

## 参考资料

- Red Blob Games -- A* 寻路介绍：https://www.redblobgames.com/pathfinding/a-star/introduction.html
- 遗传算法可视化：https://abelchiao.github.io/genetic-algorithm-visualization/
