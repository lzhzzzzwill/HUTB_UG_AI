/* The Breeder — live behaviour. Runs in the page after the kit is inlined.
   The parts move from the same model that decides them: a population of eight
   eight-bit chromosomes, scored by ones, bred by single-point crossover and a
   one-bit mutation that replaces the two worst. */
const P = DATA.P;
const at = (p) => iso(p, P);
const S = solidSvg;
const L = lineSvg;
const D = dotsSvg;
const BAR_W = DATA.barW;
const BAR_H = DATA.barH;
const BAR_TOP = DATA.barTop;
const BAR_Y0 = DATA.barY0;
const BAR_Y1 = DATA.barY1;
const PIN_R = DATA.pinR;
const PIN_H = DATA.pinH;
const PIN_YS = DATA.pinYs;
const LANES = DATA.lane;
const JIG_BAR_Z = DATA.jigBarZ;
const HZ = DATA.hz;
const HEAD_HOME = DATA.headHome;
const SLOTS = DATA.slots;
const TRACE = DATA.trace;
const DIAL = DATA.dial;
const CUT_Y = (c) => DATA.cutY[c - 1];
const LEN = 8;
const POP = 8;
const Y_FINGER = 44; // the high shuttle's finger roof
const READ_Y0 = -58.4;
const READ_Y1 = -27.6;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const el = (sel) => svg.querySelector(sel);
const headEl = el('[data-part="head"]');
const dieEl = el('[data-part="die"]');
const knifeEl = el('[data-part="knife"]');
const shuttleH = el('[data-part="shuttleH"]');
const shuttleL = el('[data-part="shuttleL"]');
const fingersH = el('[data-fingers="H"]');
const fingersL = el('[data-fingers="L"]');
const punchEl = el('[data-part="punch"]');
const punchPins = el("[data-punch-pins]");
const probeEl = el('[data-part="probe"]');
const needleEl = el('[data-part="needle"] path');
const penEl = el('[data-part="pen"]');
const traceEl = el('[data-part="trace"]');
const countEl = svg.querySelector("[data-count]");
const liveEl = document.querySelector("[data-live]");
let lastPhase = "";
let lastGen = -1;
const barEls = Array.from({ length: POP }, (_, i) => el(`[data-bar="${i}"]`));
const jigEls = [0, 1].map((l) => ({
  head: el(`[data-part="jig${l}"] [data-jig="head"]`),
  tail: el(`[data-part="jig${l}"] [data-jig="tail"]`),
  seam: el(`[data-part="jig${l}"] [data-jig="seam"]`),
}));

/* ---------------- the model ---------------- */
let seed = 20261027;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randomChromosome = () => Array.from({ length: LEN }, () => (rnd() < 0.5 ? 1 : 0));
const ones = (chromosome) => chromosome.reduce((a, v) => a + v, 0);

let pop = Array.from({ length: POP }, randomChromosome);
let gen = 0;
const history = [];
let plan = null;

function makePlan() {
  const scores = pop.map(ones);
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
  const [p1, p2] = [order[0], order[1]];
  const [w1, w2] = [order[6], order[7]];
  const cut = 1 + Math.floor(rnd() * 5);
  const bit = Math.floor(rnd() * LEN);
  const A = pop[p1];
  const B = pop[p2];
  const childA = [...A.slice(0, cut), ...B.slice(cut)];
  const childB = [...B.slice(0, cut), ...A.slice(cut)];
  return { scores, order, p1, p2, w1, w2, cut, bit, childA, childB, best: scores[order[0]] };
}

