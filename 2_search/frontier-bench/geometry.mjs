// Static geometry for the frontier bench: every part drawn once, back to front.
import * as k from "./kit/iso-kit.mjs";

export const WIDTH = 880;
export const HEIGHT = 540;

export const BENCH = { x: -152, y: -98, w: 304, d: 142, r: 12 };
export const TOP = 14;
export const BED = { x: -106, y: -58, w: 212, d: 40, r: 2 };
export const BED_TOP = TOP + 4;
export const BAR_H = 15;
export const BAR_W = 11;
export const BAR_TOP = BED_TOP + BAR_H;
export const SLOTS = 12;
export const PITCH = 18;
export const SLOT0 = -99;
export const SLOT_X = (index) => SLOT0 + index * PITCH;
export const BAR_BACK = -55;
export const PAD_Y = -49;
export const PAD_REST = 37;
export const GRIP_Z = BAR_TOP;
export const CARRIED = 44;
export const SHEAR_X = 112;
export const TOP_Z = TOP;

const RAIL_X = 130;
const RAIL_Y = -54;
const BEAM_Z = 62;

export const KNOB = { x: 86, y: 27, from: (-130 * Math.PI) / 180, step: (26 * Math.PI) / 180 };

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -20, 0),
    [BENCH.x + 12, BENCH.y, BEAM_Z + 18],
    [BENCH.x + BENCH.w - 12, BENCH.y, BEAM_Z + 18],
    [RAIL_X + 14, -40, 58],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 45, elevation: 33 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -20, TOP + 20, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 22))) {
    out.push(S(k.cylinder(x, y, 9, -20, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 7, -18, 18, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(k.insetPlan(BENCH, 3), -10, 7, P, 8, 1.2), { tone: "lo" }));
  out.push(S(k.slabOf(BENCH, -3, TOP + 3, P, 10, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "lo" }));
  out.push(L(k.sideSeam(BENCH, TOP - 3, P, 10), { tone: "faint" }));
  const frontDots = [];
  for (let index = 1; index < 6; index++) frontDots.push(at([BENCH.x + (BENCH.w * index) / 6, BENCH.y + BENCH.d - 4, TOP]));
  out.push(D(frontDots, { size: 0.4, tone: "lo" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, TOP, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.5 }));
  return out.join("");
}

function rack() {
  const out = [];
  out.push(S(k.slabOf(BED, TOP, 4, P, 4, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 2.5), BED_TOP, P), { tone: "faint" }));
  const grooves = [];
  for (let index = 0; index < SLOTS; index++) {
    const x = SLOT_X(index);
    grooves.push(k.lineOnTop([x - 7, BED.y + 9], [x - 7, BED.y + BED.d - 8], BED_TOP, P));
    grooves.push(k.lineOnTop([x + 7, BED.y + 9], [x + 7, BED.y + BED.d - 8], BED_TOP, P));
  }
  out.push(L(grooves.join(""), { tone: "faint" }));
  const lip = { x: BED.x, y: BED.y + BED.d - 5, w: BED.w, d: 5, r: 1 };
  out.push(S(k.slabOf(lip, BED_TOP, 3, P, 3, 0.5), { tone: "mid" }));
  const ticks = [];
  for (let index = 0; index < SLOTS; index++) {
    const x = SLOT_X(index);
    const tall = index % 5 === 0 ? 3.6 : 2;
    ticks.push(k.lineOnTop([x, lip.y], [x, lip.y - tall], BED_TOP + 3, P));
  }
  out.push(L(ticks.join(""), { tone: "lo" }));
  const fence = { x: BED.x, y: BED.y - 5, w: BED.w, d: 6, r: 1.4 };
  out.push(S(k.slabOf(fence, BED_TOP, 4, P, 3, 0.6), { tone: "mid" }));
  out.push(D([BED.x + 8, BED.x + BED.w - 8].map((x) => at([x, fence.y + 3, BED_TOP + 4])), { size: 0.45 }));
  // left end stop, and the pusher's rail at the right end
  out.push(S(k.slabOf({ x: BED.x - 11, y: BED.y - 11, w: 10, d: BED.d + 22, r: 2 }, TOP, 36, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: BED.x - 11, y: BED.y - 11, w: 10, d: BED.d + 22, r: 2 }, TOP + 12, P, 4), { tone: "faint" }));
  out.push(L(k.ring(BED.x - 6, BED.y + BED.d / 2, 2.8, TOP + 36, P, 16), { tone: "lo" }));
  out.push(D([at([BED.x - 6, BED.y + BED.d / 2, TOP + 36])], { size: 0.45 }));
  out.push(S(k.slabOf({ x: BED.x + BED.w + 2, y: BED.y - 9, w: 8, d: BED.d + 18, r: 2 }, TOP, 7, P, 3, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BED.x + BED.w + 12, y: BED.y + BED.d / 2 - 20, w: 10, d: 40, r: 2 }, TOP, 30, P, 3, 0.6), { tone: "mid" }));
  out.push(D([at([BED.x + BED.w + 17, BED.y + 2, TOP + 28]), at([BED.x + BED.w + 17, BED.y + BED.d - 2, TOP + 28])], { size: 0.45 }));
  // the flag rail along the front of the bed
  const rail = { x: BED.x - 7, y: -14, w: BED.w + 14, d: 6, r: 1.6 };
  out.push(S(k.slabOf(rail, TOP, 3.4, P, 3, 0.5), { tone: "mid" }));
  const rt = k.topTicks(rail.x + 10, rail.x + rail.w - 10, 6, 5, rail.y + 1.2, TOP + 3.4, [1.8, 3.4], P);
  out.push(L(rt.minor, { tone: "lo" }), L(rt.major, { tone: "mid" }));
  return out.join("");
}

