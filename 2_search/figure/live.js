const LAY = LAYOUT;
const P = LAY.P;
const SLOTX = LAY.SLOT_X;
const svg = document.querySelector(".iso-stage svg");
const q = (selector) => svg.querySelector(selector);
const part = {
  bars: q('[data-part="bars"]'),
  head: q('[data-part="head"]'),
  pad: q('[data-part="pad"]'),
  rod: q('[data-part="rod"]'),
  flag: q('[data-part="flag"]'),
  stop: q('[data-part="stop"]'),
  ram: q('[data-part="ram"]'),
  pusher: q('[data-part="pusher"]'),
  pointer: q('[data-part="pointer"]'),
};
const readout = document.querySelector("[data-readout]");
const stage = document.querySelector(".iso-stage");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const RULE_LIST = LAY.rules;
const CAP = LAY.SLOTS;
const BAR_BACK = LAY.BAR_BACK;
const BED_TOP = LAY.BED_TOP;
const BAR_H = LAY.BAR_H;
const GRIP_Z = BED_TOP + BAR_H;
const PAD_REST = LAY.PAD_REST;
const CARRIED = LAY.CARRIED;
const TOP_Z = LAY.TOP;
const SHEAR_X = LAY.SHEAR_X;
const BIN_X = -132;
const KNOB = LAY.KNOB;
const ms = (value) => (still.matches ? 0 : value * 0.34);

const state = {
  rule: 0,
  search: null,
  bars: [],
  headX: SHEAR_X,
  padZ: PAD_REST,
  rodExt: 0,
  flagX: SLOTX[0],
  stopY: BAR_BACK + 8,
  ramZ: 0,
  pusherX: 0,
  carried: null,
  busy: false,
  jammed: false,
  solved: false,
  spent: 0,
  last: null,
  run: 0,
  tour: true,
};

const keyOf = (node) => (RULE_LIST[state.rule].id === "astar" ? node.g + node.h : node.g);
const barLen = (node) => Math.min(34, keyOf(node) + 3);

// ---------------------------------------------------------------- drawing
function draw() {
  const hx = state.headX;
  part.head.setAttribute("transform", translateAlong(P, [hx, 0, 0]));
  part.pad.innerHTML = padSvg(state.padZ);
  part.rod.innerHTML = rodSvg(state.rodExt);
  part.flag.setAttribute("transform", translateAlong(P, [state.flagX, 0, 0]));
  part.stop.setAttribute("transform", translateAlong(P, [0, state.stopY, 0]));
  part.ram.setAttribute("transform", translateAlong(P, [0, 0, -state.ramZ]));
  part.pusher.setAttribute("transform", translateAlong(P, [state.pusherX, 0, 0]));
  for (const bar of state.bars) {
    if (bar === state.carried) continue;
    bar.el.setAttribute("transform", translateAlong(P, [bar.x, BAR_BACK, bar.z]));
  }
  if (state.carried) {
    state.carried.el.setAttribute("transform", translateAlong(P, [hx, BAR_BACK, state.padZ - BAR_H]));
  }
}

function makeBar(len, x, z) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
  el.setAttribute("class", "iso-bar");
  el.innerHTML = barSvg(len);
  part.bars.appendChild(el);
  el.setAttribute("transform", translateAlong(P, [x, BAR_BACK, z]));
  return el;
}

// ---------------------------------------------------------------- easing
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
let running = [];
let last = 0;

function tween(duration, apply, ease = easeInOut) {
  return new Promise((resolve) => {
    if (duration <= 0) {
      apply(1);
      resolve();
      return;
    }
    running.push({ t: 0, duration, apply, ease, resolve });
  });
}
const wait = (duration) => new Promise((resolve) => setTimeout(resolve, ms(duration)));