/* ---------------- motion state ---------------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const follow = (cur, target, dt, tau) => (still.matches ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau)));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const st = {
  x: HEAD_HOME,
  z: HZ.travel,
  probeZ: 1,
  tip: 0,
  needle: 0,
  dieY: -44,
  dieZ: -8,
  knife: 0,
  punchY: -18,
  punch: 0,
  shHX: LANES[0],
  shHZ: 0,
  shLX: LANES[1],
  shLZ: 0,
  tailAx: 0,
  tailAz: 0,
  tailBx: 0,
  tailBz: 0,
  park: 1,
  penX: TRACE.x0,
};
let tg = { ...st };

const DUR = { travel: 0.22, read: 0.32, pick: 0.55, copy: 0.7, cut: 1.05, swap: 1.5, splice: 0.85, punch: 0.8, place: 0.55 };
let steps = [];
let stepIndex = 0;
let stepTime = 0;
let touring = false;
let manual = -1;
let manualTime = 0;
let idleTimer = 0;

function planSteps() {
  plan = makePlan();
  steps = [];
  for (let i = 0; i < POP; i++) steps.push({ kind: "read", slot: i, dur: DUR.travel + DUR.read });
  steps.push({ kind: "pick", slot: plan.w1, lane: 0, dur: DUR.pick });
  steps.push({ kind: "pick", slot: plan.w2, lane: 1, dur: DUR.pick });
  steps.push({ kind: "copy", slot: plan.p1, lane: 0, dur: DUR.copy });
  steps.push({ kind: "copy", slot: plan.p2, lane: 1, dur: DUR.copy });
  steps.push({ kind: "cut", dur: DUR.cut });
  steps.push({ kind: "swap", dur: DUR.swap });
  steps.push({ kind: "splice", dur: DUR.splice });
  steps.push({ kind: "punch", dur: DUR.punch });
  steps.push({ kind: "place", slot: plan.w1, lane: 0, dur: DUR.place });
  steps.push({ kind: "place", slot: plan.w2, lane: 1, dur: DUR.place });
  stepIndex = 0;
  stepTime = 0;
  enterStep();
}

const headXFor = (slot, lane) => SLOTS[slot] + (lane === 0 ? -LANES[0] : -LANES[1]);

function enterStep() {
  const s = steps[stepIndex];
  if (!s) return;
  tg.probeZ = 1;
  if (s.kind === "read") {
    tg.x = headXFor(s.slot, 0);
    tg.z = HZ.travel;
    tg.dieY = READ_Y0;
    tg.needle = 0;
  } else if (s.kind === "pick") {
    tg.x = headXFor(s.slot, s.lane);
    tg.z = HZ.grip;
    tg.needle = 0;
  } else if (s.kind === "copy") {
    tg.x = headXFor(s.slot, s.lane);
    tg.z = HZ.work;
    tg.dieY = (PIN_YS[0] + PIN_YS[7]) / 2;
  } else if (s.kind === "cut") {
    tg.dieY = CUT_Y(plan.cut);
    tg.dieZ = -8;
  } else if (s.kind === "swap") {
    tg.dieY = CUT_Y(plan.cut);
    tg.dieZ = 0;
  } else if (s.kind === "splice") {
    tg.dieY = CUT_Y(plan.cut);
    tg.dieZ = 0;
  } else if (s.kind === "punch") {
    tg.dieY = DATA.punchPark;
    tg.dieZ = 0;
    tg.punchY = PIN_YS[plan.bit];
  } else if (s.kind === "place") {
    tg.x = headXFor(s.slot, s.lane);
    tg.z = HZ.grip;
  }
}

function exitStep() {
  const s = steps[stepIndex];
  if (!s) return;
  if (s.kind === "read") {
    tg.needle = 0;
  } else if (s.kind === "pick") {
    borrowBar(s.slot, s.lane);
  } else if (s.kind === "copy") {
    cutJig(s.lane, pop[s.slot].slice());
  } else if (s.kind === "cut") {
    placeJigHalves(0, pop[plan.p1].slice(), plan.cut);
    placeJigHalves(1, pop[plan.p2].slice(), plan.cut);
  } else if (s.kind === "splice") {
    joinChildren();
  } else if (s.kind === "punch") {
    punchBit();
  } else if (s.kind === "place") {
    st.z = tg.z = HZ.grip;
    returnBar(s.slot, s.lane);
  }
}

/* ---------------- the bars ---------------- */
function paintRackBar(slot) {
  barEls[slot].innerHTML = barWhole(pop[slot], SLOTS[slot], DATA.barZ);
  barEls[slot].style.opacity = "1";
}
function cutJig(lane, bits) {
  const halves = barHalves(bits, LANES[lane], 0, JIG_BAR_Z);
  jigEls[lane].head.innerHTML = halves.head;
  jigEls[lane].tail.innerHTML = halves.tail;
  jigEls[lane].seam.innerHTML = "";
}
function placeJigHalves(lane, bits, cut) {
  const halves = barHalves(bits, LANES[lane], cut, JIG_BAR_Z);
  jigEls[lane].head.innerHTML = halves.head;
  jigEls[lane].tail.innerHTML = halves.tail;
  jigEls[lane].seam.innerHTML = halves.seam;
}
function borrowBar(slot, lane) {
  barEls[slot].style.opacity = "0";
  cutJig(lane, pop[slot].slice());
  if (lane === 0) {
    tg.shHX = LANES[0];
    tg.shHZ = 0;
    tg.tailAx = 0;
    tg.tailAz = 0;
  } else {
    tg.shLX = LANES[1];
    tg.shLZ = 0;
    tg.tailBx = 0;
    tg.tailBz = 0;
  }
}
function joinChildren() {
  placeJigHalves(0, plan.childA, plan.cut);
  placeJigHalves(1, plan.childB, plan.cut);
  tg.tailAx = 0;
  tg.tailAz = 0;
  tg.tailBx = 0;
  tg.tailBz = 0;
  tg.shHX = LANES[0];
  tg.shLX = LANES[1];
}
function punchBit() {
  plan.childA[plan.bit] ^= 1;
  plan.childB[plan.bit] ^= 1;
  placeJigHalves(0, plan.childA, plan.cut);
  placeJigHalves(1, plan.childB, plan.cut);
}
function returnBar(slot, lane) {
  jigEls[lane].head.innerHTML = "";
  jigEls[lane].tail.innerHTML = "";
  jigEls[lane].seam.innerHTML = "";
  if (lane === 0) pop[slot] = plan.childA;
  else pop[slot] = plan.childB;
  paintRackBar(slot);
}