function bin() {
  const x = -148;
  const y = -58;
  const out = [];
  out.push(S(k.slabOf({ x, y, w: 34, d: 38, r: 2 }, TOP, 2, P, 3), { tone: "lo" }));
  const bars = [];
  for (let index = 0; index < 6; index++) {
    bars.push({ bx: x + 5 + (index % 3) * 11, by: y + 6 + Math.floor(index / 3) * 13, len: 9 + ((index * 5) % 11), z: TOP + 2 + (index % 2) * 6 });
  }
  bars.sort((a, b) => k.depthOf([a.bx, a.by, 0], P) - k.depthOf([b.bx, b.by, 0], P));
  for (const bar of bars) out.push(S(k.slabOf({ x: bar.bx - 5, y: bar.by, w: 10, d: bar.len, r: 0.8 }, bar.z, 8, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 4, y: y - 6, w: 42, d: 5, r: 1 }, TOP, 28, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 7, y: y - 6, w: 5, d: 50, r: 1 }, TOP, 18, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + 34, y: y - 6, w: 5, d: 50, r: 1 }, TOP, 13, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 7, y: y + 39, w: 46, d: 5, r: 1 }, TOP, 8, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.ring(x + 18, y + 41.5, 1.8, TOP + 8, P, 14), { tone: "lo" }));
  return out.join("");
}

