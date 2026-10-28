// The Breeder — a genetic-algorithm bench instrument, drawn with the anatomy kit.
//
// Eight gene bars sit in a slotted rack. Each bar carries eight pins; a raised pin is
// a one, a flush socket a zero. A travelling head reads a bar by sweeping a spring
// stylus along its pins: every raised pin lifts the stylus and trips a pawl one tooth
// on a ratchet, so the dial shows the bar's score as a count. The head then lifts the
// two lowest-scoring bars into its jaws, presses each one onto a high-scoring bar to
// copy its pattern, cuts both copies at one chosen point, swaps their tails on two
// transfer shuttles, splices them with the die and punches one bit in each. The
// rewritten bars go back in their own slots. A chart recorder plots the best score of
// every generation.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import { kitScript } from "./scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const W = 690;
const H = 452;

/* ---------- world ---------- */
const PLATE = { x: -152, y: -84, w: 306, d: 96, r: 10 };
const PLATE_Z = -14;
const PLATE_H = 14;

const SLOT0 = -122;
const PITCH = 21;
const SLOTS = Array.from({ length: 8 }, (_, i) => SLOT0 + PITCH * i); // -122 .. 25
const RACK = { x: -134, y: -76, w: 177, d: 52 };
const BED_Z = 20;
const BED_TOP = 24;

const BAR_W = 14;
const BAR_Y0 = -73;
const BAR_Y1 = -26;
const BAR_Z = 24;
const BAR_H = 3.5;
const BAR_TOP = BAR_Z + BAR_H;
const PIN_YS = Array.from({ length: 8 }, (_, i) => -58 + 4 * i); // -58 .. -30
const PIN_R = 1.25;
const PIN_H = 3.7;
const CUTS = [1, 2, 3, 4, 5];
const CUT_Y = (c) => -56 + 4 * (c - 1); // c = 1..5 -> -56 .. -40
const LANE = [-11, 11];

// the head is built at x = 0; the bars it carries hang at z = 28 when it is at hz = 0
const JIG_BAR_Z = 28;
const HZ = { travel: 5, grip: -4, work: 3.2 };

const POST_X = [-144, 70];
const POST_Y = [-74, -26];
const RAIL_Z = 84;
const HEAD_HOME = 36;
const DIAL = { y: -64.2, z: 73, r: 10.5 };
const PUNCH_PARK = -18;
const PUNCH_BIT_Y = null;

const REC = { x: 78, y: -80, w: 74, d: 36, top: 30 };
const PAPER = { x: 82, y: -76, w: 66, d: 30 };
const TRACE = { x0: 85, x1: 145, yFront: -50 };
const COUNTER = { x: 72, y: -14, w: 36, d: 20, h: 20 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, PLATE_Z - 5, 0),
    [-144, -74, 0], [70, -26, 0],
    [-144, -74, RAIL_Z + 12], [70, -26, RAIL_Z + 12],
    [REC.x + REC.w, REC.y, REC.top + 12],
    [COUNTER.x + COUNTER.w, COUNTER.y + COUNTER.d, COUNTER.h],
  ],
  W,
  H,
  { pad: 30, azimuth: 44, elevation: 32 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
// aliases so the bar builder can run verbatim inside the page
const slabOf = k.slabOf;
const cylinder = k.cylinder;
const ring = k.ring;
const lineOnTop = k.lineOnTop;
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------- helpers ---------- */
function faceCircle(cx, cz, yFace, r, steps = 48) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    points.push(at([cx + r * Math.cos(a), yFace, cz + r * Math.sin(a)]));
  }
  return k.pathOf(points, true);
}
function faceArc(cx, cz, yFace, r, steps = 40) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    points.push(at([cx + r * Math.cos(a), yFace, cz + r * Math.sin(a)]));
  }
  return k.pathOf(points);
}
const facePath = (d, cls, extra = "") => `<path class="${cls}"${extra} d="${d}"/>`;
const faceLine = (from, to, yFace, tone) =>
  L(k.segment([from[0], yFace, from[1]], [to[0], yFace, to[1]], P), { tone });

