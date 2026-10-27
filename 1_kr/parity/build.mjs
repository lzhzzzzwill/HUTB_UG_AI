// 十五数码奇偶台 —— an Anatomy figure.
//
// A 4x4 sliding-tile bench with a built-in parity instrument: an inversion dial
// (I, 0-105), a counter window for the blank row (R, 1-4) and a two-position
// detent knob that reads (I + R) mod 2. Legal slides leave the knob where it
// is; one transposition of 14 and 15 throws it across.
//
// build: node build.mjs  ->  shiwu-shuma.html (light, with a dark toggle)

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import { kitScript } from "./kit/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 660;
const HEIGHT = 452;

/* ---------------------------------------------------------------- world ---- */

const PLATE = { x: -164, y: -100, w: 300, d: 184, r: 10 };
const PLATE_H = 14;
const FOOT_H = 5;

const CELL = 30;
const N = 4;
const TRAY = { x: -140, y: -62 };            // interior origin
const TRAY_SPAN = CELL * N;                  // 120
const FRAME_W = 14;
const FRAME_TOP = 10;                        // outer moulding
const LIP_TOP = 15;                          // inner lip
const FLOOR_Z = 8;
const TILE = 27.2;
const TILE_H = 10;
const TILE_TOP = FLOOR_Z + TILE_H;           // 16

const FRAME = {
  x: TRAY.x - FRAME_W,
  y: TRAY.y - FRAME_W,
  w: TRAY_SPAN + FRAME_W * 2,
  d: TRAY_SPAN + FRAME_W * 2,
  r: 4,
};

const CONSOLE = { x: 2, y: -88, w: 120, d: 124, r: 7 };
const CONSOLE_TOP = 14;

const DIAL = [82, -60];
const DIAL_R = 22;
const DIAL_TOP = 38;
const MAX_I = 105;

const WINDOW = { x: 10, y: -82, w: 40, d: 26, r: 1.5 };
const KNOB = [44, -6];
const KNOB_R = 10;
const KNOB_TOP = 22;
const SWITCH = 0.96;                         // ±55 degrees

/* ----------------------------------------------------------- projection ---- */

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(CONSOLE, 0, CONSOLE_TOP),
    [CONSOLE.x, CONSOLE.y, CONSOLE_TOP],
    [DIAL[0] - DIAL_R, DIAL[1] - DIAL_R, DIAL_TOP + 1],
    [DIAL[0] + DIAL_R, DIAL[1] + DIAL_R, DIAL_TOP + 1],
    [DIAL[0] + DIAL_R + 8, DIAL[1] - DIAL_R, DIAL_TOP + 1],
    [FRAME.x, FRAME.y, LIP_TOP],
    [FRAME.x + FRAME.w, FRAME.y + FRAME.d, LIP_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 44, elevation: 30 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) =>
  [...points].sort(
    (a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P),
  );

const cellOf = (slot) => [
  TRAY.x + (slot % N) * CELL + CELL / 2,
  TRAY.y + Math.floor(slot / N) * CELL + CELL / 2,
];

// Text lying flat on a top face, its baseline centred on `point`.
const topText = (point, z, text, size, tone = "mid") =>
  k.faceTextSvg(k.topMatrix([point[0], point[1] + size * 0.34], z, P, "x"), text, {
    size,
    tone,
    anchor: "middle",
  });

// Text on a top face, its baseline turned by `angle` inside the face.
const topTextRot = (point, z, angle, text, size, tone = "mid") => {
  const o = at([point[0], point[1], z]);
  const ux = at([point[0] + 1, point[1], z]);
  const vy = at([point[0], point[1] + 1, z]);
  const u = [ux[0] - o[0], ux[1] - o[1]];
  const v = [vy[0] - o[0], vy[1] - o[1]];
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const U = [u[0] * c + v[0] * sn, u[1] * c + v[1] * sn];
  const V = [-u[0] * sn + v[0] * c, -u[1] * sn + v[1] * c];
  const ex = o[0] + V[0] * size * 0.34;
  const ey = o[1] + V[1] * size * 0.34;
  const matrix = `matrix(${U[0].toFixed(3)} ${U[1].toFixed(3)} ${V[0].toFixed(3)} ${V[1].toFixed(3)} ${ex.toFixed(2)} ${ey.toFixed(2)})`;
  return k.faceTextSvg(matrix, text, { size, tone, anchor: "middle" });
};

const screw = (x, y, z, r = 2.1) => [
  L(k.ring(x, y, r, z, P, 16), { tone: "lo" }),
  D([at([x, y, z])], { size: 0.5 }),
];

/* ----------------------------------------------------------------- base ---- */

