// Builds the swarm-search table: a contour-model plotting table with six
// magnetic marker pucks, their personal-best flags and a best-so-far beacon.
//
//   node build.mjs            -> particle-swarm.html
//   node build.mjs --light    -> particle-swarm-light.html
//
// Import the same model the page runs, so the terraces and the numbers agree.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import { contourRings } from "./contour.mjs";
import {
  BUMPS,
  FIELD,
  SEEDS,
  FIELD_Z,
  LAYER_H,
  LEVELS,
  SWARM,
  createSwarm,
  fitness,
  spreadOf,
  surfaceZ,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 430;
const AZ = 42;
const ELEV = 36;

// ---------------------------------------------------------------- the machine
const BASE = { x: -232, y: -142, w: 464, d: 284, r: 14 };
const BASE_H = 12;
const FOOT_H = 5;
const BOARD = { x: -212, y: -128, w: 328, d: 250, r: 8 };
const BOARD_H = 8;
const CONSOLE = { x: 126, y: -54, w: 72, d: 104, r: 6 };
const CONSOLE_H = 27;
const FACE_H = 1.6;
const DIAL = [146, -26];
const DIAL_R = 17;
const DIAL_Z = CONSOLE_H + FACE_H;
const DIAL_TOP = DIAL_Z + 8;
const KNOB = [184, -26];
const KNOB_R = 8;
const KNOB_TOP = DIAL_Z + 5;
const PAPER = { x: 130, y: -2, w: 62, d: 30, r: 2 };
const CHART = { x0: 132, x1: 190, y0: 3, y1: 25, z: DIAL_Z + 0.68, slots: SWARM.life };
const TERRAIN_TOP = FIELD_Z + LEVELS.length * LAYER_H;
const FIELD_PLAN = { x: FIELD.x0, y: FIELD.y0, w: FIELD.x1 - FIELD.x0, d: FIELD.y1 - FIELD.y0, r: 6 };
const BEACON_H = 24.4;

// The swarm the page starts with, so the static art is the first frame.
let seed0 = SEEDS[0];
const first = createSwarm(seed0);
const beaconStart = { ...first.gbest };

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...k.boxCorners(BOARD, 0, TERRAIN_TOP),
    ...k.boxCorners(CONSOLE, 0, CONSOLE_H + FACE_H + 8),
    [BUMPS[0].cx, BUMPS[0].cy, FIELD_Z + LEVELS.length * LAYER_H + BEACON_H],
    [FIELD.x0 + 40, FIELD.y0 + 10, FIELD_Z + 30],
  ],
  WIDTH,
  HEIGHT,
  { pad: 44, azimuth: AZ, elevation: ELEV },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points, z = 0) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], z], P) - k.depthOf([b[0], b[1], z], P));

// ------------------------------------------------------------------- the base
function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 34))) {
    out.push(S(k.cylinder(x, y, 10, -BASE_H - FOOT_H, 1.8, P, 32), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 32), { tone: "mid" }));
    out.push(L(k.sideArc(x, y, 8, -BASE_H - FOOT_H + 3.4, P, 20), { tone: "faint" }));
  }
  out.push(
    S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), {
      tone: "mid",
      inner: L(k.sideSeam(BASE, -5, P, 10), { tone: "faint" }),
    }),
  );
  // A machined land along the near border, and the maker's plate on it.
  const strip = { x: -150, y: 128, w: 268, d: 11, r: 1.5 };
  out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 1, 0.8, [2.6, 5], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 5.5, 0.8]), at([strip.x + strip.w - 2, strip.y + 5.5, 0.8])], { size: 0.45 }));

  const plate = { x: -226, y: 127, w: 66, d: 14, r: 2 };
  out.push(S(k.slabOf(plate, 0, 1, P, 4, 0.3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 2), 1, P, 4), { tone: "faint" }));
  const rules = [
    [48, "mid"],
    [38, "lo"],
    [26, "lo"],
  ];
  rules.forEach(([length, tone], index) => {
    out.push(L(k.lineOnTop([plate.x + 5, plate.y + 4 + index * 3.2], [plate.x + 5 + length, plate.y + 4 + index * 3.2], 1, P), { tone, free: true }));
  });
  out.push(D([at([plate.x + plate.w - 4, plate.y + 3.5, 1]), at([plate.x + plate.w - 4, plate.y + plate.d - 3.5, 1])], { size: 0.45 }));
  return out.join("");
}