/* ---------- a gene bar ---------- */
// One piece of a bar: the plate from y0..y1, its pins, optionally the grip tongue.
function barPiece(bits, cx, y0, y1, opt) {
  const options = opt || {};
  const z0 = options.z === undefined ? BAR_Z : options.z;
  const tongue = !!options.tongue;
  const tone = options.tone || "hi";
  const top = z0 + BAR_H;
  const out = [];
  if (y1 - y0 < 0.8) return "";
  out.push(S(slabOf({ x: cx - BAR_W / 2, y: y0, w: BAR_W, d: y1 - y0, r: 1.4 }, z0, BAR_H, P, 4, 0.6), { tone, crease: "lo" }));
  if (tongue) {
    out.push(S(slabOf({ x: cx - 3.5, y: y0 + 0.6, w: 7, d: 6.4, r: 1.1 }, top, 4, P, 4, 0.5), { tone: "mid" }));
    out.push(L(lineOnTop([cx - 2.2, y0 + 3.8], [cx + 2.2, y0 + 3.8], top + 4, P), { tone: "faint" }));
  }
  for (let i = 0; i < 8; i++) {
    const y = PIN_YS[i];
    if (y < y0 + 1.4 || y > y1 - 1.4) continue;
    if (bits[i]) {
      out.push(S(cylinder(cx, y, PIN_R, top, PIN_H, P, 14, 0.35), { tone, crease: "lo" }));
      out.push(D([at([cx, y, top + PIN_H])], { size: 0.4, tone: "hi" }));
    } else {
      out.push(L(ring(cx, y, 1.5, top, P, 14), { tone: "lo" }));
      out.push(D([at([cx, y, top])], { size: 0.8, tone: "lo" }));
    }
  }
  return out.join("");
}

function barWhole(bits, cx, z0) {
  return barPiece(bits, cx, BAR_Y0, BAR_Y1, { z: z0 === undefined ? BAR_Z : z0, tongue: true });
}

// The two halves a bar is cut into: head (rear, keeps the tongue) and tail (front).
// c = 0 means uncut.
function barHalves(bits, cx, c, z0) {
  const z = z0 === undefined ? BAR_Z : z0;
  if (!c) return { head: barPiece(bits, cx, BAR_Y0, BAR_Y1, { z, tongue: true }), tail: "", seam: "" };
  const yc = CUT_Y(c);
  return {
    head: barPiece(bits, cx, BAR_Y0, yc - 0.4, { z, tongue: true }),
    tail: barPiece(bits, cx, yc + 0.4, BAR_Y1, { z }),
    seam: L(lineOnTop([cx - BAR_W / 2, yc], [cx + BAR_W / 2, yc], z + BAR_H + 0.15, P), { tone: "faint" }),
  };
}