function basePlate() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(PLATE, 30))) {
    out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(
      S(k.cylinder(x, y, 5.6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }),
    );
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 7), 0, P, 10), { tone: "lo" }));

  for (const [x, y] of k.corners(PLATE, 6)) out.push(...screw(x, y, 0, 2.2));

  // A rule along the near edge: one tick per 4 units, a major every 20.
  const strip = { x: -150, y: 74, w: 280, d: 8, r: 1.5 };
  out.push(S(k.slabOf(strip, 0, 0.7, P, 4), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 1.1, 0.7, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(
    D(
      [
        at([strip.x + 1.5, strip.y + 4, 0.7]),
        at([strip.x + strip.w - 1.5, strip.y + 4, 0.7]),
      ],
      { size: 0.45 },
    ),
  );
  return out.join("");
}

/* ----------------------------------------------------------------- tray ---- */

const RING = {
  back: { x: FRAME.x, y: FRAME.y, w: FRAME.w, d: FRAME_W, r: 2.5 },
  front: { x: FRAME.x, y: FRAME.y + FRAME.d - FRAME_W, w: FRAME.w, d: FRAME_W, r: 2.5 },
  left: { x: FRAME.x, y: FRAME.y + FRAME_W, w: FRAME_W, d: FRAME.d - FRAME_W * 2, r: 2.5 },
  right: { x: FRAME.x + FRAME.w - FRAME_W, y: FRAME.y + FRAME_W, w: FRAME_W, d: FRAME.d - FRAME_W * 2, r: 2.5 },
};

const LIP = {
  back: { x: TRAY.x - 5, y: TRAY.y - 5, w: TRAY_SPAN + 10, d: 5, r: 1.5 },
  front: { x: TRAY.x - 5, y: TRAY.y + TRAY_SPAN, w: TRAY_SPAN + 10, d: 5, r: 1.5 },
  left: { x: TRAY.x - 5, y: TRAY.y, w: 5, d: TRAY_SPAN, r: 1.5 },
  right: { x: TRAY.x + TRAY_SPAN, y: TRAY.y, w: 5, d: TRAY_SPAN, r: 1.5 },
};

function rail(plan, z, h, bevel = 0.7) {
  return S(k.slabOf(plan, z, h, P, 5, bevel), { tone: "mid" });
}

function trayFar() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FRAME, 0, 0.1, P)}"/>`];
  out.push(rail(RING.back, 0, FRAME_TOP));
  out.push(rail(RING.left, 0, FRAME_TOP));
  out.push(rail(LIP.back, FRAME_TOP, LIP_TOP - FRAME_TOP, 0.4));
  out.push(rail(LIP.left, FRAME_TOP, LIP_TOP - FRAME_TOP, 0.4));
  out.push(bracket(FRAME.x + 1, FRAME.y + 1));
  out.push(bracket(FRAME.x + FRAME.w - 13, FRAME.y + 1));

  const floor = { x: TRAY.x, y: TRAY.y, w: TRAY_SPAN, d: TRAY_SPAN, r: 1 };
  out.push(S(k.slabOf(floor, 0, FLOOR_Z, P, 4, 0.5), { tone: "lo", crease: "faint", className: "tray-floor" }));
  const grid = [];
  for (let i = 1; i < N; i++) {
    grid.push(k.lineOnTop([TRAY.x + i * CELL, TRAY.y], [TRAY.x + i * CELL, TRAY.y + TRAY_SPAN], FLOOR_Z, P));
    grid.push(k.lineOnTop([TRAY.x, TRAY.y + i * CELL], [TRAY.x + TRAY_SPAN, TRAY.y + i * CELL], FLOOR_Z, P));
  }
  out.push(L(grid.join(""), { tone: "faint" }));
  return out.join("");
}

function trayNear() {
  const out = [];
  out.push(rail(RING.right, 0, FRAME_TOP));
  out.push(rail(LIP.right, FRAME_TOP, LIP_TOP - FRAME_TOP, 0.4));
  out.push(rail(RING.front, 0, FRAME_TOP));
  out.push(rail(LIP.front, FRAME_TOP, LIP_TOP - FRAME_TOP, 0.4));

  const screws = [
    [FRAME.x + 22, FRAME.y + 5.5],
    [FRAME.x + FRAME.w - 22, FRAME.y + 5.5],
    [FRAME.x + 22, FRAME.y + FRAME.d - 5.5],
    [FRAME.x + FRAME.w - 22, FRAME.y + FRAME.d - 5.5],
    [FRAME.x + 5.5, FRAME.y + 30],
    [FRAME.x + 5.5, FRAME.y + FRAME.d - 30],
    [FRAME.x + FRAME.w - 5.5, FRAME.y + 30],
    [FRAME.x + FRAME.w - 5.5, FRAME.y + FRAME.d - 30],
  ];
  for (const [x, y] of screws) out.push(...screw(x, y, FRAME_TOP, 1.8));

  out.push(bracket(FRAME.x + 1, FRAME.y + FRAME.d - 13));
  out.push(bracket(FRAME.x + FRAME.w - 13, FRAME.y + FRAME.d - 13));

  // A badge plate on the near moulding.
  const badge = { x: -88, y: FRAME.y + FRAME.d - 10.5, w: 34, d: 7.5, r: 1.4 };
  out.push(S(k.slabOf(badge, FRAME_TOP, 0.8, P, 4), { tone: "mid", crease: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(badge, 1.6), FRAME_TOP + 0.8, P, 4), { tone: "faint" }));
  out.push(...screw(badge.x + 5, badge.y + badge.d / 2, FRAME_TOP + 0.8, 1.2));
  out.push(...screw(badge.x + badge.w - 5, badge.y + badge.d / 2, FRAME_TOP + 0.8, 1.2));
  return out.join("");
}