// ------------------------------------------------------------------ the board
function board() {
  const out = [];
  out.push(
    S(k.slabOf(BOARD, 0, BOARD_H, P, 10, 1.2), {
      tone: "mid",
      inner: L(k.sideSeam(BOARD, 4, P, 10), { tone: "faint" }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(BOARD, 5), BOARD_H, P, 10), { tone: "faint" }));
  out.push(L(k.planOutline(FIELD_PLAN, BOARD_H, P, 8), { tone: "lo" }));
  for (const [x, y] of k.corners(BOARD, 6)) {
    out.push(L(k.ring(x, y, 2.6, BOARD_H, P, 18), { tone: "lo" }));
    out.push(D([at([x, y, BOARD_H])], { size: 0.5 }));
  }
  // Graduations rooted on the field border: minors every 10, majors every 50.
  const minor = [];
  const major = [];
  const graduate = (from, to, root, direction, axis) => {
    const step = 10;
    const first = Math.ceil(from / step) * step;
    for (let value = first, index = Math.round(first / step); value <= to + 1e-9; value += step, index++) {
      const big = index % 5 === 0;
      const length = big ? 4.2 : 2.2;
      const a = axis === "x" ? [value, root] : [root, value];
      const b = axis === "x" ? [value, root + direction * length] : [root + direction * length, value];
      (big ? major : minor).push(k.lineOnTop(a, b, BOARD_H, P));
    }
  };
  graduate(FIELD.x0 + 6, FIELD.x1 - 6, FIELD.y0, -1, "x");
  graduate(FIELD.x0 + 6, FIELD.x1 - 6, FIELD.y1, 1, "x");
  graduate(FIELD.y0 + 6, FIELD.y1 - 6, FIELD.x0, -1, "y");
  graduate(FIELD.y0 + 6, FIELD.y1 - 6, FIELD.x1, 1, "y");
  out.push(L(minor.join(""), { tone: "lo" }));
  out.push(L(major.join(""), { tone: "mid" }));
  // Three clamps hold the contour model down on the board.
  const clamps = [
    { x: FIELD.x0 - 14, y: -34, w: 13, d: 30, r: 1.4 },
    { x: FIELD.x1 + 0.5, y: 28, w: 11, d: 30, r: 1.4 },
    { x: -74, y: FIELD.y1 + 1, w: 40, d: 12, r: 1.4 },
  ];
  for (const clamp of clamps) {
    out.push(S(k.slabOf(clamp, BOARD_H, 3.4, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(clamp, 1.7), BOARD_H + 3.4, P, 4), { tone: "faint" }));
    const [cx, cy] = [clamp.x + clamp.w / 2, clamp.y + clamp.d / 2];
    out.push(D([at([cx, cy, BOARD_H + 3.4])], { size: 0.55 }));
    out.push(L(k.ring(cx, cy, 1.6, BOARD_H + 3.4, P, 14), { tone: "lo" }));
  }
  return out.join("");
}

// ----------------------------------------------------------------- the relief
/** The nine contour terraces, each a plate cut to its own level curve. */
function relief() {
  const out = [];
  LEVELS.forEach((level, index) => {
    const z = FIELD_Z + index * LAYER_H;
    const { rings } = contourRings(level);
    const pieces = rings
      .map((ring) => {
        const cx = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
        const cy = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
        return { ring, key: k.depthOf([cx, cy, z], P) };
      })
      .sort((a, b) => a.key - b.key);
    for (const piece of pieces) {
      out.push(
        S(k.extrude(piece.ring, z, LAYER_H, P, { convex: false, bevel: 0.42 }), {
          tone: "hi",
          crease: "lo",
        }),
      );
    }
  });
  return out.join("");
}

// ------------------------------------------------------------------- markers
const PUCK_TOP = FIELD_Z + 10.9;
function puck(index) {
  const out = [];
  out.push(S(k.cylinder(0, 0, 8.6, FIELD_Z, 1.5, P, 40, 0.3), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(0, 0, 7.4, FIELD_Z + 1.5, 7.6, P, 40, 0.5), { tone: "hi", lit: true }));
  out.push(L(k.knurl(0, 0, 7.4, FIELD_Z + 2.6, FIELD_Z + 8.1, 46, P, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, 4.4, FIELD_Z + 9.1, 1.7, P, 32, 0.3), { tone: "hi", lit: true }));
  out.push(L(k.ring(0, 0, 4.4, PUCK_TOP, P, 32), { tone: "lo" }));
  out.push(D([at([0, 0, PUCK_TOP])], { size: 0.6, tone: "hi" }));
  out.push(`<path data-tip class="iso-line" data-tone="lit" style="stroke-width:1.1" d=""/>`);
  return `<g data-kind="puck" data-index="${index}">${out.join("")}</g>`;
}

const PIN_HEAD = FIELD_Z + 23.2;
function pin(index) {
  return `<g data-kind="pin" data-index="${index}">${[
    S(k.cylinder(0, 0, 3.4, FIELD_Z, 1.6, P, 28, 0.3), { tone: "mid" }),
    S(k.cylinder(0, 0, 1.15, FIELD_Z + 1.6, PIN_HEAD - FIELD_Z - 1.6, P, 20), { tone: "mid", crease: "none" }),
    S(k.slabOf({ x: -5.6, y: -1.6, w: 11.2, d: 3.2, r: 0.9 }, PIN_HEAD, 1.6, P, 4, 0.35), { tone: "mid" }),
    D([at([0, 0, PIN_HEAD + 1.6])], { size: 0.45, tone: "mid" }),
  ].join("")}</g>`;
}

function beacon() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 9.6, FIELD_Z, 2.4, P, 48, 0.4), { tone: "hi" }));
  out.push(L(k.knurl(0, 0, 9.6, FIELD_Z, FIELD_Z + 2.4, 48, P, 0.35), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, 2, FIELD_Z + 2.4, 18, P, 24), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(0, 0, 3.4, FIELD_Z + 7.4, 1.6, P, 24, 0.3), { tone: "hi" }));
  out.push(S(k.cylinder(0, 0, 3.4, FIELD_Z + 17.4, 1.6, P, 24, 0.3), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -9.4, y: -0.9, w: 18.8, d: 1.8, r: 0.6 }, FIELD_Z + 20.4, 0.9, P, 3), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -0.9, y: -9.4, w: 1.8, d: 18.8, r: 0.6 }, FIELD_Z + 20.4, 0.9, P, 3), { tone: "hi" }));
  out.push(S(k.cylinder(0, 0, 5.8, FIELD_Z + 21.3, 2.6, P, 40, 0.4), { tone: "hi" }));
  out.push(S(k.cylinder(0, 0, 4, FIELD_Z + 23.9, 0.9, P, 32, 0.2), { tone: "hi", lit: true }));
  out.push(L(k.ring(0, 0, 4, FIELD_Z + 24.8, P, 32), { tone: "hi" }));
  out.push(L(k.ring(0, 0, 5.8, FIELD_Z + 21.3, P, 40), { tone: "mid" }));
  return `<g data-kind="beacon">${out.join("")}</g>`;
}