/* ---------- base ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, PLATE_Z - 5, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7.5, PLATE_Z - 5, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, PLATE_Z - 5 + 1.6, 3.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, PLATE_Z, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 8), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -100, y: 2, w: 150, d: 8, r: 1.2 };
  out.push(S(k.slabOf(strip, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 4, 5, strip.y + 0.9, 0.7, [2, 3.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2.5, strip.y + 4, 0.7]), at([strip.x + strip.w - 2.5, strip.y + 4, 0.7])], { size: 0.45 }));

  const plate = { x: 20, y: -16, w: 34, d: 11, r: 2 };
  out.push(S(k.slabOf(plate, 0, 0.9, P, 4, 0.4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.8), 0.9, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([plate.x + 4.5, plate.y + 3.4], [plate.x + 21, plate.y + 3.4], 0.9, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([plate.x + 4.5, plate.y + 6.2], [plate.x + 28, plate.y + 6.2], 0.9, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([plate.x + 4.5, plate.y + 8.6], [plate.x + 15, plate.y + 8.6], 0.9, P), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 2.6, plate.y + 2.6, 0.9]), at([plate.x + plate.w - 2.6, plate.y + plate.d - 2.6, 0.9])], { size: 0.4 }));

  // the operator's job card on the front right
  const card = { x: 114, y: -14, w: 22, d: 24, r: 1 };
  out.push(S(k.slabOf(card, 0, 0.7, P, 4), { tone: "hi", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(card, 1.2), 0.7, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: card.x + 5, y: card.y + 0.6, w: 12, d: 3.4, r: 0.8 }, 0.7, 1.6, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(card.x + 11, card.y + 2.3, 2.2, 0.7, 3.4, P, 16), { tone: "mid" }));
  out.push(L(k.knurl(card.x + 11, card.y + 2.3, 2.2, 1.4, 3.8, 14, P), { tone: "lo" }));
  out.push(D([at([card.x + 11, card.y + 2.3, 4.1])], { size: 0.4 }));
  for (const [dy, len] of [[7, 14], [10.5, 17], [14, 11], [17.5, 15]]) {
    out.push(L(k.lineOnTop([card.x + 3.5, card.y + dy], [card.x + 3.5 + len, card.y + dy], 0.72, P), { tone: "lo", free: true }));
  }
  out.push(D([at([card.x + 2, card.y + card.d - 2, 0.72])], { size: 0.5 }));

  // a shallow parts tray on the front left, with a few spare pins
  const tray = { x: -140, y: -20, w: 30, d: 18, r: 2 };
  out.push(S(k.slabOf(tray, 0, 3.4, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 2), 3.4, P), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 4.4), 3.4, P), { tone: "lo" }));
  for (const [px, py] of [[-132, -14], [-127, -10], [-136, -8]]) {
    out.push(S(k.cylinder(px, py, 1.25, 3.4, 3.4, P, 12, 0.3), { tone: "hi" }));
  }
  out.push(D([at([tray.x + 2.5, tray.y + 2.5, 3.4]), at([tray.x + tray.w - 2.5, tray.y + tray.d - 2.5, 3.4])], { size: 0.38 }));
  return out.join("");
}

/* ---------- the rack ---------- */
function rackStatic() {
  const out = [];
  out.push(S(k.slabOf({ x: RACK.x + 12, y: RACK.y + 11, w: RACK.w - 24, d: RACK.d - 22, r: 3 }, 0, 2, P, 5, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: RACK.x + 5, y: RACK.y + 4, w: RACK.w - 10, d: RACK.d - 8, r: 4 }, 2, 18, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline({ x: RACK.x + 7, y: RACK.y + 6, w: RACK.w - 14, d: RACK.d - 12, r: 3 }, 20, P), { tone: "faint" }));
  out.push(S(k.slabOf(RACK, BED_Z, BED_TOP - BED_Z, P, 6, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(RACK, 3), BED_TOP, P), { tone: "faint" }));
  for (const [x, w] of [[RACK.x - 6, 6], [RACK.x + RACK.w, 6]]) {
    out.push(S(k.slabOf({ x, y: RACK.y + 3, w, d: RACK.d - 6, r: 1.2 }, BED_Z, 14, P, 3, 0.6), { tone: "mid" }));
    out.push(D([at([x + w / 2, RACK.y + 9, BED_Z + 14]), at([x + w / 2, RACK.y + RACK.d - 9, BED_Z + 14])], { size: 0.45 }));
  }
  return out.join("");
}

function slotParts() {
  const items = [];
  for (let i = 0; i <= 8; i++) {
    const x = SLOT0 - 10.5 + i * PITCH;
    items.push({
      key: k.depthOf([x + 1.5, RACK.y + RACK.d / 2, BED_TOP], P),
      svg: `${S(k.slabOf({ x, y: RACK.y + 2, w: 3, d: RACK.d - 4, r: 1 }, BED_TOP, 4.5, P, 3, 0.5), { tone: "mid" })}${D([at([x + 1.5, RACK.y + 7, BED_TOP + 4.5]), at([x + 1.5, RACK.y + RACK.d - 7, BED_TOP + 4.5])], { size: 0.36 })}`,
    });
  }
  return items;
}