function bracket(x, y) {
  const plan = { x, y, w: 12, d: 12, r: 2 };
  return [
    S(k.slabOf(plan, FRAME_TOP, 2.4, P, 3, 0.4), { tone: "mid" }),
    ...screw(x + 6, y + 6, FRAME_TOP + 2.4, 1.6),
  ].join("");
}

function tile(n, slot) {
  const [x, y] = cellOf(slot);
  const plan = { x: x - TILE / 2, y: y - TILE / 2, w: TILE, d: TILE, r: 1.6 };
  const out = [];
  out.push(S(k.slabOf(plan, FLOOR_Z, TILE_H, P, 4, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.8), TILE_TOP, P, 3), { tone: "faint" }));
  out.push(topText([x, y], TILE_TOP, String(n), 8, "hi"));
  return `<g data-tile="${n}" transform="${k.translateAlong(P, [0, 0, 0])}">${out.join("")}</g>`;
}

/* ------------------------------------------------------------- console ----- */

const facePath = (y, x0, z0, x1, z1) =>
  "M" +
  [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ]
    .map(([x, z]) => at([x, y, z]).map((v) => v.toFixed(1)).join(" "))
    .join(" L") +
  "Z";

function consoleBench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CONSOLE, 0, 0.1, P)}"/>`];
  const lid = k.insetPlan(CONSOLE, 5);
  out.push(S(k.slabOf(CONSOLE, 0, 10, P, 10, 1), { tone: "mid" }));
  out.push(S(k.slabOf(lid, 10, CONSOLE_TOP - 10, P, 8, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(lid, 3), CONSOLE_TOP, P, 8), { tone: "faint" }));
  for (const [x, y] of [
    [12, 33.4],
    [112, 33.4],
    [12, -83.4],
    [112, -83.4],
  ])
    out.push(...screw(x, y, 10, 1.7));

  out.push(topText([88, 24], CONSOLE_TOP, "I + R  mod 2", 3.4, "faint"));

  // Louvres on the near face, closed slots so no line floats.
  const vents = [];
  for (let i = 0; i < 4; i++) {
    const z = 2.4 + i * 2.1;
    vents.push(L(facePath(CONSOLE.y + CONSOLE.d, 98, z, 116, z + 1.2), { tone: "faint" }));
  }
  out.push(vents.join(""));
  return out.join("");
}

function needlePath(value) {
  const angle = (value / MAX_I) * Math.PI * 2;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return k.lineOnTop(
    [DIAL[0] - s * 3.4, DIAL[1] + c * 3.4],
    [DIAL[0] + s * (DIAL_R - 3.6), DIAL[1] - c * (DIAL_R - 3.6)],
    DIAL_TOP + 0.3,
    P,
  );
}