function shear() {
  const out = [];
  const x = SHEAR_X;
  // stock fed in from behind the bench
  out.push(S(k.slabOf({ x: x - 6, y: -122, w: 12, d: 99, r: 0.8 }, TOP + 4, BAR_H, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([x - 6, -120], [x - 6, BAR_BACK - 3], BAR_TOP, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([x, -120], [x, BAR_BACK - 3], BAR_TOP, P), { tone: "faint" }));
  for (const gy of [-104, -82]) {
    out.push(S(k.slabOf({ x: x - 13, y: gy, w: 26, d: 9, r: 2 }, TOP, 16, P, 3, 0.6), { tone: "mid" }));
    out.push(D([at([x - 9, gy + 4.5, TOP + 16]), at([x + 9, gy + 4.5, TOP + 16])], { size: 0.4 }));
  }
  // the ledge the cut bar lands on
  out.push(S(k.slabOf({ x: x - 19, y: BAR_BACK - 3, w: 44, d: 62, r: 2 }, TOP, 4, P, 3, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline({ x: x - 15, y: BAR_BACK + 1, w: 36, d: 54, r: 1.5 }, TOP + 4, P), { tone: "faint" }));
  // anvil under the blade
  out.push(S(k.slabOf({ x: x - 16, y: BAR_BACK - 8, w: 32, d: 16, r: 1.5 }, TOP, 4, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([x - 15, BAR_BACK - 6], [x + 15, BAR_BACK - 6], TOP + 4, P), { tone: "lo" }));
  return out.join("");
}

function column() {
  // the right hand column: it carries the shear's arm and the head's beam
  const out = [];
  out.push(S(k.slabOf({ x: 118, y: -72, w: 30, d: 52, r: 4 }, TOP, 10, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 120, y: -70, w: 26, d: 48, r: 4 }, TOP + 10, 34, P, 4, 0.9), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: 120, y: -70, w: 26, d: 48, r: 4 }, TOP + 26, P, 4), { tone: "faint" }));
  out.push(D([at([126, -68, TOP + 10]), at([126, -24, TOP + 10])], { size: 0.45 }));
  // the shear's arm, reaching left over the stock
  out.push(S(k.slabOf({ x: 84, y: -74, w: 62, d: 30, r: 2 }, 44, 9, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 86, y: -72, w: 58, d: 26, r: 1.5 }, 53, P), { tone: "faint" }));
  const ticks = k.topTicks(-66, 20, 4, 5, 88, 53, [2.6, 4.6], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

function shearRam() {
  const x = SHEAR_X;
  const out = [];
  out.push(S(k.cylinder(x, BAR_BACK + 1, 7.4, 45, 8, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, BAR_BACK + 1, 4.4, 33, 12, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 16, y: BAR_BACK - 9, w: 32, d: 20, r: 2 }, 18, 15, P, 4, 0.8), { tone: "hi" }));
  out.push(L(k.lineOnTop([x - 14, BAR_BACK - 6], [x + 14, BAR_BACK - 6], 33, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([x - 17, BAR_BACK - 9], [x + 17, BAR_BACK - 9], 20, P), { tone: "faint" }));
  out.push(D([at([x - 11, BAR_BACK + 4, 33]), at([x + 11, BAR_BACK + 4, 33])], { size: 0.4 }));
  return out.join("");
}

function stopSvg() {
  // local y = 0 at the stop finger; the live code slides the finger along the stock
  const out = [];
  out.push(S(k.slabOf({ x: 98, y: -9, w: 26, d: 18, r: 2 }, 53, 10, P, 4, 0.7), { tone: "hi" }));
  out.push(S(k.cylinder(120, 0, 4, 63, 3.6, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(120, 0, 4, 63, 66.6, 18, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 90, y: -7, w: 12, d: 5, r: 1 }, 51, 4, P, 2, 0.4), { tone: "hi" }));
  out.push(S(k.slabOf({ x: 92, y: -3.6, w: 16, d: 7.2, r: 0.8 }, 26, 27, P, 2, 0.4), { tone: "hi" }));
  out.push(L(k.lineOnTop([91, -3.6], [109, -3.6], 51, P), { tone: "lo" }));
  return out.join("");
}

function headPosts() {
  const out = [];
  const px = -136;
  const py = -86;
  out.push(S(k.slabOf({ x: px - 12, y: py - 10, w: 24, d: 20, r: 3 }, TOP, 9, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 7.5, TOP + 9, BEAM_Z - TOP - 9, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(px, py, 7.5, TOP + 28, P, 20), { tone: "faint" }));
  out.push(L(k.sideArc(px, py, 7.5, TOP + 40, P, 20), { tone: "faint" }));
  out.push(D([at([px, py - 4, TOP + 9]), at([px, py + 4, TOP + 9])], { size: 0.45 }));
  out.push(S(k.slabOf({ x: px - 6, y: py + 2, w: 12, d: 34, r: 2 }, BEAM_Z, 8, P, 3, 0.7), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BENCH.x + 6, y: RAIL_Y - 5, w: BENCH.w - 12, d: 10, r: 2 }, BEAM_Z, 9, P, 4, 0.8), { tone: "mid" }));
  const ticks = k.topTicks(BENCH.x + 24, BENCH.x + BENCH.w - 24, 10, 5, RAIL_Y - 3, BEAM_Z + 9, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

function headCarriage() {
  const out = [];
  out.push(S(k.slabOf({ x: -20, y: RAIL_Y - 11, w: 40, d: 23, r: 3 }, BEAM_Z + 1, 17, P, 4, 0.8), { tone: "hi" }));
  out.push(L(k.lineOnTop([-16, RAIL_Y - 8], [16, RAIL_Y - 8], BEAM_Z + 18, P), { tone: "faint" }));
  out.push(L(k.ring(0, RAIL_Y, 5.8, BEAM_Z + 18, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(0, RAIL_Y, 3.8, BEAM_Z + 18, 3.6, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(0, RAIL_Y, 3.8, BEAM_Z + 18, BEAM_Z + 21.6, 16, P), { tone: "lo" }));
  out.push(D([at([-12, RAIL_Y, BEAM_Z + 18]), at([12, RAIL_Y, BEAM_Z + 18])], { size: 0.4 }));
  out.push(S(k.slabOf({ x: -5, y: RAIL_Y + 3, w: 10, d: 9, r: 1.5 }, 45, BEAM_Z - 46, P, 3, 0.5), { tone: "mid", crease: "none" }));
  out.push(L([53, BEAM_Z - 10].map((z) => k.sideArc(0, RAIL_Y + 7.5, 5, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -8, y: RAIL_Y - 1, w: 16, d: 14, r: 2 }, 36, 9, P, 4, 0.7), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -6, y: RAIL_Y + 1, w: 12, d: 10, r: 1.5 }, 45, 2.4, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -7, y: RAIL_Y + 2, w: 14, d: 6, r: 1 }, 33, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([-8, RAIL_Y + 11], [8, RAIL_Y + 11], 45, P), { tone: "faint" }));
  out.push(L(k.ring(0, RAIL_Y + 6, 2.4, 47.4, P, 16), { tone: "lo" }));
  out.push(D([at([-5, RAIL_Y + 1, 47.4]), at([5, RAIL_Y + 1, 47.4])], { size: 0.4 }));
  // the feeler's bracket behind the pad
  out.push(S(k.slabOf({ x: -3.2, y: RAIL_Y - 1, w: 6.4, d: 3, r: 0.8 }, 31, 6, P, 2, 0.4), { tone: "mid" }));
  return out.join("");
}

export function figureBody() {
  return [
    base(),
    bin(),
    rack(),
    shear(),
    headPosts(),
    column(),
    controls(),
    `<g data-part="bars"></g>`,
    `<g data-part="ram">${shearRam()}</g>`,
    `<g data-part="stop">${stopSvg()}</g>`,
    `<g data-part="pusher">${pusher()}</g>`,
    `<g data-part="flag">${flag()}</g>`,
    `<g data-part="head">${headCarriage()}<g data-part="pad"></g><g data-part="rod"></g></g>`,
  ].join("");
}

function flag() {
  const out = [];
  out.push(S(k.slabOf({ x: -10, y: -16, w: 20, d: 13, r: 2.5 }, 24, 10, P, 3, 0.6), { tone: "hi" }));
  out.push(D([at([-7, -10, 34]), at([7, -10, 34])], { size: 0.4 }));
  out.push(S(k.slabOf({ x: -2.4, y: -42, w: 4.8, d: 32, r: 0.8 }, 33, 4, P, 2, 0.4), { tone: "hi" }));
  out.push(S(k.cylinder(0, -42, 3, 29, 4, P, 18), { tone: "lit", lit: true }));
  out.push(L(k.ring(0, -42, 3, 33, P, 18), { tone: "lit" }));
  return out.join("");
}

function pusher() {
  const out = [];
  out.push(S(k.slabOf({ x: -3, y: -55, w: 6, d: 30, r: 1 }, BED_TOP, 9, P, 3, 0.6), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -4.5, y: -54, w: 9, d: 8, r: 2 }, BED_TOP, 15, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([-3, -53], [-3, -27], BED_TOP + 9, P), { tone: "lo" }));
  out.push(D([at([0, -51, BED_TOP + 15]), at([0, -29, BED_TOP + 15])], { size: 0.4 }));
  return out.join("");
}

function controls() {
  const out = [];
  const [kx, ky] = [KNOB.x, KNOB.y];
  out.push(S(k.cylinder(kx, ky, 15, TOP, 3, P, 40), { tone: "mid" }));
  out.push(L(k.ring(kx, ky, 15, TOP + 3, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(kx, ky, 11, TOP + 3, 8, P, 36, 0.6), { tone: "hi" }));
  out.push(L(k.knurl(kx, ky, 11, TOP + 3.6, TOP + 10.4, 44, P), { tone: "lo" }));
  out.push(L(k.ring(kx, ky, 11, TOP + 11, P, 36), { tone: "mid" }));
  const marks = [];
  const dots = [];
  for (let index = 0; index < 3; index++) {
    const angle = KNOB.from + index * KNOB.step;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    marks.push(k.lineOnTop([kx + dx * 12.6, ky + dy * 12.6], [kx + dx * 14.6, ky + dy * 14.6], TOP + 3, P));
    dots.push(k.ring(kx + dx * 16.8, ky + dy * 16.8, 2, TOP + 3, P, 12));
  }
  out.push(L(marks.join(""), { tone: "lo" }));
  out.push(L(dots.join(""), { tone: "mid" }));
  out.push(`<path data-part="pointer" class="iso-line" data-tone="lit" d="" style="stroke-width:1.3"/>`);
  const [bx, by] = [-46, 27];
  out.push(S(k.cylinder(bx, by, 14, TOP, 3, P, 36), { tone: "mid" }));
  out.push(L(k.ring(bx, by, 14, TOP + 3, P, 36), { tone: "lo" }));
  out.push(S(k.cylinder(bx, by, 10, TOP + 3, 3, P, 32), { tone: "hi" }));
  out.push(L(k.sideArc(bx, by, 10, TOP + 6, P, 24), { tone: "lo" }));
  // the machine's plate at the back, and the operator's rule along the front
  const plate = { x: -20, y: -94, w: 54, d: 20, r: 1.5 };
  out.push(S(k.slabOf(plate, TOP, 0.9, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.8), TOP + 0.9, P), { tone: "faint" }));
  const rules = [[-16, -89, 28], [-16, -84, 44], [-16, -79, 36]].map(([x, y, len]) =>
    k.lineOnTop([x, y], [x + len, y], TOP + 1.4, P),
  );
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(D([at([31, -89, TOP + 0.9]), at([31, -79, TOP + 0.9])], { size: 0.4 }));
  const spec = { x: -10, y: 6, w: 50, d: 18, r: 1.5 };
  out.push(S(k.slabOf(spec, TOP, 0.9, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(spec, 1.8), TOP + 0.9, P), { tone: "faint" }));
  const specLines = [[-6, 10.5, 22], [-6, 15, 36], [-6, 19.5, 28]].map(([x, y, len]) =>
    k.lineOnTop([x, y], [x + len, y], TOP + 1.4, P),
  );
  out.push(L(specLines.join(""), { tone: "lo", free: true }));
  out.push(D([at([36, 10, TOP + 0.9]), at([36, 20, TOP + 0.9])], { size: 0.4 }));
  const strip = { x: -44, y: 34, w: 104, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, TOP, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 6, strip.x + strip.w - 6, 5, 5, strip.y + 1, TOP + 0.8, [2, 3.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 4, TOP + 0.8]), at([strip.x + strip.w - 2, strip.y + 4, TOP + 0.8])], { size: 0.45 }));
  return out.join("");
}