/* ---------- gantry ---------- */
function gantry() {
  const out = [];
  for (const x of POST_X) {
    for (const y of POST_Y) {
      out.push(S(k.cylinder(x, y, 8, 0, 5, P, 24, 0.5), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 4.6, 0, RAIL_Z - 5, P, 24), { tone: "mid", crease: "none" }));
      out.push(L(k.sideArc(x, y, 4.6, 26, P, 14), { tone: "faint" }), L(k.sideArc(x, y, 4.6, 64, P, 14), { tone: "faint" }));
      out.push(S(k.cylinder(x, y, 6.4, RAIL_Z - 7, 7, P, 24, 0.5), { tone: "mid" }));
      out.push(L(k.knurl(x, y, 6.4, RAIL_Z - 5, RAIL_Z - 0.5, 22, P), { tone: "lo" }));
    }
  }
  for (const [y, d] of [[-74, 6], [-32, 6]]) {
    out.push(S(k.slabOf({ x: -150, y, w: 222, d, r: 1.4 }, RAIL_Z, 4, P, 3, 0.5), { tone: "mid" }));
    out.push(L(k.lineOnTop([-150, y + d / 2], [72, y + d / 2], RAIL_Z + 4, P), { tone: "faint" }));
    for (const x of [-138, -104, -66, -28, 12, 50, 68]) out.push(D([at([x, y + d / 2, RAIL_Z + 4])], { size: 0.4, tone: "lo" }));
  }
  return out.join("");
}