/** Markers are drawn above the relief, sorted by depth, so a marker never sinks into a wall. */
function markers() {
  const out = [];
  const items = [];
  first.particles.forEach((particle, index) => {
    const z = surfaceZ(fitness(particle.x, particle.y));
    items.push({ svg: puck(index), at: [particle.x, particle.y, z], index, kind: "puck" });
    const pz = surfaceZ(particle.pbest.f);
    items.push({ svg: pin(index), at: [particle.pbest.x, particle.pbest.y, pz], index, kind: "pin" });
  });
  const bz = surfaceZ(beaconStart.f);
  items.push({ svg: beacon(), at: [beaconStart.x, beaconStart.y, bz], index: 0, kind: "beacon" });
  items.sort((a, b) => k.depthOf([a.at[0], a.at[1], a.at[2]], P) - k.depthOf([b.at[0], b.at[1], b.at[2]], P));
  for (const item of items) {
    out.push(`<g data-move="${item.at.join(" ")}" transform="${k.translateAlong(P, [item.at[0], item.at[1], item.at[2] - FIELD_Z])}">${item.svg}</g>`);
  }
  return `<g data-markers>${out.join("")}</g>`;
}

// ------------------------------------------------------------------ the console
function consoleUnit() {
  const out = [];
  out.push(
    S(k.slabOf(CONSOLE, 0, CONSOLE_H, P, 8, 1), {
      tone: "mid",
      inner: L(k.sideSeam(CONSOLE, 6, P, 8), { tone: "faint" }),
    }),
  );
  const face = k.insetPlan(CONSOLE, 3);
  out.push(S(k.slabOf(face, CONSOLE_H, FACE_H, P, 8, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(face, 1.6), CONSOLE_H + FACE_H, P, 8), { tone: "faint" }));
  // A closed access-panel outline on the near face, with its two screws.
  const faceY = CONSOLE.y + CONSOLE.d;
  const panelRing = [
    [133, faceY, 4],
    [191, faceY, 4],
    [191, faceY, 23],
    [133, faceY, 23],
  ].map((point) => at(point));
  out.push(L(k.pathOf(panelRing, true), { tone: "faint" }));
  out.push(D([at([133, faceY, 4]), at([191, faceY, 4]), at([133, faceY, 23]), at([191, faceY, 23])], { size: 0.5 }));

  // Iteration dial: one turn per run of thirty iterations.
  out.push(S(k.cylinder(DIAL[0], DIAL[1], DIAL_R, DIAL_Z, 8, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3.2, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL[0], DIAL[1], DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(DIAL[0], DIAL[1], DIAL_R - 3.6, 60, 5, DIAL_TOP, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(DIAL[0], DIAL[1], DIAL_R - 3.6, DIAL_TOP, P, 60), { tone: "faint" }));
  out.push(L(k.ring(DIAL[0], DIAL[1], 3.6, DIAL_TOP, P, 20), { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="hi" style="stroke-width:1.1" d=""/>`);

  // Inertia knob.
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, DIAL_Z, 5, P, 40, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, DIAL_Z, KNOB_TOP, 36, P, 0.35), { tone: "lo" }));
  out.push(L(k.ring(KNOB[0], KNOB[1], KNOB_R, KNOB_TOP, P, 40), { tone: "lo" }));
  out.push(D([at([KNOB[0], KNOB[1], KNOB_TOP])], { size: 0.55, tone: "hi" }));
  out.push(`<path data-part="knob" class="iso-line" data-tone="hi" style="stroke-width:1.2" d=""/>`);

  // Strip chart: best fitness per iteration on a paper tape between two spools.
  out.push(S(k.slabOf(PAPER, DIAL_Z, 0.5, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(PAPER, 2), DIAL_Z + 0.5, P, 4), { tone: "faint" }));
  for (const y of [9, 15, 21]) {
    out.push(L(k.lineOnTop([PAPER.x + 2, y], [PAPER.x + PAPER.w - 2, y], DIAL_Z + 0.5, P), { tone: "faint" }));
  }
  // The trace is drawn before the spools, so its ends disappear under the paper rolls.
  out.push(`<path data-part="chart" class="iso-line" data-tone="hi" style="stroke-width:1" d=""/>`);
  for (const x of [PAPER.x + 1, PAPER.x + PAPER.w - 1]) {
    out.push(S(k.cylinder(x, PAPER.y + PAPER.d / 2, 3.6, DIAL_Z, 3.6, P, 28, 0.3), { tone: "mid" }));
    out.push(L(k.knurl(x, PAPER.y + PAPER.d / 2, 3.6, DIAL_Z, DIAL_Z + 3.6, 24, P, 0.3), { tone: "lo" }));
  }

  // The converged lamp, and the maker's plate beside it.
  out.push(S(k.cylinder(136, 34, 3.6, DIAL_Z, 2.2, P, 28, 0.3), { tone: "mid" }));
  const lamp = S(k.cylinder(136, 34, 2.2, DIAL_Z + 2.2, 0.7, P, 24, 0.2), { tone: "hi" });
  out.push(lamp.replace('class="iso-solid"', 'class="iso-solid" data-lamp'));
  out.push(L(k.ring(136, 34, 2.2, DIAL_Z + 2.9, P, 24), { tone: "lo" }));
  out.push(L(k.ring(136, 34, 3.6, DIAL_Z + 2.2, P, 28), { tone: "lo" }));

  const panel = { x: 148, y: 31, w: 44, d: 13, r: 1.6 };
  out.push(S(k.slabOf(panel, DIAL_Z, 0.7, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(panel, 1.4), DIAL_Z + 0.7, P, 3), { tone: "faint" }));
  [32, 26, 17].forEach((length, index) => {
    out.push(L(k.lineOnTop([panel.x + 3, panel.y + 3.4 + index * 3], [panel.x + 3 + length, panel.y + 3.4 + index * 3], DIAL_Z + 0.7, P), { tone: "lo", free: true }));
  });
  return out.join("");
}

// ------------------------------------------------------------------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A search table: a contour-model terrain on a machined board, carrying six brass marker pucks. Each puck leaves a small flag at the best spot it has found, and a lit beacon stands at the best spot found by the whole swarm. A console at the right carries an iteration dial, an inertia knob and a paper strip chart of the best fitness.",
  body: [plinth(), board(), relief(), markers(), consoleUnit()],
});

// ----------------------------------------------------------------- live page
const DATA = {
  az: AZ,
  seeds: SEEDS,
  el: ELEV,
  dial: { x: DIAL[0], y: DIAL[1], r: DIAL_R, top: DIAL_TOP, turns: SWARM.life },
  knob: { x: KNOB[0], y: KNOB[1], top: KNOB_TOP },
  chart: CHART,
  puckTop: PUCK_TOP - FIELD_Z,
};

const live = `
const P = ${JSON.stringify(P)};
const D = ${JSON.stringify(DATA)};
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const VIEW = [Math.cos(D.az * RAD) * Math.cos(D.el * RAD), Math.sin(D.az * RAD) * Math.cos(D.el * RAD), Math.sin(D.el * RAD)];
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector("[data-markers]");
const pucks = [...layer.querySelectorAll('[data-kind="puck"]')].sort((a, b) => a.dataset.index - b.dataset.index);
const pins = [...layer.querySelectorAll('[data-kind="pin"]')].sort((a, b) => a.dataset.index - b.dataset.index);
const beacon = layer.querySelector('[data-kind="beacon"]');
const tips = pucks.map((el) => el.querySelector("[data-tip]"));
const needle = svg.querySelector('[data-part="needle"]');
const knobPointer = svg.querySelector('[data-part="knob"]');
const chart = svg.querySelector('[data-part="chart"]');
const lamp = svg.querySelector("[data-lamp]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const calmNow = () => still.matches;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const follow = (from, to, dt, tau) => from + (to - from) * (1 - Math.exp(-dt / tau));

let seed = 0;
let swarm = createSwarm(D.seeds[0]);
let omega = SWARM.omega;
let clock = 0;
let nextStep = 0.9;
let last = 0;
let frame = 0;
let visible = false;
let hold = 0;
let phase = "run";
let iterShown = 0;
let knobDrawn = -1;
let saidAria = "";
const shown = swarm.particles.map((p) => ({ x: p.x, y: p.y, z: surfaceZ(fitness(p.x, p.y)) }));
const pinShown = swarm.particles.map((p) => ({ x: p.pbest.x, y: p.pbest.y, z: surfaceZ(p.pbest.f) }));
const bestShown = { x: swarm.gbest.x, y: swarm.gbest.y, z: surfaceZ(swarm.gbest.f) };

// A marker is behind the relief when the relief, seen from the camera, stands over its top.
function hidden(x, y, z) {
  for (let t = 4; t < 96; t += 3) {
    const px = x + VIEW[0] * t;
    const py = y + VIEW[1] * t;
    if (px < FIELD.x0 || px > FIELD.x1 || py < FIELD.y0 || py > FIELD.y1) continue;
    if (surfaceZ(fitness(px, py)) > z + VIEW[2] * t + 0.4) return true;
  }
  return false;
}

function drawReadout() {
  const best = swarm.gbest.f;
  const text =
    phase === "hold"
      ? "已收敛 · 最优 " + best.toFixed(3)
      : phase === "seed"
        ? "重新撒点 · 最优 " + best.toFixed(3)
        : "迭代 " + swarm.iter + " · 最优 " + best.toFixed(3) + " · ω " + omega.toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(omega * 100)));
  const aria = "惯性 " + omega.toFixed(2) + (phase === "hold" ? "，已收敛" : "，第 " + swarm.iter + " 代") + "，最优 " + best.toFixed(3);
  if (aria !== saidAria) {
    saidAria = aria;
    stage.setAttribute("aria-valuetext", aria);
  }
}

function drawChart() {
  const history = swarm.history;
  const slots = D.chart.slots;
  const points = history.slice(0, slots).map((f, index) => [
    D.chart.x0 + (index / (slots - 1)) * (D.chart.x1 - D.chart.x0),
    D.chart.y1 - clamp(f, 0, 1) * (D.chart.y1 - D.chart.y0),
  ]);
  chart.setAttribute("d", points.length > 1 ? onTop(points, D.chart.z, P) : "");
}

function drawNeedle() {
  const angle = (iterShown / D.dial.turns) * TAU;
  needle.setAttribute(
    "d",
    lineOnTop(
      [D.dial.x - Math.sin(angle) * 3.6, D.dial.y + Math.cos(angle) * 3.6],
      [D.dial.x + Math.sin(angle) * (D.dial.r - 3.6), D.dial.y - Math.cos(angle) * (D.dial.r - 3.6)],
      D.dial.top + 0.2,
      P,
    ),
  );
}

function drawKnob() {
  const share = (omega - 0.3) / 0.65;
  const angle = (-140 + share * 280) * RAD;
  knobPointer.setAttribute(
    "d",
    lineOnTop(
      [D.knob.x + Math.sin(angle) * 2.2, D.knob.y - Math.cos(angle) * 2.2],
      [D.knob.x + Math.sin(angle) * 6.4, D.knob.y - Math.cos(angle) * 6.4],
      D.knob.top + 0.15,
      P,
    ),
  );
  knobDrawn = omega;
}

function place(dt, calm) {
  const marks = [];
  swarm.particles.forEach((particle, index) => {
    const shownAt = shown[index];
    const want = { x: particle.x, y: particle.y, z: surfaceZ(fitness(particle.x, particle.y)) };
    if (calm) {
      shownAt.x = want.x;
      shownAt.y = want.y;
      shownAt.z = want.z;
    } else {
      shownAt.x = follow(shownAt.x, want.x, dt, 0.17);
      shownAt.y = follow(shownAt.y, want.y, dt, 0.17);
      shownAt.z = follow(shownAt.z, want.z, dt, 0.09);
    }
    const puckEl = pucks[index];
    puckEl.setAttribute("transform", translateAlong(P, [shownAt.x, shownAt.y, shownAt.z - FIELD_Z]));
    const speed = Math.hypot(particle.vx, particle.vy) || 1;
    tips[index].setAttribute(
      "d",
      lineOnTop([0, 0], [(particle.vx / speed) * 5.6, (particle.vy / speed) * 5.6], FIELD_Z + 10.9, P),
    );
    puckEl.style.opacity = hidden(shownAt.x, shownAt.y, shownAt.z + D.puckTop) ? "0" : "";
    marks.push({ el: puckEl, key: depthOf([shownAt.x, shownAt.y, shownAt.z], P) });

    const pinAt = pinShown[index];
    const pinWant = { x: particle.pbest.x, y: particle.pbest.y, z: surfaceZ(particle.pbest.f) };
    if (calm) {
      pinAt.x = pinWant.x;
      pinAt.y = pinWant.y;
      pinAt.z = pinWant.z;
    } else {
      pinAt.x = follow(pinAt.x, pinWant.x, dt, 0.28);
      pinAt.y = follow(pinAt.y, pinWant.y, dt, 0.28);
      pinAt.z = follow(pinAt.z, pinWant.z, dt, 0.12);
    }
    const pinEl = pins[index];
    pinEl.setAttribute("transform", translateAlong(P, [pinAt.x, pinAt.y, pinAt.z - FIELD_Z]));
    marks.push({ el: pinEl, key: depthOf([pinAt.x, pinAt.y, pinAt.z], P) });
  });

  const wantBest = { x: swarm.gbest.x, y: swarm.gbest.y, z: surfaceZ(swarm.gbest.f) };
  if (calm) {
    bestShown.x = wantBest.x;
    bestShown.y = wantBest.y;
    bestShown.z = wantBest.z;
  } else {
    bestShown.x = follow(bestShown.x, wantBest.x, dt, 0.24);
    bestShown.y = follow(bestShown.y, wantBest.y, dt, 0.24);
    bestShown.z = follow(bestShown.z, wantBest.z, dt, 0.12);
  }
  beacon.setAttribute("transform", translateAlong(P, [bestShown.x, bestShown.y, bestShown.z - FIELD_Z]));
  marks.push({ el: beacon, key: depthOf([bestShown.x, bestShown.y, bestShown.z], P) });

  marks.sort((a, b) => a.key - b.key);
  const kids = layer.children;
  let ordered = true;
  for (let index = 0; index < marks.length; index++) {
    if (kids[index] !== marks[index].el) {
      ordered = false;
      break;
    }
  }
  if (!ordered) {
    const fragment = document.createDocumentFragment();
    for (const mark of marks) fragment.appendChild(mark.el);
    layer.appendChild(fragment);
  }
  lamp.toggleAttribute("data-lit", spreadOf(swarm) < 4.2);
}

function reseed() {
  seed += 1;
  swarm = createSwarm(D.seeds[seed % D.seeds.length]);
  hold = 0;
  phase = "seed";
  clock = 0;
  nextStep = 0.55;
  drawChart();
  kick();
}

function setOmega(value) {
  omega = clamp(value, 0.3, 0.95);
  drawKnob();
  kick();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = calmNow();
  if (visible) {
    clock += dt;
    if (phase === "hold") {
      hold += dt;
      if (hold > 1.8) reseed();
    } else if (clock >= nextStep) {
      if (converged(swarm)) {
        phase = "hold";
        hold = 0;
      } else {
        stepSwarm(swarm, omega);
        if (phase === "seed") phase = "run";
        nextStep = clock + (calm ? 2.2 : SWARM.dt);
        drawChart();
      }
    }
    if (calm) iterShown = swarm.iter;
    else iterShown = follow(iterShown, swarm.iter, dt, 0.3);
    place(dt, calm);
    drawNeedle();
    if (knobDrawn !== omega) drawKnob();
    drawReadout();
  }
  frame = visible ? requestAnimationFrame(tick) : 0;
}

function kick() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) kick();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

let dragging = false;
let dragged = 0;
stage.addEventListener("pointerdown", (event) => {
  dragging = true;
  dragged = 0;
  try {
    stage.setPointerCapture(event.pointerId);
  } catch {}
});
stage.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  dragged += 1;
  const box = svg.getBoundingClientRect();
  setOmega(0.3 + clamp((event.clientX - box.left) / box.width, 0, 1) * 0.65);
});
const release = () => {
  if (dragging && dragged < 3) reseed();
  dragging = false;
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", () => {
  dragging = false;
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") setOmega(omega + 0.05);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setOmega(omega - 0.05);
  else if (event.key === "Home") setOmega(0.3);
  else if (event.key === "End") setOmega(0.95);
  else if (event.key === " " || event.key === "Enter" || event.key === "r") reseed();
  else return;
  event.preventDefault();
});

drawChart();
drawKnob();
drawNeedle();
drawReadout();
if (still.matches) place(0, true);
kick();
`;

// ------------------------------------------------------------------- the card
const notes = `
<article class="pso-notes">
  <h2>粒子群算法在做什么</h2>
  <p>1995 年，Kennedy 与 Eberhart 把鸟群觅食的观察写成了算法：一群候选解在解空间里飞行，每个个体既记得自己到过的最好位置，也能看到整个群体到过的最好位置。上图就是这套规则的一台机床：等高线台阶是适应度地形，六枚磁力滑块是粒子，滑块上的指针是当前速度，细杆小旗是各自的历史最优（个人最优），灯塔立在全群最优处。</p>
  <h2>每一步只做三件事</h2>
  <p>第 <em>i</em> 个粒子在第 <em>t</em> 步的速度由三项相加，再让位置跟上速度：</p>
  <p class="pso-eq">v<sub>i</sub> ← ω v<sub>i</sub> + c<sub>1</sub> r<sub>1</sub> (p<sub>i</sub> − x<sub>i</sub>) + c<sub>2</sub> r<sub>2</sub> (g − x<sub>i</sub>)<br />x<sub>i</sub> ← x<sub>i</sub> + v<sub>i</sub></p>
  <ul>
    <li><b>惯性</b> ω v<sub>i</sub>：保持原来的方向。图上桌面的旋钮就是 ω——把它调小，粒子更听话、收敛更快；调大，探索更久，也更容易冲过头。</li>
    <li><b>认知项</b> c<sub>1</sub> r<sub>1</sub> (p<sub>i</sub> − x<sub>i</sub>)：被自己的小旗拉回去，即“我以前在那里找到过更好的”。</li>
    <li><b>社会项</b> c<sub>2</sub> r<sub>2</sub> (g − x<sub>i</sub>)：被灯塔拉过去，即“大家都说那边更好”。</li>
  </ul>
  <p>r<sub>1</sub>、r<sub>2</sub> 是每一步重新抽的 [0, 1) 随机数，所以同样的初值也不会走出同样的轨迹。经典取值 ω ≈ 0.73、c<sub>1</sub> = c<sub>2</sub> ≈ 1.49618，再加上速度上限 v<sub>max</sub>：本机的六枚滑块、1.49618 的系数和 34 的速度上限都写在 <code>model.mjs</code> 里，表盘与记录纸上的数字直接来自这次模拟。</p>
  <h2>表盘、记录纸与灯塔</h2>
  <p>台面上的数字都是真的：表盘每 30 代转一圈，记录纸逐代画出全群最优适应度，灯塔随 <em>g</em> 移动，小旗只在个人最优被刷新时才挪位。所以记录纸先陡后平的那一段，就是“收敛”；而灯塔早早钉死在某个次高峰上不再挪动，就是“早熟”——粒子全体挤在局部最优，社会项把多样性吃掉了。</p>
  <h2>动手</h2>
  <p>在卡片上横向拖动改变 ω，点击台面或按空格重新撒点，左右方向键微调 ω，Home / End 打到两端。地形有三个峰：主峰在左边，右前有一处次峰，后方还有一处小丘——所以每一次撒点都可能停在不同的地方，这正是随机重启（restart）在实践里管用的原因。</p>
</article>
<style>
  .pso-notes{margin:44px 0 0;color:var(--anatomy-text);font-size:14.5px;line-height:1.75}
  .pso-notes h2{margin:26px 0 8px;color:var(--anatomy-strong);font-size:15px;font-weight:600;letter-spacing:.01em}
  .pso-notes p{margin:0 0 10px}
  .pso-notes ul{margin:0 0 12px;padding-left:18px}
  .pso-notes li{margin:0 0 6px}
  .pso-notes code{font-family:var(--anatomy-mono);font-size:12.5px;color:var(--anatomy-strong)}
  .pso-notes .pso-eq{margin:14px 0 16px;padding:14px 16px;border-left:1px solid var(--anatomy-mid);color:var(--anatomy-strong);font-family:var(--anatomy-mono);font-size:13px;line-height:2}
  .iso-stage [data-kind]{transition:opacity .3s linear}
  .iso-plate .iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
  @media (max-width:560px){
    .iso-plate{overflow:hidden}
    .iso-stage .iso-svg{width:114%;margin-left:-7%}
    .pso-notes{font-size:13.5px}
  }
</style>`;

const body = k.plateHtml({
  fig: "图 1",
  title: "粒子群优化",
  hint: "拖动设定惯性 ω · 点击重撒粒子",
  readout: `迭代 0 · 最优 ${first.gbest.f.toFixed(3)} · ω ${SWARM.omega.toFixed(2)}`,
  keys: [
    { mark: "lit", label: "六枚磁力滑块：粒子，滑块上的指针是速度方向" },
    { mark: "raised", label: "等高线台阶：适应度地形，越靠里越高" },
    { mark: "dim", label: "细杆小旗：每个粒子自己的历史最优" },
    { mark: "flat", label: "表盘与记录纸：迭代计数、全群最优的收敛曲线" },
  ],
  caption:
    "一台搜索绘图台。六枚滑块在一块等高线地形模型上滑行，每一步按惯性、自己的小旗和灯塔三者的合力调整速度；灯塔立在全群最优处，记录纸逐代画出它的高度——先陡后平的那一段就是收敛。",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="粒子群搜索台：左右方向键调整惯性 ω，空格重新撒点" aria-valuemin="30" aria-valuemax="95" aria-valuenow="73" style="touch-action:pan-y">${svg}</div>`,
});

// The page runs the same model code the build used.
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const kitSource = readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

const page = k.pageHtml({
  title: "粒子群优化 · 搜索绘图台",
  theme,
  width: 700,
  body: body + notes,
  script: `${kitSource}\n${modelSource}\n${live}`,
});

writeFileSync(join(HERE, theme === "light" ? "particle-swarm-light.html" : "particle-swarm.html"), page);
console.log("wrote", theme === "light" ? "particle-swarm-light.html" : "particle-swarm.html");
console.log("start best", first.gbest.f.toFixed(3), "spread", spreadOf(first).toFixed(1), "peak", BUMPS.length, "levels", LEVELS.length);