function frame(now) {
  const dt = last ? Math.min(now - last, 64) : 16;
  last = now;
  for (const item of [...running]) {
    item.t += dt;
    const p = Math.min(1, item.t / item.duration);
    item.apply(item.ease(p));
    if (p >= 1) item.resolve();
  }
  running = running.filter((item) => item.t < item.duration);
  draw();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- motion
async function moveHead(x, duration) {
  const from = state.headX;
  await tween(duration, (p) => (state.headX = from + (x - from) * p));
}
async function padTo(z, duration) {
  const from = state.padZ;
  await tween(duration, (p) => (state.padZ = from + (z - from) * p));
}
async function flagTo(x, duration) {
  const from = state.flagX;
  await tween(duration, (p) => (state.flagX = from + (x - from) * p));
}
async function rodTo(ext, duration) {
  const from = state.rodExt;
  await tween(duration, (p) => (state.rodExt = from + (ext - from) * p));
}
async function stopTo(y, duration) {
  const from = state.stopY;
  await tween(duration, (p) => (state.stopY = from + (y - from) * p), easeOut);
}
async function ramTo(depth, duration) {
  const from = state.ramZ;
  await tween(duration, (p) => (state.ramZ = from + (depth - from) * p), easeOut);
}
async function pusherTo(x, duration) {
  const from = state.pusherX;
  await tween(duration, (p) => (state.pusherX = from + (x - from) * p));
}

// ---------------------------------------------------------------- the machine's cycle
function layoutRow(duration = 220) {
  const bars = state.bars.slice();
  const from = bars.map((bar) => bar.x);
  return tween(duration, (p) => {
    bars.forEach((bar, index) => {
      bar.x = from[index] + (SLOTX[index] - from[index]) * p;
    });
  });
}

async function cut(len) {
  await stopTo(BAR_BACK + len, ms(300));
  await ramTo(11, ms(200));
  const fresh = { el: makeBar(len, SHEAR_X, BED_TOP), x: SHEAR_X, z: BED_TOP, len };
  await ramTo(0, ms(200));
  return fresh;
}

async function collect(fresh) {
  await moveHead(fresh.x, ms(220));
  await padTo(GRIP_Z, ms(160));
  state.carried = fresh;
  await padTo(CARRIED, ms(180));
}

async function place(fresh, index) {
  const target = SLOTX[index];
  await pusherTo(target + 12, ms(130));
  await moveHead(target, ms(260));
  await padTo(GRIP_Z, ms(150));
  state.carried = null;
  fresh.x = target;
  fresh.z = BED_TOP;
  await padTo(CARRIED, ms(140));
  await pusherTo(target + 6, ms(150));
}

async function scan() {
  let best = null;
  for (const bar of state.bars) {
    await moveHead(bar.x, ms(55));
    await rodTo(Math.max(2, bar.len - 3.6), ms(70));
    if (!best || bar.len < best.len) {
      best = bar;
      await flagTo(bar.x, ms(90));
    }
    await rodTo(0, ms(50));
  }
  return best;
}

async function take(bar) {
  await flagTo(bar.x, ms(150));
  await moveHead(bar.x, ms(200));
  await padTo(GRIP_Z, ms(180));
  state.carried = bar;
  state.bars = state.bars.filter((item) => item !== bar);
  await padTo(CARRIED, ms(200));
  await moveHead(BIN_X, ms(480));
  await padTo(GRIP_Z + 4, ms(180));
  state.carried = null;
  const home = { x: -144 + ((state.spent % 3) * 10), y: -50 + (Math.floor(state.spent / 3) % 2) * 14, z: TOP_Z + 3 + Math.min(3, Math.floor(state.spent / 6)) * 5 };
  const from = { x: bar.x, z: GRIP_Z + 4 - BAR_H };
  await tween(ms(200), (p) => {
    bar.el.setAttribute("transform", translateAlong(P, [from.x + (home.x - from.x) * p, BAR_BACK, from.z + (home.z - from.z) * p]));
  });
  bar.el.setAttribute("data-spent", "");
  state.spent += 1;
  await padTo(PAD_REST, ms(160));
}

async function stepOnce() {
  if (state.busy || state.solved || !state.search) return;
  if (state.search.open.length >= CAP) {
    state.jammed = true;
    report(RULE_LIST[state.rule].name + " · 已扩展 " + state.search.expanded + " · 边界 " + state.search.open.length + " · 料台已满");
    return;
  }
  state.busy = true;
  const newest = state.bars[state.bars.length - 1];
  const target = RULE_LIST[state.rule].id === "stack" ? newest : await scan();
  if (RULE_LIST[state.rule].id === "stack" && target) await flagTo(target.x, ms(220));
  const result = state.search.step();
  if (result.popped) state.last = { g: result.popped.g, h: result.popped.h, id: RULE_LIST[state.rule].id };
  if (result.solved) {
    state.busy = false;
    state.solved = true;
    await moveHead(target.x, ms(240));
    await padTo(GRIP_Z, ms(180));
    await flagTo(target.x, ms(120));
    state.carried = target;
    state.bars = state.bars.filter((item) => item !== target);
    await padTo(42, ms(500));
    state.carried = null;
    target.z = 42 - BAR_H;
    target.el.setAttribute("transform", translateAlong(P, [target.x, BAR_BACK, target.z]));
    report("到达目标 · 路径 " + (result.solved.path.length - 1) + " 步 · 扩展 " + result.solved.expanded + " 次");
    return;
  }
  await take(target);
  await layoutRow();
  for (const node of result.added) {
    const len = barLen(node);
    const fresh = await cut(len);
    const index = state.bars.length;
    state.bars.push({ el: fresh.el, x: fresh.x, z: BED_TOP, len });
    await collect(fresh);
    await place(fresh, index);
  }
  state.busy = false;
  report();
}

// ---------------------------------------------------------------- readout
function report(extra) {
  const open = state.search ? state.search.open.length : 0;
  const picked = state.last
    ? state.last.id === "astar"
      ? "刚取 f " + (state.last.g + state.last.h) + "（g " + state.last.g + " + h " + state.last.h + "）"
      : state.last.id === "queue"
        ? "刚取 g " + state.last.g
        : "刚取深度 " + state.last.g
    : "等待第一步";
  const narrow = matchMedia("(max-width: 640px)").matches;
  const text =
    extra ||
    RULE_LIST[state.rule].name + " · 扩展 " + (state.search ? state.search.expanded : 0) + " · 边界 " + open + (narrow ? "" : " · " + picked);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

function drawKnob() {
  if (!part.pointer) return;
  const angle = KNOB.from + state.rule * KNOB.step;
  part.pointer.setAttribute(
    "d",
    lineOnTop(
      [KNOB.x + Math.sin(angle) * 3, KNOB.y - Math.cos(angle) * 3],
      [KNOB.x + Math.sin(angle) * 8, KNOB.y - Math.cos(angle) * 8],
      TOP_Z + 10.4,
      P,
    ),
  );
}

// ---------------------------------------------------------------- life of a run
function reset(runTour) {
  state.run += 1;
  for (const bar of state.bars) bar.el.remove();
  state.bars = [];
  state.carried = null;
  state.spent = 0;
  state.solved = false;
  state.jammed = false;
  state.busy = false;
  state.tour = Boolean(runTour);
  state.search = createSearch({ start: LAY.start, rule: RULE_LIST[state.rule].id, cap: 1200 });
  state.flagX = SLOTX[0];
  state.pusherX = SLOTX[0] + 6;
  state.headX = SHEAR_X;
  state.padZ = PAD_REST;
  state.rodExt = 0;
  state.last = null;
  state.stopY = BAR_BACK + 8;
  const root = state.search.open[0];
  const len = barLen(root);
  state.bars.push({ el: makeBar(len, SLOTX[0], BED_TOP), x: SLOTX[0], z: BED_TOP, len });
  state.pusherX = SLOTX[0] + 6;
  report();
  draw();
  if (state.tour) {
    const run = state.run;
    tour(run);
  }
}

async function tour(run) {
  await wait(900);
  let steps = 0;
  while (state.run === run && state.tour && !state.solved && !state.jammed && steps < 16) {
    await stepOnce();
    steps += 1;
    await wait(500);
  }
  if (state.run !== run || !state.tour) return;
  await wait(4200);
  if (state.run === run && state.tour) setRule((state.rule + 1) % RULE_LIST.length, true);
}

function setRule(index, keepTour) {
  state.rule = index;
  drawKnob();
  reset(keepTour);
}

function wake() {
  state.tour = false;
  state.run += 1;
}

// ---------------------------------------------------------------- input
for (const hot of svg.querySelectorAll("[data-rule]")) {
  hot.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    wake();
    setRule(Number(hot.getAttribute("data-rule")), false);
  });
}
const knobHot = svg.querySelector('[data-hot="knob"]');
if (knobHot) {
  knobHot.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    wake();
    setRule((state.rule + 1) % RULE_LIST.length, false);
  });
}
const stepHot = svg.querySelector('[data-hot="step"]');
if (stepHot) {
  stepHot.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!state.busy) {
      state.tour = false;
      stepOnce();
    }
  });
}
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    state.tour = false;
    stepOnce();
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    state.tour = false;
    reset(false);
  } else if (/^[1-3]$/.test(event.key)) {
    event.preventDefault();
    state.tour = false;
    setRule(Number(event.key) - 1, false);
  }
});

drawKnob();
reset(true);
requestAnimationFrame(frame);