/* ---------- the head (built at x = 0) ---------- */
function headStatic() {
  const out = [];
  out.push(S(k.slabOf({ x: -23, y: -80, w: 46, d: 60, r: 3 }, RAIL_Z + 4, 6, P, 5, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -20, y: -77, w: 40, d: 54, r: 2 }, RAIL_Z + 10, P), { tone: "faint" }));
  out.push(D([at([-19, -76, RAIL_Z + 10]), at([19, -76, RAIL_Z + 10]), at([-19, -23, RAIL_Z + 10]), at([19, -23, RAIL_Z + 10])], { size: 0.44 }));

  // rear housing carrying the dial
  out.push(S(k.slabOf({ x: -18, y: -81, w: 36, d: 17, r: 2.5 }, 56, 30, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -15, y: -78, w: 30, d: 11, r: 2 }, 86, P), { tone: "faint" }));
  out.push(L(k.sideSeam({ x: -18, y: -81, w: 36, d: 17, r: 2.5 }, 62, P, 5), { tone: "faint" }));
  out.push(D([at([-15, -76, 86]), at([15, -76, 86])], { size: 0.4 }));
  out.push(S(k.slabOf({ x: -12, y: -78, w: 24, d: 6, r: 1.2 }, 86, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([-9, -75], [4, -75], 86.8, P), { tone: "lo", free: true }));
  out.push(S(k.cylinder(0, -75, 4, 86, 2, P, 20), { tone: "mid" }));

  // neck from the jaw up into the housing
  out.push(S(k.slabOf({ x: -12, y: -79, w: 24, d: 12, r: 2 }, 53, 3, P, 3, 0.5), { tone: "mid" }));

  // the jaw: a body over the tongues, with a grip fork per lane
  out.push(S(k.slabOf({ x: -19, y: -79, w: 38, d: 16, r: 2 }, 41, 12, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: -19, y: -79, w: 38, d: 16, r: 2 }, 46, P, 4), { tone: "faint" }));
  out.push(D([at([-16, -71, 53]), at([16, -71, 53])], { size: 0.4 }));
  for (const x of LANE) {
    out.push(S(k.slabOf({ x: x - 8.6, y: -74.8, w: 17.2, d: 2.6, r: 0.7 }, 31.6, 9.4, P, 2, 0.35), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 8.6, y: -66.4, w: 17.2, d: 2.6, r: 0.7 }, 31.6, 9.4, P, 2, 0.35), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 8.6, y: -74.8, w: 17.2, d: 11, r: 1 }, 41, 3, P, 2, 0.3), { tone: "mid" }));
  }
  out.push(S(k.cylinder(13.5, -71, 3.2, 53, 5, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(13.5, -71, 3.2, 53, 58, 20, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([10.9, -71], [16.1, -71], 58, P), { tone: "hi" }));

  // front columns and the tool rail
  for (const x of [-20.5, 20.5]) {
    out.push(S(k.cylinder(x, -22, 2.4, 58, RAIL_Z + 4 - 58, P, 18), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(x, -22, 2.4, 68, P, 12), { tone: "faint" }));
    out.push(S(k.slabOf({ x: x - 3.6, y: -27, w: 7.2, d: 9, r: 1.3 }, 58, 4, P, 3, 0.4), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -18, y: -62, w: 36, d: 46, r: 2 }, 58, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([-17, -16.4], [17, -16.4], 62, P), { tone: "faint" }));
  out.push(D([at([-16, -55, 62]), at([16, -55, 62])], { size: 0.4 }));
  // the cut scale along the rail, one mark per cut point
  for (let c = 1; c <= 5; c++) {
    const y = CUT_Y(c);
    out.push(L(k.lineOnTop([-17.6, y], [-14.6, y], 62, P), { tone: "mid" }));
    out.push(L(k.lineOnTop([-17.6, y + 2], [-16.2, y + 2], 62, P), { tone: "lo" }));
  }
  return out.join("");
}

/* ---------- the die ---------- */
function dieSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: -17, y: -5, w: 34, d: 10, r: 2 }, 47, 11, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -14, y: -2.6, w: 28, d: 5.2, r: 1.6 }, 58, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -12, y: -2.6, w: 24, d: 5.2, r: 1.4 }, 58, 4, P, 3, 0.4), { tone: "mid" }));
  // presser feet: outside the bit row on each lane, either side of the knife
  for (const x of LANE) {
    for (const s of [-3, 3]) {
      out.push(S(k.slabOf({ x: x - 1.7, y: s - 1.5, w: 3.4, d: 3, r: 0.6 }, 39.5, 7.6, P, 2, 0.3), { tone: "mid" }));
    }

  }
  // the shuttle bracket
  out.push(S(k.slabOf({ x: -14, y: 4.6, w: 28, d: 8.9, r: 1.2 }, 52, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([-13, 11, 56]), at([13, 11, 56])], { size: 0.38 }));
  out.push(L(lineOnTop([-16.8, 0], [16.8, 0], 47, P), { tone: "lo" }));
  return out.join("");
}

/* ---------- the transfer shuttles (their fingers are rebuilt live) ---------- */
function shuttleSvg(high) {
  const bodyZ = high ? 44 : 38.5;
  const out = [];
  out.push(S(k.slabOf({ x: -5.2, y: -2.1, w: 10.4, d: 4.2, r: 1 }, bodyZ, 6, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 1.1, bodyZ + 6, 52 - bodyZ - 6, P, 12), { tone: "mid" }));
  out.push(D([at([0, 0, bodyZ + 6])], { size: 0.4 }));
  out.push(L(lineOnTop([-5.2, 1.9], [5.2, 1.9], bodyZ + 0.4, P), { tone: "faint" }));
  return out.join("");
}

/* ---------- the punch head ---------- */
function punchSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: -11, y: -3, w: 22, d: 6, r: 1.2 }, 58, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -12, y: -3.4, w: 24, d: 6.8, r: 1.4 }, 62, 5, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -8, y: -2.4, w: 16, d: 4.8, r: 1 }, 67, 2.4, P, 3, 0.3), { tone: "mid" }));
  out.push(D([at([-11, -3, 62]), at([11, -3, 62])], { size: 0.38 }));
  return out.join("");
}

