// GA 育种台 — an isometric teaching rig for the genetic algorithm in
// 3_ci/3_teach_ci.ipynb (Iris feature selection: 8 individuals × 4 bits, 6 generations).
//
//   node build.mjs            → ga-bench.html (light)
//   node build.mjs --dark     → ga-bench-dark.html
//
// The wheel is a roulette whose sectors are as wide as each individual's share of
// the fitness; the pin board is the population (a tall pin is a 1); the splice
// bench cuts two parent strips at one point and swaps their tails; the dial reads
// 3-NN cross-validated accuracy; the plotter draws the historical best per generation.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.ANATOMY ?? "/Users/lzh_studio/.codex/skills/anatomy";
const load = (path) => import(pathToFileURL(join(SKILL, path)).href);

const k = await load("kit/iso-kit.mjs");
const G = await load("kit/lathe.mjs");
const { kitScript } = await load("scripts/inline-kit.mjs");
const { runGA } = await import(pathToFileURL(join(HERE, "model.mjs")).href);

const theme = process.argv.includes("--dark") ? "dark" : "light";
const DATA = JSON.parse(readFileSync(join(HERE, "..", "ci_data.json"), "utf8"));
const TRACE = runGA(DATA.iris);

/* ─────────────────────────────── world and camera ───────────────────────────── */

const W = 800;
const H = 470;

const BENCH = { x: -174, y: -75, w: 348, d: 150, r: 10 };
const BENCH_H = 10;

const WHEEL = { x: -112, y: -26, r: 38, top: 18.6, front: 180 };

const BOARD = { x: -54, y: -58, w: 152, d: 62 };
const BOARD_TOP = 13.2;
const FRAME = 3;
const CELL_W = (BOARD.w - FRAME * 2 - 3 * 3) / 4;
const CELL_D = (BOARD.d - FRAME * 2 - 3) / 2;
const PIN_OFFSETS = [5.4, 12.9, 20.4, 27.9];

const STAGE = { x: 96, y: 2, w: 70, d: 60 };
const STAGE_TOP = 15;
const STRIP = { x0: 106, x1: 150, y: [16, 44], top: 16.4, studX: [110, 120, 130, 140] };
const CUT_X = (cut) => 105 + 10 * cut;
const BLADE_REST = 27;
const BLADE_DROP = 9.6;
const PORTAL_Y = 30;

const DIAL = { x: -148, y: 44, r: 17, z: 15, top: 20.2 };

const TAPE = { x: -120, y: 24, w: 160, d: 30 };