function dial() {
  const out = [];
  const [cx, cy] = DIAL;
  out.push(S(k.cylinder(cx, cy, 11, CONSOLE_TOP, 2.6, P, 32), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 6.8, CONSOLE_TOP + 2.2, 10, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(cx, cy, 6.8, CONSOLE_TOP + 8.4, P, 20), { tone: "faint" }));
  out.push(S(k.cylinder(cx, cy, 9, CONSOLE_TOP + 12.2, 2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, DIAL_R, DIAL_TOP - 10, 10, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(cx, cy, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(cx, cy, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));

  const ticks = k.radialTicks(cx, cy, DIAL_R - 3.2, 106, 10, DIAL_TOP, [1.2, 2.7], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  for (const value of [0, 30, 60, 90]) {
    const angle = (value / MAX_I) * Math.PI * 2;
    const radius = DIAL_R - 8.5;
    out.push(topTextRot([cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius], DIAL_TOP, angle, String(value), 4.4, "mid"));
  }

  out.push(S(k.slabOf({ x: cx + DIAL_R - 1, y: cy - 2.6, w: 5, d: 5.2, r: 1.2 }, DIAL_TOP - 9.6, 5, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx + DIAL_R + 3.4, y: cy - 3.4, w: 2.6, d: 6.8, r: 1.2 }, DIAL_TOP - 10.4, 6.6, P, 3), { tone: "mid" }));

  out.push(L(k.ring(cx, cy, 1.8, DIAL_TOP + 0.2, P, 18), { tone: "mid" }));
  out.push(
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needlePath(0)}" style="stroke-width:1.1"/>`,
  );
  return out.join("");
}

function rowWindow() {
  const out = [];
  const bezel = 4;
  const z = CONSOLE_TOP;
  const parts = [
    { x: WINDOW.x, y: WINDOW.y, w: WINDOW.w, d: bezel, r: 1 },
    { x: WINDOW.x, y: WINDOW.y + WINDOW.d - bezel, w: WINDOW.w, d: bezel, r: 1 },
    { x: WINDOW.x, y: WINDOW.y + bezel, w: bezel, d: WINDOW.d - bezel * 2, r: 1 },
    { x: WINDOW.x + WINDOW.w - bezel, y: WINDOW.y + bezel, w: bezel, d: WINDOW.d - bezel * 2, r: 1 },
  ];
  for (const plan of parts) out.push(S(k.slabOf(plan, z, 4.4, P, 3, 0.4), { tone: "mid" }));

  const panel = {
    x: WINDOW.x + bezel,
    y: WINDOW.y + bezel,
    w: WINDOW.w - bezel * 2,
    d: WINDOW.d - bezel * 2,
    r: 1,
  };
  out.push(S(k.slabOf(panel, z, 0.9, P, 3), { tone: "lo", crease: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(panel, 1.4), z + 0.9, P, 3), { tone: "faint" }));
  out.push(topText([panel.x + panel.w / 2, panel.y + panel.d + 7], z, "R", 5.5, "mid"));
  out.push(
    topTextRot([panel.x + panel.w / 2, panel.y + panel.d / 2], z + 0.9, 0, "1", 13, "hi")
      .replace("<text ", '<text data-part="rvalue" ')
      .replace('class="iso-face-text"', 'class="iso-face-text rvalue"'),
  );
  return out.join("");
}

function switchPath(t) {
  const angle = Math.PI + (2 * t - 1) * SWITCH;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return k.lineOnTop(
    [KNOB[0] + s * 2.6, KNOB[1] - c * 2.6],
    [KNOB[0] + s * 16.4, KNOB[1] - c * 16.4],
    KNOB_TOP + 0.3,
    P,
  );
}

function parityKnob() {
  const out = [];
  const [cx, cy] = KNOB;
  out.push(S(k.cylinder(cx, cy, 15, CONSOLE_TOP, 2, P, 44), { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 15, CONSOLE_TOP + 2, P, 44), { tone: "faint" }));
  out.push(S(k.cylinder(cx, cy, KNOB_R, CONSOLE_TOP + 2, KNOB_TOP - CONSOLE_TOP - 2, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, KNOB_R, CONSOLE_TOP + 5, KNOB_TOP, 36, P, 0.4), { tone: "lo" }));
  out.push(L(k.sideArc(cx, cy, KNOB_R, CONSOLE_TOP + 5, P, 24), { tone: "faint" }));
  out.push(L(k.ring(cx, cy, 2.2, KNOB_TOP, P, 18), { tone: "mid" }));

  // Two detents: the pointer sits on one or the other.
  for (const side of [-1, 1]) {
    const angle = Math.PI + side * SWITCH;
    out.push(D([at([cx + Math.sin(angle) * 17.6, cy - Math.cos(angle) * 17.6, CONSOLE_TOP + 0.2])], { size: 0.7, tone: "mid" }));
  }

  out.push(
    `<path data-part="switch" class="iso-line" data-tone="hi" data-free="both" d="${switchPath(1)}" style="stroke-width:1.1"/>`,
  );
  return out.join("");
}

function namePlate() {
  const out = [];
  const y = CONSOLE.y + CONSOLE.d;
  const x0 = 6, x1 = 84, z0 = 2, z1 = 11.6;
  out.push(L(facePath(y, x0, z0, x1, z1), { tone: "lo" }));
  out.push(L(facePath(y, x0 + 1.4, z0 + 1.2, x1 - 1.4, z1 - 1.2), { tone: "faint" }));
  out.push(L(facePath(y, x0 + 4, z0 + 3.6, x0 + 9, z0 + 7.8), { tone: "lo" }));
  const lines = [46, 58];
  lines.forEach((length, i) => {
    out.push(L(k.segment([x0 + 12, y, z1 - 3.4 - i * 2.1], [x0 + 12 + length, y, z1 - 3.4 - i * 2.1], P), { tone: "lo", free: true }));
  });
  out.push(D([at([x0 + 1.8, y, z0 + 1.6]), at([x1 - 1.8, y, z0 + 1.6])], { size: 0.5 }));
  return out.join("");
}

/* ------------------------------------------------------------- assemble ---- */

const tiles = [];
for (let slot = 0; slot < 15; slot++) tiles.push(tile(slot + 1, slot));

const body = [
  basePlate(),
  consoleBench(),
  trayFar(),
  ...tiles,
  trayNear(),
  dial(),
  rowWindow(),
  parityKnob(),
  namePlate(),
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "十五数码奇偶台：一块 4×4 滑块盘，右侧是一台读数仪。逆序数 I 由表盘指针读出（0 到 105），空格所在行 R 由计数窗读出，两数之和的奇偶性由前方的双位旋钮读出。合法滑动不改变旋钮的位置；把 14 和 15 对调一次，旋钮就转到另一边。",
  body,
});

/* ------------------------------------------------------------------ page --- */

const live = `
const P = ${JSON.stringify(P)};
const HOME = ${JSON.stringify(
  Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i + 1, cellOf(i)])),
)};
const CELL = ${CELL}, X0 = ${TRAY.x}, Y0 = ${TRAY.y}, MAX_I = ${MAX_I};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_TOP = ${KNOB_TOP}, SWITCH = ${SWITCH};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const needleEl = svg.querySelector('[data-part="needle"]');
const switchEl = svg.querySelector('[data-part="switch"]');
const rValueEl = svg.querySelector('[data-part="rvalue"]');
const panelI = document.querySelector("[data-i]");
const panelR = document.querySelector("[data-r]");
const panelP = document.querySelector("[data-p]");
const ruleEl = document.querySelector("[data-rule]");
const verdictEl = document.querySelector("[data-verdict]");
const tourBtn = document.querySelector('[data-act="tour"]');
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

const el = {};
svg.querySelectorAll("[data-tile]").forEach((node) => { el[Number(node.dataset.tile)] = node; });

const S = {};
for (let n = 1; n <= 15; n++) {
  const home = HOME[n];
  S[n] = { x: home[0], y: home[1], z: 0, tx: home[0], ty: home[1], tz: 0 };
}
const SOLVED = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
let slots = SOLVED.slice();
let needleI = 0, needleTarget = 0;
let switchT = 1, switchTarget = 1;
let raf = 0, last = 0, visible = true;
let token = 0, touring = false;
const tourTimers = [];

const cell = (slot) => [X0 + (slot % 4) * CELL + CELL / 2, Y0 + Math.floor(slot / 4) * CELL + CELL / 2];
const adjacent = (a, b) => {
  const dr = Math.abs(Math.floor(a / 4) - Math.floor(b / 4));
  const dc = Math.abs((a % 4) - (b % 4));
  return dr + dc === 1;
};

function inversions() {
  const nums = slots.filter((v) => v !== 0);
  let count = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] > nums[j]) count++;
  return count;
}

function read() {
  const inv = inversions();
  const row = 4 - Math.floor(slots.indexOf(0) / 4);
  const parity = (inv + row) % 2;
  readout.textContent = "I " + inv + "  ·  R " + row + "  ·  类 " + parity;
  panelI.textContent = String(inv);
  panelR.textContent = String(row);
  panelP.textContent = String(parity);
  ruleEl.textContent = "(" + inv + " + " + row + ") mod 2 = " + parity;
  verdictEl.textContent = parity === 1 ? "有解 · 与目标同奇偶类" : "无解 · 与目标异奇偶类";
  verdictEl.dataset.state = parity === 1 ? "ok" : "no";
  rValueEl.textContent = String(row);
  needleTarget = inv;
  switchTarget = parity;
  kick();
}

function placeAll() {
  for (let n = 1; n <= 15; n++) {
    const [x, y] = cell(slots.indexOf(n));
    S[n].tx = x;
    S[n].ty = y;
  }
}

function kick() {
  if (!raf && visible) {
    last = 0;
    raf = requestAnimationFrame(tick);
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const rest = draw(dt);
  raf = rest ? 0 : requestAnimationFrame(tick);
}

function draw(dt) {
  let rest = true;
  const ease = 1 - Math.exp(-dt / 0.13);
  const lift = 1 - Math.exp(-dt / 0.1);
  for (let n = 1; n <= 15; n++) {
    const t = S[n];
    if (calm) {
      t.x = t.tx; t.y = t.ty; t.z = t.tz;
    } else {
      t.x += (t.tx - t.x) * ease;
      t.y += (t.ty - t.y) * ease;
      t.z += (t.tz - t.z) * lift;
      if (Math.abs(t.tx - t.x) < 0.02) t.x = t.tx;
      if (Math.abs(t.ty - t.y) < 0.02) t.y = t.ty;
      if (Math.abs(t.tz - t.z) < 0.02) t.z = t.tz;
    }
    if (t.x !== t.tx || t.y !== t.ty || t.z !== t.tz) rest = false;
    el[n].setAttribute("transform", translateAlong(P, [t.x - HOME[n][0], t.y - HOME[n][1], t.z]));
  }

  if (calm) { needleI = needleTarget; switchT = switchTarget; }
  else {
    needleI += (needleTarget - needleI) * (1 - Math.exp(-dt / 0.17));
    switchT += (switchTarget - switchT) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(needleTarget - needleI) < 0.02) needleI = needleTarget;
    if (Math.abs(switchTarget - switchT) < 0.002) switchT = switchTarget;
  }
  if (needleI !== needleTarget || switchT !== switchTarget) rest = false;

  needleEl.setAttribute("d", needlePath(needleI));
  switchEl.setAttribute("d", switchPath(switchT));
  return rest;
}

function needlePath(value) {
  const angle = (value / MAX_I) * Math.PI * 2;
  const s = Math.sin(angle), c = Math.cos(angle);
  return lineOnTop(
    [DIAL[0] - s * 3.4, DIAL[1] + c * 3.4],
    [DIAL[0] + s * (DIAL_R - 3.6), DIAL[1] - c * (DIAL_R - 3.6)],
    DIAL_TOP + 0.3,
    P,
  );
}

function switchPath(t) {
  const angle = Math.PI + (2 * t - 1) * SWITCH;
  const s = Math.sin(angle), c = Math.cos(angle);
  return lineOnTop(
    [KNOB[0] + s * 2.6, KNOB[1] - c * 2.6],
    [KNOB[0] + s * 16.4, KNOB[1] - c * 16.4],
    KNOB_TOP + 0.3,
    P,
  );
}

let idleTimer = 0;
function scheduleIdle(ms) {
  clearTimeout(idleTimer);
  if (calm) return;
  idleTimer = setTimeout(() => {
    if (!touring) startTour();
  }, ms === undefined ? 9000 : ms);
}

function stopTour() {
  if (!touring) return;
  touring = false;
  tourTimers.forEach(clearTimeout);
  tourTimers.length = 0;
  tourBtn.textContent = "自动演示";
}

function tourOnce(ms, fn) {
  const id = setTimeout(() => {
    const at = tourTimers.indexOf(id);
    if (at >= 0) tourTimers.splice(at, 1);
    if (touring) fn();
  }, ms);
  tourTimers.push(id);
}

function move(slot) {
  const blank = slots.indexOf(0);
  if (slot < 0 || !adjacent(slot, blank)) {
    if (slot >= 0 && slots[slot]) {
      const n = slots[slot];
      S[n].tz = 3.2;
      setTimeout(() => { S[n].tz = 0; kick(); }, 150);
      kick();
    }
    return false;
  }
  const n = slots[slot];
  slots[slot] = 0;
  slots[blank] = n;
  const [x, y] = cell(blank);
  S[n].tx = x;
  S[n].ty = y;
  read();
  return true;
}

function reset() {
  token++;
  slots = SOLVED.slice();
  for (let n = 1; n <= 15; n++) S[n].tz = 0;
  placeAll();
  read();
}

function swap() {
  const mine = ++token;
  const a = S[14], b = S[15];
  const sa = slots.indexOf(14), sb = slots.indexOf(15);
  if (sa < 0 || sb < 0 || sa === sb) return;
  a.tz = 9;
  b.tz = 22;
  kick();
  setTimeout(() => {
    if (mine !== token) return;
    slots[sa] = 15;
    slots[sb] = 14;
    const pa = cell(sb), pb = cell(sa);
    a.tx = pa[0]; a.ty = pa[1];
    b.tx = pb[0]; b.ty = pb[1];
    read();
  }, 320);
  setTimeout(() => {
    if (mine !== token) return;
    a.tz = 0;
    b.tz = 0;
    kick();
  }, 980);
}

function scramble() {
  const mine = ++token;
  for (let n = 1; n <= 15; n++) S[n].tz = 0;
  let step = 0;
  const run = () => {
    if (mine !== token) return;
    if (step++ >= 14) { kick(); return; }
    const blank = slots.indexOf(0);
    const options = [];
    if (blank >= 4) options.push(blank - 4);
    if (blank < 12) options.push(blank + 4);
    if (blank % 4 > 0) options.push(blank - 1);
    if (blank % 4 < 3) options.push(blank + 1);
    move(options[Math.floor(Math.random() * options.length)]);
    setTimeout(run, 230);
  };
  run();
}

function startTour() {
  if (touring) return;
  clearTimeout(idleTimer);
  touring = true;
  tourBtn.textContent = "停止演示";
  reset();
  tourOnce(1200, () => {
    let count = 0;
    const step = () => {
      if (!touring) return;
      if (count++ >= 11) {
        tourOnce(700, () => {
          swap();
          tourOnce(4400, () => {
            reset();
            tourOnce(3000, () => { touring = false; startTour(); });
          });
        });
        return;
      }
      const blank = slots.indexOf(0);
      const options = [];
      if (blank >= 4) options.push(blank - 4);
      if (blank < 12) options.push(blank + 4);
      if (blank % 4 > 0) options.push(blank - 1);
      if (blank % 4 < 3) options.push(blank + 1);
      move(options[Math.floor(Math.random() * options.length)]);
      tourOnce(640, step);
    };
    step();
  });
}

/* ---- pointer, keys, buttons ---- */

svg.addEventListener("pointerdown", (event) => {
  stopTour();
  scheduleIdle(12000);
  const group = event.target.closest("[data-tile]");
  if (!group) return;
  const n = Number(group.dataset.tile);
  move(slots.indexOf(n));
});

stage.addEventListener("keydown", (event) => {
  const blank = slots.indexOf(0);
  const row = Math.floor(blank / 4), col = blank % 4;
  let slot = -1;
  if (event.key === "ArrowLeft") slot = col < 3 ? blank + 1 : -1;
  if (event.key === "ArrowRight") slot = col > 0 ? blank - 1 : -1;
  if (event.key === "ArrowUp") slot = row < 3 ? blank + 4 : -1;
  if (event.key === "ArrowDown") slot = row > 0 ? blank - 4 : -1;
  if (slot < 0) return;
  event.preventDefault();
  stopTour();
  scheduleIdle(12000);
  move(slot);
});

const act = (name, run) =>
  document.querySelector('[data-act="' + name + '"]').addEventListener("click", () => {
    stopTour();
    scheduleIdle(12000);
    run();
  });
act("scramble", scramble);
act("swap", swap);
act("reset", reset);
tourBtn.addEventListener("click", () => {
  if (touring) { stopTour(); scheduleIdle(20000); }
  else { clearTimeout(idleTimer); startTour(); }
});

const themeBtn = document.querySelector("[data-act=theme]");
if (themeBtn) themeBtn.addEventListener("click", () => {
  const next = document.body.dataset.theme === "light" ? "dark" : "light";
  document.body.dataset.theme = next;
  themeBtn.textContent = next === "light" ? "深色" : "浅色";
});

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) kick();
}, { rootMargin: "120px 0px" }).observe(stage);

if (!calm) {
  for (let n = 1; n <= 15; n++) S[n].z = 7 + (n % 4) * 1.6;
  kick();
}

placeAll();
read();
scheduleIdle(9000);
`;

const pageCss = `
*{box-sizing:border-box}
.iso{--tray-baize:#dedbd3}
.iso[data-theme="dark"]{--tray-baize:#0d0d0c}
.tray-floor .iso-fill,.tray-floor .iso-top{fill:var(--tray-baize)}
.rvalue,.digit{font-family:ui-sans-serif,system-ui,"PingFang SC",sans-serif;font-weight:600;letter-spacing:0}
.tray-floor .iso-shade{fill:var(--tray-baize)}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:15px/1.75 ui-sans-serif,system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.kr{width:min(1210px,100% - 40px);margin:34px auto 70px}
.kr-head{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;margin-bottom:22px}
.kr-eyebrow{margin:0;font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.16em;color:var(--anatomy-muted);text-transform:uppercase}
h1{margin:10px 0 8px;font-size:30px;line-height:1.24;font-weight:600;color:var(--anatomy-strong);letter-spacing:.01em}
.kr-sub{margin:0;max-width:660px;font-size:14px;color:var(--anatomy-text)}
.kr-meta{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.kr-pill{font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.1em;color:var(--anatomy-muted);box-shadow:inset 0 0 0 1px var(--anatomy-mid);padding:6px 10px;white-space:nowrap}
.kr-btn{font:inherit;font-size:13px;line-height:1.2;padding:9px 12px;background:transparent;color:var(--anatomy-strong);border:0;border-radius:0;box-shadow:inset 0 0 0 1px var(--anatomy-mid);cursor:pointer;transition:box-shadow .16s ease,background .16s ease,color .16s ease}
.kr-btn:hover{box-shadow:inset 0 0 0 1px var(--anatomy-strong)}
.kr-btn:focus-visible{outline:2px solid var(--anatomy-strong);outline-offset:3px}
.kr-grid{display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:22px;align-items:start}
.kr-figure{min-width:0}
.kr-figure .iso-plate{padding:46px 18px 44px}
.kr-figure .iso-stage{position:relative;outline:none}
.kr-figure .iso-stage:focus-visible{outline:2px solid var(--anatomy-strong);outline-offset:8px}
.kr-panel{display:grid;gap:14px;position:sticky;top:20px}
.kr-card{background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);padding:16px 17px}
.kr-label{margin:0 0 12px;font-family:var(--anatomy-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-muted)}
.kr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-bottom:12px}
.kr-stat{padding:6px 8px 8px;box-shadow:inset 0 0 0 1px var(--anatomy-faint)}
.kr-num{display:block;font-family:var(--anatomy-mono);font-size:28px;line-height:1.1;color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.kr-cap{display:block;margin-top:4px;font-size:11px;color:var(--anatomy-muted)}
.kr-rule{font-family:var(--anatomy-mono);font-size:12.5px;color:var(--anatomy-text);padding:7px 0 9px;border-top:1px solid var(--anatomy-faint)}
.kr-verdict{font-size:12.5px;padding:9px 10px;margin-bottom:14px;box-shadow:inset 0 0 0 1px var(--anatomy-mid)}
.kr-verdict[data-state="ok"]{color:var(--anatomy-green)}
.kr-verdict[data-state="no"]{color:var(--anatomy-red)}
.kr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kr-actions .kr-btn:last-child{grid-column:1 / -1}
.kr-why p{margin:0;font-size:13.5px;color:var(--anatomy-text)}
.kr-why b{color:var(--anatomy-strong);font-weight:600}
.kr-steps{counter-reset:step;margin:0;padding:0;list-style:none;display:grid;gap:9px}
.kr-steps li{counter-increment:step;position:relative;padding-left:26px;font-size:13px;color:var(--anatomy-text)}
.kr-steps li::before{content:counter(step);position:absolute;left:0;top:1px;width:17px;height:17px;font-family:var(--anatomy-mono);font-size:10px;line-height:17px;text-align:center;color:var(--anatomy-muted);box-shadow:inset 0 0 0 1px var(--anatomy-mid)}
.kr-foot{margin-top:26px;padding-top:14px;border-top:1px solid var(--anatomy-faint);font-size:12px;color:var(--anatomy-muted);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
@media (max-width:1080px){.kr-grid{grid-template-columns:1fr}.kr-panel{position:static;grid-template-columns:1fr 1fr}.kr-why,.kr-steps{grid-column:span 1}}
@media (max-width:720px){.kr{width:calc(100% - 24px);margin:22px auto 48px}.kr-head{flex-direction:column;align-items:flex-start}h1{font-size:23px}.kr-panel{grid-template-columns:1fr}.kr-meta{flex-direction:row;align-items:center}.kr-figure .iso-plate{padding:38px 6px 40px}.kr-stats{gap:6px}.kr-num{font-size:24px}}
`;

const bodyHtml = `
<main class="kr">
  <header class="kr-head">
    <div>
      <p class="kr-eyebrow">人工智能导论 · 第 1 章 知识表示与推理 · 1_kr</p>
      <h1>十五数码：把奇偶不变量做成一台仪器</h1>
      <p class="kr-sub">左边是棋盘，右边是读数仪。合法滑动一千次，奇偶旋钮一动不动；把 14 和 15 对调一次，它就转到另一边——这就是可解性的全部秘密。</p>
    </div>
    <div class="kr-meta">
      <span class="kr-pill">交互式等距三维演示 · 离线可用</span>
      <button class="kr-btn" data-act="theme" aria-label="切换明暗主题">深色</button>
    </div>
  </header>

  <div class="kr-grid">
    <section class="kr-figure">
      ${k.plateHtml({
        fig: "图 1",
        title: "十五数码奇偶台",
        hint: "点击空格旁的滑块 · 方向键也能滑",
        readout: "I 0  ·  R 1  ·  类 1",
        keys: [
          { mark: "raised", label: "15 块滑块：只有紧挨空格的能滑动" },
          { mark: "lit", label: "指针：逆序数 I，0–105" },
          { mark: "edge", label: "计数窗 R 与双位旋钮 (I + R) mod 2" },
        ],
        caption:
          "一台 4×4 十五数码演示台。左盘是棋盘，右台是读数仪：指针读逆序数 I，计数窗读空格从底部数的行号 R，双位旋钮读两者之和的奇偶类。滑动只改变 I 与 R 的分配，不改变它们的和；把两块滑块对调，和就翻转。",
        body: `<div class="iso-stage" tabindex="0" role="application" aria-label="十五数码奇偶台：点击空格旁的滑块，或用方向键滑动；右侧面板可打乱、交换 14 与 15、复位"><div class="iso-stage-inner">${svg}</div></div>`,
      })}
    </section>

    <aside class="kr-panel">
      <div class="kr-card">
        <p class="kr-label">当前读数 / live</p>
        <div class="kr-stats">
          <div class="kr-stat"><span class="kr-num" data-i>0</span><span class="kr-cap">逆序数 I</span></div>
          <div class="kr-stat"><span class="kr-num" data-r>1</span><span class="kr-cap">空行 R</span></div>
          <div class="kr-stat"><span class="kr-num" data-p>1</span><span class="kr-cap">奇偶类</span></div>
        </div>
        <div class="kr-rule" data-rule>(0 + 1) mod 2 = 1</div>
        <div class="kr-verdict" data-verdict data-state="ok">有解 · 与目标同奇偶类</div>
        <div class="kr-actions">
          <button class="kr-btn" data-act="scramble">打乱棋盘</button>
          <button class="kr-btn" data-act="swap">交换 14 · 15</button>
          <button class="kr-btn" data-act="reset">复位到目标</button>
          <button class="kr-btn" data-act="tour">自动演示</button>
        </div>
      </div>

      <div class="kr-card kr-why">
        <p class="kr-label">为什么</p>
        <p>空格每移动一格，逆序数 I 与空行号 R 的奇偶性就同时翻转，<b>I + R 的奇偶性不变</b>。于是 16! 种摆法被分成两个互不往来的类；目标态在奇类（0 + 1），交换 14、15 一次就落到偶类。</p>
      </div>

      <div class="kr-card">
        <p class="kr-label">课堂三步</p>
        <ol class="kr-steps">
          <li>点「打乱棋盘」：只做合法滑动，指针会跳，奇偶类始终是 1。</li>
          <li>点「交换 14 · 15」：一次对调，类翻成 0，旋钮转到另一边。</li>
          <li>再滑回去试试：无论怎么滑，0 都回不到 1。</li>
        </ol>
      </div>
    </aside>
  </div>

  <footer class="kr-foot">
    <span>读数由同一模型实时计算，与课件 check_solvable() 的（逆序数 + 空格从底部行号）mod 2 一致；空闲 9 秒后自动演示，触碰即停。</span>
    <span>等距三维实心绘制 · 无外部依赖 · 单文件离线运行</span>
  </footer>
</main>`;

const script = (kitScript() + live).replace(/<\/(script)/gi, "<\\/$1");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>十五数码奇偶台 · 交互式三维教学演示</title><style>${k.ISO_CSS}${pageCss}</style></head><body class="iso" data-theme="light">${bodyHtml}<script type="module">${script}</script></body></html>`;

writeFileSync(join(HERE, "shiwu-shuma.html"), html);
console.log("wrote shiwu-shuma.html", (html.length / 1024).toFixed(0) + " KB");
