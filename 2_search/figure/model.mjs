// The 8-puzzle and the four frontier rules, as a small pure module.
// Every number the figure shows comes from here.

export const GOAL = [1, 2, 3, 8, 0, 4, 7, 6, 5];
export const START = [1, 3, 0, 8, 6, 4, 7, 5, 2]; // eight moves from the goal
export const DEPTH_CAP = 28;

const key = (state) => state.join("");
const goalAt = new Map(GOAL.map((value, index) => [value, [Math.floor(index / 3), index % 3]]));

export function h(state) {
  let sum = 0;
  for (let index = 0; index < 9; index++) {
    const value = state[index];
    if (!value) continue;
    const [row, column] = goalAt.get(value);
    sum += Math.abs(Math.floor(index / 3) - row) + Math.abs(index % 3 - column);
  }
  return sum;
}

export function neighbours(state) {
  const blank = state.indexOf(0);
  const row = Math.floor(blank / 3);
  const column = blank % 3;
  const out = [];
  for (const [dr, dc, move] of [[-1, 0, "上"], [1, 0, "下"], [0, -1, "左"], [0, 1, "右"]]) {
    const nr = row + dr;
    const nc = column + dc;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
    const next = state.slice();
    const target = nr * 3 + nc;
    [next[blank], next[target]] = [next[target], next[blank]];
    out.push({ state: next, move });
  }
  return out;
}

export const RULES = [
  { id: "astar", name: "A*", key: "g + h", takes: "shortest" },
  { id: "queue", name: "BFS 队列", key: "g", takes: "oldest" },
  { id: "stack", name: "DFS 栈", key: "g", takes: "newest" },
];

// A search that yields one expansion at a time, with the numbers the machine reads.
export function createSearch({ start = START, rule = "astar", cap = 600 } = {}) {
  const root = { state: start, g: 0, h: h(start), order: 0, parent: null, move: "初始" };
  const open = [root];
  const known = new Set([key(start)]);
  const solvedStates = new Set();
  let order = 0;
  let expanded = 0;
  let peak = 1;
  let solved = null;

  const ruleOf = (id) => RULES.find((entry) => entry.id === id) ?? RULES[0];

  function pick() {
    const mode = rule;
    if (mode === "stack") return open.length - 1;
    let best = 0;
    for (let index = 1; index < open.length; index++) {
      const a = open[index];
      const b = open[best];
      if (mode === "queue") {
        if (a.g < b.g || (a.g === b.g && a.order < b.order)) best = index;
      } else {
        const fa = a.g + a.h;
        const fb = b.g + b.h;
        if (fa < fb || (fa === fb && a.order < b.order)) best = index;
      }
    }
    return best;
  }

  function step() {
    if (solved || !open.length || expanded >= cap) return { done: true, popped: null, added: [], solved };
    const index = pick();
    const node = open.splice(index, 1)[0];
    expanded += 1;
    if (key(node.state) === key(GOAL)) {
      let walk = node;
      const path = [];
      while (walk) {
        path.push(walk);
        walk = walk.parent;
      }
      path.reverse();
      solved = { node, path, expanded };
      return { done: true, popped: node, added: [], solved, frontier: open.slice(), expanded };
    }
    solvedStates.add(key(node.state));
    const added = [];
    const mode = rule;
    if (mode !== "stack" || node.g < DEPTH_CAP) {
      for (const { state, move } of neighbours(node.state)) {
        const identifier = key(state);
        if (known.has(identifier)) continue;
        known.add(identifier);
        const child = { state, g: node.g + 1, h: h(state), order: ++order, parent: node, move };
        open.push(child);
        added.push(child);
      }
    }
    peak = Math.max(peak, open.length);
    return { done: false, popped: node, added, frontier: open.slice(), expanded };
  }

  // What the machine shows on its rack: the front of the open list, in the order it
  // will be taken. At most 24 bars fit on the rack; the rest overflow.
  function ranked(list = open) {
    const copy = list.slice();
    const mode = rule;
    if (mode === "stack") {
      copy.sort((a, b) => b.order - a.order);
    } else if (mode === "greedy") {
      copy.sort((a, b) => a.h - b.h || a.order - b.order);
    } else if (mode === "queue") {
      copy.sort((a, b) => a.g - b.g || a.order - b.order);
    } else {
      copy.sort((a, b) => a.g + a.h - (b.g + b.h) || a.h - b.h || a.order - b.order);
    }
    return copy;
  }

  return {
    get open() { return open; },
    get expanded() { return expanded; },
    get peak() { return peak; },
    get solved() { return solved; },
    get rule() { return ruleOf(rule); },
    setRule(next) { rule = next; },
    step,
    ranked,
  };
}

// Totals for the caption, measured once at build time.
export function measure(start, rule) {
  const search = createSearch({ start, rule, cap: 20000 });
  let guard = 0;
  while (!search.solved && guard++ < 20000) {
    const result = search.step();
    if (result.done) break;
  }
  return {
    expanded: search.expanded,
    peak: search.peak,
    path: search.solved ? search.solved.path.length - 1 : null,
    solved: Boolean(search.solved),
  };
}