/* ---------------- per-frame shaping ---------------- */
function countUpTo(bits, y) {
  let n = 0;
  for (let i = 0; i < LEN; i++) if (bits[i] && PIN_YS[i] <= y + 0.6) n++;
  return n;
}
function surfaceUnder(bits, y) {
  for (let i = 0; i < LEN; i++) if (bits[i] && Math.abs(PIN_YS[i] - y) < PIN_R + 0.4) return PIN_H;
  return 0;
}

function shape() {
  const s = steps[stepIndex];
  const p = s ? clamp(stepTime / s.dur, 0, 1) : 0;
  tg.park = s && s.kind === "swap" ? 0 : 1;
  if (manual >= 0) {
    const q = clamp(manualTime / 0.85, 0, 1);
    tg.x = SLOTS[manual] - LANES[0];
    tg.z = HZ.travel;
    if (q > 0.3) {
      const r = (q - 0.3) / 0.7;
      tg.dieY = READ_Y0 + r * (READ_Y1 - READ_Y0);
      tg.probeZ = 0;
      tg.needle = countUpTo(pop[manual], st.dieY);
    } else {
      tg.dieY = READ_Y0;
      tg.probeZ = 1;
      tg.needle = 0;
    }
    return;
  }
  if (!s) return;
  if (s.kind === "read") {
    const travel = DUR.travel / s.dur;
    if (p < travel) {
      tg.probeZ = 1;
      tg.dieY = READ_Y0;
      tg.needle = 0;
    } else {
      const q = (p - travel) / (1 - travel);
      tg.probeZ = 0;
      tg.dieY = READ_Y0 + q * (READ_Y1 - READ_Y0);
      tg.needle = countUpTo(pop[s.slot], st.dieY);
    }
  } else if (s.kind === "pick") {
    tg.z = p < 0.36 ? HZ.grip : HZ.work + 1.8;
    tg.probeZ = 1;
  } else if (s.kind === "copy") {
    tg.z = HZ.work;
    tg.dieZ = p > 0.36 && p < 0.74 ? -8 : 0;
  } else if (s.kind === "cut") {
    tg.z = HZ.work;
    tg.dieZ = p > 0.14 && p < 0.92 ? -8 : 0;
    tg.knife = p > 0.36 && p < 0.8 ? smooth(0.36, 0.44, p) * (1 - smooth(0.72, 0.8, p)) : 0;
  } else if (s.kind === "swap") {
    tg.z = HZ.work;
    tg.dieZ = 0;
    tg.knife = 0;
    tg.probeZ = 1;
    const A = LANES[0];
    const B = LANES[1];
    let lift = 0;
    if (p < 0.12) {
      tg.shHX = A;
      tg.shLX = B;
      lift = 0;
    } else if (p < 0.3) {
      lift = smooth(0.12, 0.3, p);
    } else if (p < 0.62) {
      lift = 1;
      tg.shHX = A + (B - A) * smooth(0.3, 0.62, p);
      tg.shLX = B + (A - B) * smooth(0.3, 0.62, p);
    } else if (p < 0.8) {
      tg.shHX = B;
      tg.shLX = A;
      lift = 1 - smooth(0.62, 0.8, p);
    } else {
      tg.shHX = B;
      tg.shLX = A;
      lift = 0;
    }
    tg.shHZ = 9.6 * lift;
    tg.shLZ = 4.6 * lift;
    tg.tailAx = tg.shHX - A;
    tg.tailAz = tg.shHZ;
    tg.tailBx = tg.shLX - B;
    tg.tailBz = tg.shLZ;
  } else if (s.kind === "splice") {
    tg.z = HZ.work;
    tg.dieZ = p > 0.24 && p < 0.82 ? -8 : 0;
  } else if (s.kind === "punch") {
    tg.z = HZ.work;
    tg.punch = p > 0.34 && p < 0.7 ? smooth(0.34, 0.42, p) * (1 - smooth(0.62, 0.7, p)) : 0;
  } else if (s.kind === "place") {
    tg.z = HZ.grip;
    tg.probeZ = 1;
  }
}