const LABEL = { x: 8, y: 54, w: 30, d: 11 };

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -16, BENCH_H),
    [WHEEL.x + WHEEL.r, WHEEL.y - WHEEL.r, WHEEL.top + 6],
    [WHEEL.x - WHEEL.r, WHEEL.y + WHEEL.r, WHEEL.top + 6],
    [WHEEL.x, WHEEL.y, WHEEL.top + 6],
    [166, PORTAL_Y, 40],
    [DIAL.x - DIAL.r, DIAL.y + DIAL.r, DIAL.top + 3],
    [TAPE.x + TAPE.w, TAPE.y + TAPE.d, 19],
  ],
  W,
  H,
  { pad: 30, azimuth: 40, elevation: 30 },
);

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const at = (p) => k.iso(p, P);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ─────────────────────────────── static geometry ────────────────────────────── */

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -16, BENCH_H, P)}"/>`];
  for (const [x, y] of byDepth([[-142, -50], [-142, 50], [0, -50], [0, 50], [142, -50], [142, 50]])) {
    out.push(S(k.cylinder(x, y, 7.6, -16, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -14.2, 4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, 0, BENCH_H, P, 8, 1.6), { tone: "mid", className: "mat" }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -160, y: 64, w: 320, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 6, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  // the machine's one engraved label
  out.push(S(k.slabOf(LABEL, 0, 0.9, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.9, P), { tone: "faint" }));
  out.push(
    D(
      [
        [LABEL.x + 2.2, LABEL.y + 2.2],
        [LABEL.x + LABEL.w - 2.2, LABEL.y + 2.2],
        [LABEL.x + 2.2, LABEL.y + LABEL.d - 2.2],
        [LABEL.x + LABEL.w - 2.2, LABEL.y + LABEL.d - 2.2],
      ].map(([x, y]) => at([x, y, 0.9])),
      { size: 0.4 },
    ),
  );
  out.push(
    k.faceTextSvg(
      k.topMatrix([LABEL.x + LABEL.w / 2, LABEL.y + 6.8], 0.9, P, "x"),
      "GA·IRIS",
      { size: 3.8, tone: "mid", anchor: "middle" },
    ),
  );
  return out.join("");
}

function wheel() {
  const out = [];
  const { x, y, r, top } = WHEEL;
  out.push(S(k.cylinder(x, y, 30, BENCH_H, 2.2, P, 64, 0.6), { tone: "mid" }));
  out.push(
    D(
      [
        [-24, -14],
        [-24, 14],
        [24, -14],
        [24, 14],
      ].map(([dx, dy]) => at([x + dx, y + dy, BENCH_H + 2.2])),
      { size: 0.45 },
    ),
  );
  out.push(S(k.cylinder(x, y, r, BENCH_H + 2.2, top - BENCH_H - 2.2, P, 84, 0.9), { tone: "hi", crease: "lo", halo: true }));
  out.push(L(k.knurl(x, y, r, top - 3.2, top - 0.6, 96, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, r - 0.9, top, P, 84), { tone: "lo" }));
  out.push(L(k.ring(x, y, 11.5, top, P, 72), { tone: "faint" }));
  out.push(`<g data-part="spin"></g>`);
  out.push(S(k.cylinder(x, y, 7, top, 2.2, P, 40), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4.6, top + 2.2, 3.2, P, 36), { tone: "mid" }));
  out.push(L(k.knurl(x, y, 4.6, top + 2.2, top + 5.4, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([x, y], [x + 4, y], top + 5.4, P), { tone: "hi" }));
  out.push(`<g data-part="ball">${S(G.sphereOf([x + 37, y, top + 2.2], 2.2, P), { tone: "lit", lit: true })}</g>`);
  return out.join("");
}

function board() {
  const out = [];
  out.push(S(k.slabOf(BOARD, BENCH_H, BOARD_TOP - BENCH_H, P, 6, 1.1), { tone: "mid", halo: true }));
  const rails = [
    { x: BOARD.x, y: BOARD.y, w: BOARD.w, d: FRAME, r: 1 },
    { x: BOARD.x, y: BOARD.y + BOARD.d - FRAME, w: BOARD.w, d: FRAME, r: 1 },
    { x: BOARD.x, y: BOARD.y + FRAME, w: FRAME, d: BOARD.d - FRAME * 2, r: 1 },
    { x: BOARD.x + BOARD.w - FRAME, y: BOARD.y + FRAME, w: FRAME, d: BOARD.d - FRAME * 2, r: 1 },
  ];
  for (const rail of rails) out.push(S(k.slabOf(rail, BOARD_TOP, 1.6, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(BOARD, 6).map(([x, y]) => at([x, y, BOARD_TOP + 1.6])), { size: 0.4 }));

  for (let i = 0; i < 8; i++) {
    const cell = {
      x: BOARD.x + FRAME + (i % 4) * (CELL_W + 3),
      y: BOARD.y + FRAME + (i >> 2) * (CELL_D + 3),
      w: CELL_W,
      d: CELL_D,
      r: 1.6,
    };
    out.push(L(k.planOutline(cell, BOARD_TOP, P, 4), { tone: "faint" }));
    out.push(`<g data-part="cell" data-i="${i}"></g>`);
    out.push(`<g data-part="pins" data-i="${i}"></g>`);
    out.push(`<g data-part="bar" data-i="${i}"></g>`);
  }
  return out.join("");
}

function stage() {
  const out = [];
  out.push(S(k.slabOf(STAGE, BENCH_H, STAGE_TOP - BENCH_H, P, 5, 1.1), { tone: "mid", halo: true }));
  out.push(L(k.planOutline(k.insetPlan(STAGE, 3.5), STAGE_TOP, P), { tone: "faint" }));
  for (const y of STRIP.y) {
    out.push(S(k.slabOf({ x: 104, y: y - 5, w: 54, d: 10, r: 1 }, STAGE_TOP, 1.4, P, 3, 0.4), { tone: "lo" }));
    out.push(L(k.planOutline({ x: 106, y: y - 2.6, w: 44, d: 5.2, r: 0 }, STAGE_TOP + 1.4, P, 2), { tone: "faint" }));
  }
  // the strip groups: B first, A last, so the raised tail of A passes over B
  out.push(`<g data-part="strip" data-i="1"></g>`);
  out.push(`<g data-part="strip" data-i="0"></g>`);

  for (const x of [100, 162]) {
    out.push(S(k.cylinder(x, PORTAL_Y, 2.8, STAGE_TOP, 31 - STAGE_TOP, P, 28), { tone: "mid" }));
    out.push(L(k.sideArc(x, PORTAL_Y, 2.8, 28, P, 16), { tone: "faint" }));
    out.push(S(k.cylinder(x, PORTAL_Y, 4.2, 31, 1.2, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: 97.2, y: PORTAL_Y - 4, w: 68.6, d: 8, r: 1.4 }, 32.2, 2.6, P, 4, 0.5), { tone: "mid" }));
  out.push(D([[103, PORTAL_Y], [159, PORTAL_Y]].map(([x, y]) => at([x, y, 34.8])), { size: 0.4 }));
  for (const x of [115, 125, 135]) {
    out.push(L(k.segment([x, PORTAL_Y + 4, 34.8], [x, PORTAL_Y + 4, 32.6], P), { tone: "mid" }));
  }
  out.push(S(k.cylinder(166, PORTAL_Y, 3.4, 30.4, 4.6, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(166, PORTAL_Y, 3.4, 34.2, 37, 20, P), { tone: "lo" }));
  out.push(`<g data-part="blade"></g>`);
  return out.join("");
}

function dial() {
  const out = [];
  const { x, y, r, z, top } = DIAL;
  out.push(S(k.cylinder(x, y, 9.4, BENCH_H, 1.8, P, 32), { tone: "mid" }));
  out.push(
    D(
      [
        [-5, -5],
        [-5, 5],
        [5, -5],
        [5, 5],
      ].map(([dx, dy]) => at([x + dx, y + dy, BENCH_H + 1.8])),
      { size: 0.4 },
    ),
  );
  out.push(S(k.cylinder(x, y, 4, BENCH_H + 1.8, z - BENCH_H - 1.8, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, r, z, top - z, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, r, top - 3.2, top, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, r, top - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, r - 1.8, top, P, 64), { tone: "lo" }));
  const a0 = 150 * (Math.PI / 180);
  const ticks = k.radialTicks(x, y, r - 2.6, 40, 5, top, [1.1, 2.5], P, a0, 300 * (Math.PI / 180));
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(
    L(
      k.lineOnTop(
        [x + Math.cos(a0) * (r - 4.6), y + Math.sin(a0) * (r - 4.6)],
        [x + Math.cos(a0) * (r - 1.2), y + Math.sin(a0) * (r - 1.2)],
        top,
        P,
      ),
      { tone: "hi" },
    ),
  );
  out.push(L(k.ring(x, y, 1.7, top, P, 16), { tone: "mid" }));
  out.push(`<g data-part="needle"></g>`);
  return out.join("");
}

function recorder() {
  const out = [];
  out.push(S(k.slabOf(TAPE, BENCH_H, 0.8, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(TAPE, BENCH_H + 0.8, P, 4), { tone: "lo" }));
  const paper = k.insetPlan(TAPE, 4);
  out.push(S(k.slabOf(paper, BENCH_H + 0.8, 0.4, P, 4), { tone: "hi", flat: true }));
  out.push(L(k.planOutline(paper, BENCH_H + 1.2, P, 4), { tone: "lo" }));
  const grid = [];
  const tapeX0 = TAPE.x + 12;
  for (let g = 0; g <= 6; g++) {
    grid.push(k.lineOnTop([tapeX0 + g * 22, paper.y], [tapeX0 + g * 22, paper.y + paper.d], BENCH_H + 1.2, P));
  }
  for (let s = 0; s <= 4; s++) {
    const gy = TAPE.y + 26 - (s / 4) * 21;
    grid.push(k.lineOnTop([paper.x, gy], [paper.x + paper.w, gy], BENCH_H + 1.2, P));
  }
  out.push(L(grid.join(""), { tone: "lo" }));
  out.push(`<path data-part="trace" class="iso-line" data-tone="lit" d="" style="stroke-width:1.15"/>`);
  for (const x of [TAPE.x, TAPE.x + TAPE.w - 2.4]) {
    out.push(S(k.slabOf({ x, y: TAPE.y - 2, w: 2.4, d: TAPE.d + 4, r: 0.8 }, BENCH_H, 3.4, P, 3, 0.4), { tone: "mid" }));
  }
  out.push(`<g data-part="beam"></g>`);
  return out.join("");
}

/* ─────────────────────────────── the page ───────────────────────────────────── */

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "遗传算法育种台。左侧是轮盘赌选择转盘，扇区宽度正比于个体适应度，钢球停在哪一扇区就选中哪个个体；中部是种群针板，八个个体各四根染色体针，高针表示选中该特征；右上交叉台把两条父代钢带在交叉点切断并交换尾段；右前表盘读 3-近邻五折交叉验证准确率；前部记录仪在纸带上画出每代历史最优。",
  body: [base(), wheel(), dial(), recorder(), board(), stage()],
});

const live = readFileSync(join(HERE, "live.js"), "utf8")
  .replace("__P__", JSON.stringify(P))
  .replace("__TRACE__", JSON.stringify(TRACE))
  .replace("__KONST__", JSON.stringify({ WHEEL, BOARD, CELL_W, CELL_D, PIN_OFFSETS, BOARD_TOP, STRIP, STAGE, DIAL, TAPE, BENCH_H, CUT_X: [0, 115, 125, 135], BLADE_REST, BLADE_DROP, PORTAL_Y, FRAME }));

const style = `<style>
  .iso-stage .mat{--mat-top:var(--anatomy-shade-2);--mat-side:var(--anatomy-shade-0);--mat-hole:var(--anatomy-face)}
  .iso-stage .mat .iso-top{fill:var(--mat-top)}
  .iso-stage .mat .iso-fill{fill:var(--mat-top)}
  .iso-stage .mat .iso-shade{fill:var(--mat-side)}
  .iso[data-theme="light"] .iso-stage .mat{--mat-top:#dedcd5;--mat-side:#c9c7bf}
  .wheel-dot{fill:var(--anatomy-mid);stroke:none}
  .wheel-dot[data-on]{fill:var(--anatomy-lit)}
  .iso-stage{touch-action:pan-y}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
</style>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "GA · 育种台",
  hint: "点击 / 空格 走一步 · R 重置",
  readout: "第 0 代 · 最优 0.9600",
  keys: [
    { mark: "lit", label: "钢球：轮盘赌这一次抽中的个体" },
    { mark: "raised", label: "染色体针：高针 = 1，选中该特征" },
    { mark: "flat", label: "纸带：每代历史最优适应度" },
  ],
  caption:
    "8 个个体、每人 4 位染色体，对应 Iris 的四个特征。轮盘赌按适应度分配扇区宽度，抽 8 次组成交配池；单点交叉把两条钢带在一点剪断、交换尾段；逐位变异翻转针脚；评价用 3-近邻的分层五折准确率，只有更好的解才会替换历史最优。所有数字都由课件同一份 Iris 数据与同一个算法算出。",
  body: `${style}<div class="iso-stage" tabindex="0" role="group" aria-label="遗传算法育种台：轮盘赌选择、单点交叉、逐位变异、适应度评价。按空格走一步，R 重置。" aria-valuetext="第 0 代，最优 0.9600"><div class="sr" data-announce aria-live="polite"></div>${svg}</div>`,
});

const page = k.pageHtml({
  title: "GA 育种台 · 计算智能",
  theme,
  body,
  script: kitScript() + live,
  width: 860,
});

const name = theme === "light" ? "ga-bench.html" : "ga-bench-dark.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`);