export function makePieces(k, L) {
  const P = L.P;
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const PAD_Y = L.PAD_Y;
  const BAR_H = L.BAR_H;
  const BAR_W = L.BAR_W;

  function padSvg(zBottom) {
    const z = Math.round(zBottom * 100) / 100;
    const out = [];
    const stem = 36 - (z + 5);
    if (stem > 0.4) out.push(S(k.cylinder(0, PAD_Y, 3, z + 5, stem, P, 16), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(0, PAD_Y, 6.2, z, 2.8, P, 28), { tone: "hi" }));
    out.push(S(k.cylinder(0, PAD_Y, 5, z + 2.8, 3.4, P, 24), { tone: "mid" }));
    out.push(Ln(k.sideArc(0, PAD_Y, 5, z + 6.2, P, 20), { tone: "lo" }));
    out.push(Ln(k.ring(0, PAD_Y, 3.4, z, P, 20), { tone: "lit" }));
    return out.join("");
  }

  function rodSvg(extension) {
    const ext = Math.round(Math.max(0, extension) * 100) / 100;
    const out = [];
    out.push(S(k.slabOf({ x: -2.4, y: -51, w: 4.8, d: Math.max(2, ext), r: 0.6 }, 33.4, 2.8, P, 2, 0.3), { tone: "hi" }));
    out.push(S(k.slabOf({ x: -3.6, y: -51 + Math.max(2, ext) - 1, w: 7.2, d: 3.2, r: 0.6 }, 33.4, 3.6, P, 2, 0.3), { tone: "lit", lit: true }));
    return out.join("");
  }

  function barSvg(len) {
    const length = Math.round(len * 100) / 100;
    const out = [];
    out.push(S(k.slabOf({ x: -BAR_W / 2, y: 0, w: BAR_W, d: length, r: 1.4 }, 0, BAR_H, P, 2, 0.8), { tone: "hi", crease: "lo" }));
    out.push(Ln(k.lineOnTop([0, 2.4], [0, length - 2.4], BAR_H, P), { tone: "faint" }));
    out.push(Ln(k.lineOnTop([-BAR_W / 2 + 1.4, 2], [BAR_W / 2 - 1.4, 2], BAR_H, P), { tone: "lo" }));
    out.push(D([at([0, 2.8, BAR_H]), at([0, length - 2.8, BAR_H])], { size: 0.5 }));
    return out.join("");
  }

  return { padSvg, rodSvg, barSvg };
}

export function hotspots() {
  const [kx, ky] = [KNOB.x, KNOB.y];
  const detents = [];
  for (let index = 0; index < 3; index++) {
    const angle = KNOB.from + index * KNOB.step;
    detents.push({ at: at([kx + Math.sin(angle) * 16.8, ky - Math.cos(angle) * 16.8, TOP + 3]) });
  }
  return { detents, knob: at([kx, ky, TOP + 6]), button: at([-74, 26, TOP + 6]) };
}