/* ---------------- drawing ---------------- */
function needleD(count) {
  const a = ((-160 + count * 40) * Math.PI) / 180;
  const y = DIAL.y - 1.0;
  return segment([Math.sin(a) * 3.4, y, DIAL.z + Math.cos(a) * 3.4], [Math.sin(a) * (DIAL.r - 3.6), y, DIAL.z + Math.cos(a) * (DIAL.r - 3.6)], P);
}
function knifeD(extend) {
  const top = 39.6;
  const low = 39.5 - 0.5 - extend * 4.6;
  return S(slabOf({ x: -16.6, y: -0.6, w: 33.2, d: 1.2, r: 0.3 }, low, top - low, P, 2), { tone: "hi" });
}
function fingersD(roof, lift) {
  const top = 28.1 + lift;
  return LANES.map((x) =>
    [x - 4.4, x + 4.4]
      .map((fx) => S(slabOf({ x: fx - 0.8, y: -1.3, w: 1.6, d: 2.6, r: 0.4 }, top, roof - top, P, 2, 0.2), { tone: "mid" }))
      .join(""),
  ).join("");
}
function punchPinsD(stroke) {
  return LANES.map((x) => S(cylinder(x, 0, 1.35, 31.6 + (1 - stroke) * 30.6, 2.4 + stroke * 30.6, P, 12), { tone: "hi" })).join("");
}

function draw() {
  headEl.setAttribute("transform", translateAlong(P, [st.x, 0, st.z]));
  dieEl.setAttribute("transform", translateAlong(P, [0, st.dieY, st.dieZ]));
  probeEl.setAttribute("transform", translateAlong(P, [0, 0, st.probeZ * 3.5 + st.tip - 3.7]));
  shuttleH.setAttribute("transform", translateAlong(P, [st.shHX, st.dieY + 7.4, 0]));
  shuttleL.setAttribute("transform", translateAlong(P, [st.shLX, st.dieY + 10.8, 0]));
  punchEl.setAttribute("transform", translateAlong(P, [0, st.punchY, 0]));
  jigEls[0].tail.setAttribute("transform", translateAlong(P, [st.tailAx, 0, st.tailAz]));
  jigEls[1].tail.setAttribute("transform", translateAlong(P, [st.tailBx, 0, st.tailBz]));
  needleEl.setAttribute("d", needleD(st.needle));
  knifeEl.innerHTML = st.knife > 0.01 ? knifeD(st.knife) : "";
  fingersH.innerHTML = fingersD(Y_FINGER, st.shHZ + st.park * 8);
  fingersL.innerHTML = fingersD(38.5, st.shLZ + st.park * 8);
  punchPins.innerHTML = punchPinsD(st.punch);
  penEl.setAttribute("transform", translateAlong(P, [st.penX - TRACE.x0, TRACE.yFront, 0]));
  const label = String(gen).padStart(2, "0").slice(-2);
  if (countEl.textContent !== label) countEl.textContent = label;
}