/* ---------- recorder ---------- */
function recorder() {
  const out = [];
  out.push(S(k.slabOf(REC, 0, REC.top, P, 6, 1.0), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(REC, 4), REC.top, P), { tone: "faint" }));
  out.push(L(k.planOutline({ x: PAPER.x - 2, y: PAPER.y - 1, w: PAPER.w + 4, d: PAPER.d + 2, r: 1 }, REC.top, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: PAPER.x, y: PAPER.y, w: PAPER.w, d: PAPER.d, r: 0.8 }, REC.top, 0.6, P, 3), { tone: "hi", crease: "faint" }));
  const ruled = [];
  for (let y = PAPER.y + 4; y < PAPER.y + PAPER.d - 2; y += 5) ruled.push(k.lineOnTop([PAPER.x, y], [PAPER.x + PAPER.w, y], REC.top + 0.62, P));
  for (let x = PAPER.x + 8; x < PAPER.x + PAPER.w - 2; x += 8) ruled.push(k.lineOnTop([x, PAPER.y], [x, PAPER.y + PAPER.d], REC.top + 0.62, P));
  out.push(L(ruled.join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: REC.x + 2, y: REC.y + REC.d - 6, w: REC.w - 4, d: 4, r: 0.8 }, REC.top, 3, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: REC.x + 2, y: REC.y + 1, w: REC.w - 4, d: 3.6, r: 0.8 }, REC.top, 2.4, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: REC.x + 3, y: PAPER.y - 9, w: REC.w - 6, d: 4, r: 1 }, REC.top + 5, 4, P, 3, 0.4), { tone: "mid" }));
  for (const x of [REC.x + 5, REC.x + REC.w - 5]) {
    out.push(S(k.cylinder(x, PAPER.y - 7, 2.6, REC.top, 5, P, 18), { tone: "mid" }));
    out.push(D([at([x, PAPER.y - 7, REC.top + 9])], { size: 0.4 }));
  }
  out.push(S(k.slabOf(COUNTER, 0, COUNTER.h, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.sideSeam(COUNTER, 5, P, 5), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(COUNTER, 2.4), COUNTER.h, P), { tone: "faint" }));
  out.push(D([at([COUNTER.x + 3, COUNTER.y + 3, COUNTER.h]), at([COUNTER.x + COUNTER.w - 3, COUNTER.y + 3, COUNTER.h])], { size: 0.4 }));
  const fy = COUNTER.y + COUNTER.d;
  const wx = COUNTER.x + 5, wz = 7.5, ww = 26, wh = 10;
  out.push(facePath(`M${at([wx, fy, wz + wh]).join(" ")}L${at([wx + ww, fy, wz + wh]).join(" ")}L${at([wx + ww, fy, wz]).join(" ")}L${at([wx, fy, wz]).join(" ")}Z`, "iso-shade", ' data-shade="0"'));
  out.push(faceLine([wx, wz + wh], [wx + ww, wz + wh], fy, "lo"));
  out.push(faceLine([wx, wz], [wx + ww, wz], fy, "lo"));
  out.push(faceLine([wx, wz], [wx, wz + wh], fy, "lo"));
  out.push(faceLine([wx + ww, wz], [wx + ww, wz + wh], fy, "lo"));
  out.push(L(k.planOutline({ x: COUNTER.x + 6, y: COUNTER.y + 5, w: COUNTER.w - 12, d: 5, r: 1 }, COUNTER.h, P), { tone: "faint" }));
  return out.join("");
}

/* ---------- the dial ---------- */
function dial() {
  const out = [];
  const { y, z, r } = DIAL;
  out.push(facePath(faceCircle(0, z, y - 0.3, r + 1.7), "iso-top"));
  out.push(facePath(faceCircle(0, z, y - 0.3, r + 1.7), "iso-edge", ' data-tone="lo" fill="none"'));
  out.push(facePath(faceCircle(0, z, y - 0.5, r), "iso-shade", ' data-shade="2"'));
  out.push(facePath(faceCircle(0, z, y - 0.5, r), "iso-edge", ' data-tone="mid" fill="none"'));
  out.push(L(faceArc(0, z, y - 0.7, r - 2.4), { tone: "lo" }));
  const angle = (v) => (-160 + v * 40) * (Math.PI / 180);
  for (let v = 0; v <= 8; v++) {
    const a = angle(v);
    const inner = r - 3.2, outer = r - 1.2;
    out.push(faceLine([Math.sin(a) * inner, z + Math.cos(a) * inner], [Math.sin(a) * outer, z + Math.cos(a) * outer], y - 0.8, "mid"));
    if (v < 8) {
      const m = angle(v + 0.5);
      out.push(faceLine([Math.sin(m) * (r - 2.3), z + Math.cos(m) * (r - 2.3)], [Math.sin(m) * (r - 1.7), z + Math.cos(m) * (r - 1.7)], y - 0.8, "lo"));
    }
  }
  for (const v of [0, 2, 4, 6, 8]) {
    const a = angle(v);
    const tx = Math.sin(a) * (r - 5.6), tz = Math.cos(a) * (r - 5.6);
    out.push(k.faceTextSvg(k.sideMatrix([tx, y - 0.8], z + tz + 0.8, P, "left"), String(v), { size: 2.2, tone: "mid", anchor: "middle" }));
  }
  out.push(L(faceArc(0, z, y - 0.9, 3.4), { tone: "mid" }));
  out.push(S(k.cylinder(10.5, y + 3, 2.2, z + 5, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(10.5, y + 3, 2.2, z + 5, z + 10, 16, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -1.8, y: y - 1.2, w: 3.6, d: 2.4, r: 0.6 }, z - 7.6, 2, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

/* ---------- probe and pen ---------- */
function probeSvg() {
  const tip = 31.2 - HZ.travel;
  const out = [];
  out.push(S(k.cylinder(0, 0, 1.0, tip + 0.6, 17.4, P, 14), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(0, 0, 2.1, tip, 1.5, P, 14), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -2.6, y: -4.2, w: 5.2, d: 8.4, r: 1.2 }, 40, 4.2, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -1.1, y: -1.6, w: 2.2, d: 3.2, r: 0.5 }, 44.2, 2.8, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 2.2, 40, P, 14), { tone: "lo" }));
  out.push(D([at([0, 0, 40])], { size: 0.36 }));
  return out.join("");
}
function penSvg() {
  const out = [];
  out.push(S(k.slabOf({ x: -4, y: -3.4, w: 8, d: 6.8, r: 1.2 }, 35, 4.4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 1.4, 30.8, 4.4, P, 14), { tone: "hi" }));
  out.push(D([at([0, 0, 39.6])], { size: 0.4 }));
  return out.join("");
}

/* ---------- assemble ---------- */
const body = [];
body.push(base());
body.push(rackStatic());

const slotItems = slotParts();
const CHROME = [1, 0, 1, 0, 1, 0, 1, 0];
SLOTS.forEach((cx, i) => {
  slotItems.push({ key: k.depthOf([cx, (BAR_Y0 + BAR_Y1) / 2, BAR_TOP], P), svg: `<g data-bar="${i}">${barWhole(CHROME, cx)}</g>` });
});
slotItems.sort((a, b) => a.key - b.key);
slotItems.forEach((item) => body.push(item.svg));

body.push(gantry());
body.push(recorder());
body.push(`<g data-part="trace"></g>`);

body.push(`<g data-part="head" transform="${k.translateAlong(P, [HEAD_HOME, 0, HZ.travel])}">`);
body.push(headStatic());
body.push(dial());
body.push(`<g data-part="die" transform="${k.translateAlong(P, [0, -44, 0])}">${dieSvg()}<g data-part="knife"></g><g data-part="probe" transform="${k.translateAlong(P, [LANE[0], 0, -0.2])}">${probeSvg()}</g></g>`);
body.push(`<g data-part="shuttleH" transform="${k.translateAlong(P, [LANE[0], -36.6, 0])}">${shuttleSvg(true)}<g data-fingers="H"></g></g>`);
body.push(`<g data-part="shuttleL" transform="${k.translateAlong(P, [LANE[1], -33.2, 0])}">${shuttleSvg(false)}<g data-fingers="L"></g></g>`);
body.push(`<g data-part="punch" transform="${k.translateAlong(P, [0, -18, 0])}">${punchSvg()}<g data-punch-pins></g></g>`);

body.push(`<g data-part="needle"><path class="iso-line" data-tone="lit" data-free="end" d=""/></g>`);
for (const lane of [0, 1]) {
  body.push(`<g data-part="jig${lane}"><g data-jig="head"></g><g data-jig="tail"></g><g data-jig="seam"></g></g>`);
}
body.push(`</g>`);
body.push(`<g data-part="pen" transform="${k.translateAlong(P, [TRACE.x0, TRACE.yFront, 0])}">${penSvg()}</g>`);
body.push(k.faceTextSvg(k.sideMatrix([COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d], 10.6, P, "left"), "00", { size: 6.4, tone: "hi", anchor: "middle" }).replace("<text", '<text data-count=""'));

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "育种机：一台演示遗传算法的台式仪器。八根基因条插在带槽的条架上，每根条上有八个销钉，抬起为 1、凹下为 0。可移动的测量头用一根弹簧触针沿销钉扫过，每遇到一个抬起的销钉，棘爪就把棘轮推进一齿，表盘上便数出这条的分数（0 到 8）。随后测量头把分数最低的两根条夹起，逐一压到高分条上复制其图案；两份副本在同一个切点被切断，由两台传送梭交换尾段，再用模座压接、打掉一位。改写好的条回到各自的槽位，记录仪则画出每一代的最好分数。",
  body,
});