function traceD() {
  const points = [];
  const span = 9;
  for (let g = Math.max(0, gen - span); g <= gen; g++) {
    const s = history[g];
    if (s === undefined) continue;
    points.push([TRACE.x0 + (s / 8) * (TRACE.x1 - TRACE.x0), TRACE.yFront - 3 * (gen - g)]);
  }
  return points.length > 1 ? onTop(points, 30.62, P) : "";
}

/* ---------------- the run ---------------- */
let frame = 0;
let last = 0;
let visible = false;
let clock = 0;

function readoutText() {
  if (manual >= 0) return `第 ${manual + 1} 条 · ${Math.round(st.needle)}/8`;
  const s = steps[stepIndex];
  if (!s || !plan) return `第 ${gen} 代 · 最好 ${history[gen] ?? "-"}`;
  if (s.kind === "read") return `第 ${s.slot + 1} 条 · ${Math.round(st.needle)}/8`;
  if (s.kind === "pick") return `取出第 ${s.slot + 1} 条`;
  if (s.kind === "copy") return `复制第 ${s.slot + 1} 条`;
  if (s.kind === "cut") return `切点 ${plan.cut} · ${plan.p1 + 1}×${plan.p2 + 1}`;
  if (s.kind === "swap") return "交换尾段";
  if (s.kind === "splice") return "压接接缝";
  if (s.kind === "punch") return `翻转第 ${plan.bit + 1} 位`;
  if (s.kind === "place") return `第 ${gen} 代 · 最好 ${plan.best}`;
  return `第 ${gen} 代 · 最好 ${plan.best}`;
}

function finishGeneration() {
  gen += 1;
  history[gen] = plan.best;
  tg.penX = TRACE.x0 + (plan.best / 8) * (TRACE.x1 - TRACE.x0);
  traceEl.innerHTML = L(traceD(), { tone: "hi", free: true });
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (manual >= 0) {
    manualTime += dt;
  } else if (touring) {
    stepTime += dt;
    const s = steps[stepIndex];
    if (s && stepTime >= s.dur) {
      stepTime -= s.dur;
      exitStep();
      stepIndex += 1;
      if (stepIndex >= steps.length) {
        finishGeneration();
        planSteps();
      } else {
        enterStep();
      }
    }
  }
  shape();
  st.x = follow(st.x, tg.x, dt, 0.15);
  st.z = follow(st.z, tg.z, dt, 0.1);
  st.probeZ = follow(st.probeZ, tg.probeZ, dt, 0.05);
  st.needle = follow(st.needle, tg.needle, dt, 0.05);
  st.dieY = follow(st.dieY, tg.dieY, dt, 0.13);
  st.dieZ = follow(st.dieZ, tg.dieZ, dt, 0.08);
  st.knife = follow(st.knife, tg.knife, dt, 0.05);
  st.punch = follow(st.punch, tg.punch, dt, 0.05);
  st.punchY = follow(st.punchY, tg.punchY, dt, 0.12);
  st.shHX = follow(st.shHX, tg.shHX, dt, 0.08);
  st.shHZ = follow(st.shHZ, tg.shHZ, dt, 0.07);
  st.shLX = follow(st.shLX, tg.shLX, dt, 0.08);
  st.shLZ = follow(st.shLZ, tg.shLZ, dt, 0.07);
  st.tailAx = follow(st.tailAx, tg.tailAx, dt, 0.08);
  st.tailAz = follow(st.tailAz, tg.tailAz, dt, 0.07);
  st.tailBx = follow(st.tailBx, tg.tailBx, dt, 0.08);
  st.tailBz = follow(st.tailBz, tg.tailBz, dt, 0.07);
  st.penX = follow(st.penX, tg.penX, dt, 0.25);
  st.park = follow(st.park, tg.park, dt, 0.07);

  // the stylus drops into the gaps between raised pins
  const bar = manual >= 0 ? pop[manual] : steps[stepIndex] && steps[stepIndex].kind === "read" && tg.probeZ === 0 ? pop[steps[stepIndex].slot] : null;
  st.tip = follow(st.tip, bar ? surfaceUnder(bar, st.dieY) : 0, dt, 0.03);

  draw();
  const text = readoutText();
  if (readout.textContent !== text) readout.textContent = text;
  const stepNow = steps[stepIndex];
  const phase = manual >= 0 ? "manual" : stepNow ? stepNow.kind : "idle";
  if (liveEl && (phase !== lastPhase || (phase === "place" && gen !== lastGen))) {
    lastGen = gen;
    lastPhase = phase;
    liveEl.textContent =
      phase === "read" ? "正在逐条测量" : phase === "pick" ? "正在取出最差的两条" : phase === "copy" ? "正在复制父代" : phase === "cut" ? "正在按切点切断" : phase === "swap" ? "正在交换尾段" : phase === "splice" ? "正在压接接缝" : phase === "punch" ? "正在翻转一位" : phase === "place" ? `第 ${gen} 代开始` : "待机";
  }

  const moving =
    Math.abs(st.x - tg.x) > 0.02 ||
    Math.abs(st.z - tg.z) > 0.02 ||
    Math.abs(st.dieY - tg.dieY) > 0.02 ||
    Math.abs(st.needle - tg.needle) > 0.02 ||
    Math.abs(st.dieZ - tg.dieZ) > 0.02 ||
    Math.abs(st.knife - tg.knife) > 0.02;
  const active = touring || (manual >= 0 && manualTime < 1.6);
  frame = visible && (moving || active) ? requestAnimationFrame(tick) : 0;
}