const data = {
  P,
  slots: SLOTS,
  pinYs: PIN_YS,
  lane: LANE,
  barZ: BAR_Z,
  barY0: BAR_Y0,
  barY1: BAR_Y1,
  barW: BAR_W,
  barH: BAR_H,
  barTop: BAR_TOP,
  pinR: PIN_R,
  pinH: PIN_H,
  jigBarZ: JIG_BAR_Z,
  hz: HZ,
  headHome: HEAD_HOME,
  cutY: CUTS.map(CUT_Y),
  trace: TRACE,
  dial: DIAL,
  punchPark: PUNCH_PARK,
};

const liveSource = readFileSync(join(HERE, "live.mjs"), "utf8");
const bars = [barPiece, barWhole, barHalves].map((f) => f.toString()).join("\n");

const bodyHtml = k.plateHtml({
  fig: "图 1",
  title: "遗传算法",
  hint: "悬停读数 · ← → 换条 · 空格 运行",
  readout: "第 1 条 · 0/8",
  keys: [
    { mark: "lit", label: "表针：触针刚刚数到的适应度" },
    { mark: "raised", label: "八根基因条，每根八个销钉——抬起为 1，凹下为 0" },
    { mark: "edge", label: "交叉模座：夹住切点，切断后把两段尾巴换接" },
  ],
  caption:
    "「育种机」在一排染色体条上跑遗传算法：先逐条量出适应度（抬起的销钉数），留下最好的两条当父代，把最差的两条改写成父代的副本——副本在同一个切点被切断、交换尾段、拼接，再打掉一位。记录仪把每一代的最好分数画成曲线。",
  body: `<style>.iso-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}</style><div class="iso-stage" tabindex="0" role="group" aria-label="育种机：在八根基因条上运行的遗传算法。把指针悬停在某根条上可读出它的分数；左右方向键逐条移动测量头；空格开始或暂停运行。">${svg}<span class="iso-sr" aria-live="polite" data-live></span></div>`,
});

const page = k.pageHtml({
  title: "育种机 — 遗传算法",
  theme,
  body: bodyHtml,
  script: `${kitScript()}\nconst DATA = ${JSON.stringify(data)};\n${bars}\n${liveSource}`,
  width: 700,
});

const name = theme === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