const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

/* ---------------- interaction ---------------- */
function startTour() {
  if (still.matches) return;
  manual = -1;
  manualTime = 0;
  touring = true;
  if (steps.length === 0) planSteps();
  run();
}
function stopTour() {
  touring = false;
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

const barCentres = SLOTS.map((cx) => at([cx, (BAR_Y0 + BAR_Y1) / 2, BAR_TOP + 3]));
const slotAt = (clientX, clientY) => {
  const box = svg.getBoundingClientRect();
  const px = ((clientX - box.left) / box.width) * 690;
  const py = ((clientY - box.top) / box.height) * 452;
  let best = -1;
  let bestD = Infinity;
  barCentres.forEach(([bx, by], i) => {
    const d = Math.hypot(px - bx, py - by);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD < 34 ? best : -1;
};

let resumeTimer = 0;
stage.addEventListener("pointermove", (event) => {
  const slot = slotAt(event.clientX, event.clientY);
  if (slot !== manual) {
    manual = slot;
    manualTime = 0;
    clearTimeout(resumeTimer);
    if (slot >= 0) {
      stopTour();
    } else {
      resumeTimer = setTimeout(() => startTour(), 700);
    }
  }
  if (slot >= 0) run();
});
stage.addEventListener("pointerleave", () => {
  manual = -1;
  clearTimeout(idleTimer);
  clearTimeout(resumeTimer);
  idleTimer = setTimeout(() => startTour(), 1600);
  run();
});
stage.addEventListener("focus", () => stopTour());
stage.addEventListener("keydown", (event) => {
  const here = manual >= 0 ? manual : -1;
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(POP - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, here - 1);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = POP - 1;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (touring) stopTour();
    else startTour();
    return;
  }
  if (next === null) return;
  event.preventDefault();
  manual = next;
  manualTime = 0;
  stopTour();
  run();
});

/* ---------------- boot ---------------- */
window.__breeder = {
  state: () => ({ gen, step: steps[stepIndex] && steps[stepIndex].kind, t: +stepTime.toFixed(2), needle: +st.needle.toFixed(2), probe: +st.probeZ.toFixed(2), tailAx: +st.tailAx.toFixed(1), tailBx: +st.tailBx.toFixed(1), dieY: +st.dieY.toFixed(1), pop: pop.map((b) => b.join("")), plan: plan && { cut: plan.cut, bit: plan.bit, p1: plan.p1, p2: plan.p2, w1: plan.w1, w2: plan.w2 } }),
  centres: barCentres,
  slotAt,
  run: () => startTour(),
  stop: () => stopTour(),
};
pop.forEach((_, i) => paintRackBar(i));
plan = makePlan();
history[0] = Math.max(...pop.map(ones));
gen = 0;
tg.penX = TRACE.x0 + (history[0] / 8) * (TRACE.x1 - TRACE.x0);
st.penX = tg.penX;
draw();
if (still.matches) {
  // one still, honest frame: the head over the first bar, holding its reading
  manual = 0;
  manualTime = 1;
  run();
} else {
  idleTimer = setTimeout(() => startTour(), 900);
}
