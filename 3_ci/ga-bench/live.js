/* GA 育种台 — the live half. Inlined into the page after the kit. */
(() => {
  const P = __P__;
  const T = __TRACE__;
  const K = __KONST__;

  const stage = document.querySelector(".iso-stage");
  const svg = stage.querySelector("svg");
  const readout = document.querySelector("[data-readout]");
  const announcer = document.querySelector("[data-announce]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const DEG = Math.PI / 180;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => {
    const u = clamp01(x);
    return 1 - (1 - u) * (1 - u) * (1 - u);
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const put = (el, html) => {
    if (el && el.__h !== html) {
      el.__h = html;
      el.innerHTML = html;
    }
  };
  const WHEEL = K.WHEEL;
  const TOP = K.BOARD_TOP;
  const cellX = (i) => K.BOARD.x + K.FRAME + (i % 4) * (K.CELL_W + 3);
  const cellY = (i) => K.BOARD.y + K.FRAME + (i >> 2) * (K.CELL_D + 3);
  const cellPlan = (i) => ({ x: cellX(i), y: cellY(i), w: K.CELL_W, d: K.CELL_D, r: 1.6 });
  const scale = P.scale * Math.sqrt(1.6);

  /* ─────────────────────────── the wheel ─────────────────────────── */

  const spinEl = svg.querySelector('[data-part="spin"]');
  const ballEl = svg.querySelector('[data-part="ball"]');
  let edges = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  let spin = 0;
  let ball = WHEEL.front;
  let litSector = -1;
  let wheelKey = "";

  function setShares(scores) {
    const sum = scores.reduce((a, b) => a + b, 0);
    const next = [0];
    let acc = 0;
    for (const s of scores) {
      acc += sum > 0 ? s / sum : 1 / scores.length;
      next.push(acc);
    }
    next[next.length - 1] = 1;
    edges = next;
  }

  function drawWheel() {
    const key = spin.toFixed(2) + "|" + litSector + "|" + edges.map((e) => e.toFixed(4)).join(",");
    if (key === wheelKey) return;
    wheelKey = key;
    const out = [];
    for (let i = 0; i < 8; i++) {
      const a0 = (edges[i] * 360 + spin) * DEG;
      const a1 = (edges[i + 1] * 360 + spin) * DEG;
      const mid = (a0 + a1) / 2;
      const on = i === litSector;
      const c = Math.cos(a0);
      const s = Math.sin(a0);
      const hw = 0.65;
      const ring = [
        [WHEEL.x + c * 12 - s * hw, WHEEL.y + s * 12 + c * hw],
        [WHEEL.x + c * 34 - s * hw, WHEEL.y + s * 34 + c * hw],
        [WHEEL.x + c * 34 + s * hw, WHEEL.y + s * 34 - c * hw],
        [WHEEL.x + c * 12 + s * hw, WHEEL.y + s * 12 - c * hw],
      ];
      out.push(solidSvg(extrude(ring, WHEEL.top, 1.8, P), { tone: on ? "hi" : "mid", crease: "lo" }));
      const [dx, dy] = iso([WHEEL.x + Math.cos(mid) * 29.5, WHEEL.y + Math.sin(mid) * 29.5, WHEEL.top], P);
      out.push(`<circle class="wheel-dot"${on ? ' data-on=""' : ""} cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${on ? 1.7 : 1.05}"/>`);
      if (on) {
        const arc = [];
        const steps = Math.max(3, Math.round((a1 - a0) / DEG / 6));
        for (let j = 0; j <= steps; j++) {
          const a = a0 + (a1 - a0) * (j / steps);
          arc.push([WHEEL.x + Math.cos(a) * 35.4, WHEEL.y + Math.sin(a) * 35.4]);
        }
        out.push(lineSvg(onTop(arc, WHEEL.top + 0.12, P), { tone: "lit" }));
      }
    }
    put(spinEl, out.join(""));
  }

  let lastBall = null;
  function drawBall() {
    if (lastBall !== null && Math.abs(ball - lastBall) < 0.05) return;
    lastBall = ball;
    const x = Math.cos(ball) * 37 - 37;
    const y = Math.sin(ball) * 37;
    ballEl.setAttribute("transform", translateAlong(P, [x, y, 0]));
  }

  /* ─────────────────────────── the board ─────────────────────────── */

  const pinEls = [];
  const barEls = [];
  const cellEls = [];
  for (let i = 0; i < 8; i++) {
    pinEls.push(svg.querySelector('[data-part="pins"][data-i="' + i + '"]'));
    barEls.push(svg.querySelector('[data-part="bar"][data-i="' + i + '"]'));
    cellEls.push(svg.querySelector('[data-part="cell"][data-i="' + i + '"]'));
  }
  const PIN_LOW = 1.5;
  const PIN_HIGH = 5.6;
  const pinP = new Array(32).fill(PIN_LOW);
  let barP = new Array(8).fill(0.6);
  let bestCell = 0;
  let flashCell = -1;

  function drawPins() {
    for (let i = 0; i < 8; i++) {
      const el = pinEls[i];
      const flashing = i === flashCell;
      let changed = flashing !== (el.__on === true);
      for (let b = 0; b < 4; b++) if (Math.abs(pinP[i * 4 + b] - (el["__p" + b] ?? -1)) > 0.02) changed = true;
      if (!changed) continue;
      el.__on = i === flashCell;
      let out = "";
      for (let b = 0; b < 4; b++) {
        const h = pinP[i * 4 + b];
        el["__p" + b] = h;
        out += solidSvg(cylinder(cellX(i) + K.PIN_OFFSETS[b], cellY(i) + 9, 1.7, TOP, h, P, 14, 0.35), { tone: "hi", crease: "lo" });
        out += lineSvg(ring(cellX(i) + K.PIN_OFFSETS[b], cellY(i) + 9, 2.5, TOP, P, 14), { tone: i === flashCell ? "lit" : "lo" });
      }
      put(el, out);
    }
  }

  function drawBars() {
    for (let i = 0; i < 8; i++) {
      const plan = { x: cellX(i) + 3.4, y: cellY(i) + K.CELL_D - 7.2, w: K.CELL_W - 6.8, d: 3.2, r: 0.8 };
      let html = lineSvg(planOutline(plan, TOP + 0.02, P, 3), { tone: "lo" });
      html += solidSvg(slabOf(plan, TOP, Math.max(0.05, barP[i]), P, 3, 0.5), { tone: "mid" });
      html += lineSvg(planOutline(plan, TOP + Math.max(0.05, barP[i]), P, 3), { tone: "hi" });
      put(barEls[i], html);
    }
  }

  function drawCells() {
    for (let i = 0; i < 8; i++) {
      const tone = i === flashCell ? "lit" : i === bestCell ? "hi" : "faint";
      put(cellEls[i], lineSvg(planOutline(insetPlan(cellPlan(i), 0.6), TOP + 0.06, P, 4), { tone }));
    }
  }

  /* ─────────────────────────── the splice bench ─────────────────────────── */

  const stripEls = [svg.querySelector('[data-part="strip"][data-i="0"]'), svg.querySelector('[data-part="strip"][data-i="1"]')];
  stripEls.forEach((el) => (el.innerHTML = '<g data-part="h"></g><g data-part="t"></g>'));
  const STUD_HIGH = 3.4;
  const STUD_LOW = 1.1;

  function drawStrip(i, headBits, tailBits, cut, dy, lift) {
    const el = stripEls[i];
    const y = K.STRIP.y[i];
    const cutX = cut ? K.CUT_X[cut] : K.STRIP.x1;
    let head = solidSvg(slabOf({ x: K.STRIP.x0, y: y - 4, w: cutX - K.STRIP.x0, d: 8, r: 0.8 }, K.STRIP.top, 1.4, P, 3, 0.35), { tone: "hi" });
    headBits.forEach((b, j) => {
      head += solidSvg(cylinder(K.STRIP.studX[j], y, 1.5, K.STRIP.top + 1.4, b ? STUD_HIGH : STUD_LOW, P, 14, 0.3), { tone: "hi", crease: "lo" });
    });
    put(el.querySelector('[data-part="h"]'), head);

    let tail = "";
    if (cut && tailBits.length) {
      tail += solidSvg(slabOf({ x: cutX, y: y - 4, w: K.STRIP.x1 - cutX, d: 8, r: 0.8 }, K.STRIP.top, 1.4, P, 3, 0.35), { tone: "hi" });
      tailBits.forEach((b, j) => {
        tail += solidSvg(cylinder(K.STRIP.studX[cut + j], y, 1.5, K.STRIP.top + 1.4, b ? STUD_HIGH : STUD_LOW, P, 14, 0.3), { tone: "hi", crease: "lo" });
      });
      tail += solidSvg(slabOf({ x: K.STRIP.x1 - 1.5, y: y - 5.4, w: 5.4, d: 10.8, r: 1 }, K.STRIP.top, 3.4, P, 3, 0.4), { tone: "mid" });
    }
    const tailEl = el.querySelector('[data-part="t"]');
    put(tailEl, tail);
    tailEl.setAttribute("transform", dy || lift ? translateAlong(P, [0, dy, lift]) : "");
  }

  const bladeEl = svg.querySelector('[data-part="blade"]');
  (function buildBlade() {
    let out = solidSvg(slabOf({ x: -5, y: K.STRIP.y[0] - 4, w: 10, d: K.STRIP.y[1] - K.STRIP.y[0] + 8, r: 1 }, 34.8, 3, P, 4, 0.5), { tone: "mid", crease: "lo" });
    out += solidSvg(slabOf({ x: -0.45, y: K.STRIP.y[0] - 4, w: 0.9, d: K.STRIP.y[1] - K.STRIP.y[0] + 8, r: 0 }, 22, 12.8, P, 2), { tone: "hi" });
    out += solidSvg(slabOf({ x: -3.2, y: K.STRIP.y[0] - 4, w: 6.4, d: K.STRIP.y[1] - K.STRIP.y[0] + 8, r: 1 }, 33.2, 1.6, P, 2, 0.3), { tone: "lo" });
    bladeEl.innerHTML = out;
  })();

  function drawBlade(x, drop) {
    bladeEl.setAttribute("transform", translateAlong(P, [x, 0, -drop]));
  }

  /* ─────────────────────────── the dial ─────────────────────────── */

  const needleEl = svg.querySelector('[data-part="needle"]');

  /* ─────────────────────────── the recorder ─────────────────────────── */

  const traceEl = svg.querySelector('[data-part="trace"]');
  const beamEl = svg.querySelector('[data-part="beam"]');
  const tapeXY = (gen, fit) => [K.TAPE.x + 12 + gen * 22, K.TAPE.y + 26 - ((fit - 0.94) / 0.045) * 21];
  const tracePoints = [];
  let penGen = 0;
  let penFit = 0;

  (function buildPlotter() {
    let out = "";
    for (const dy of [-3.2, 1.6]) {
      out += solidSvg(slabOf({ x: K.TAPE.x - 1, y: dy, w: K.TAPE.w + 1, d: 1.6, r: 0.6 }, 13.4, 2.4, P, 2, 0.3), { tone: "mid" });
    }
    for (const x of [K.TAPE.x - 1, K.TAPE.x + K.TAPE.w - 2.6]) {
      out += solidSvg(slabOf({ x, y: -3.4, w: 1.6, d: 6.6, r: 0.6 }, 13.4, 2.4, P, 2, 0.3), { tone: "mid" });
    }
    out += '<g data-part="pen">';
    out += solidSvg(slabOf({ x: -4, y: -3.6, w: 8, d: 7.2, r: 1.2 }, 15.8, 3, P, 3, 0.5), { tone: "hi", crease: "lo" });
    out += solidSvg(cylinder(0, 0, 1.9, 15.2, 1.2, P, 20), { tone: "mid" });
    out += solidSvg(cylinder(0, 0, 0.9, 11.4, 4.2, P, 14), { tone: "hi", crease: "none" });
    out += "</g>";
    beamEl.innerHTML = out;
  })();
  const penEl = svg.querySelector('[data-part="pen"]');

  function drawTrace() {
    let d = "";
    if (tracePoints.length > 1) {
      d = onTop(tracePoints.map((p) => tapeXY(p.gen, p.fit)), 11.25, P);
    }
    if (traceEl.__d !== d) {
      traceEl.__d = d;
      traceEl.setAttribute("d", d);
    }
  }
  function drawPen() {
    const [x, y] = tapeXY(penGen, penFit);
    beamEl.setAttribute("transform", translateAlong(P, [0, y, 0]));
    penEl.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  }

  /* ─────────────────────────── state ─────────────────────────── */

  let boardBits = T.initial.pop.map((b) => b.slice());
  let boardScores = T.initial.scores.slice();
  let bestFit = T.initial.bestFit;
  let needleAt = T.initial.bestFit;
  let gen = 0;

  const ACTIONS = [];
  for (const s of T.steps) {
    ACTIONS.push({ kind: "select", step: s }, { kind: "cross", step: s }, { kind: "mutate", step: s }, { kind: "evaluate", step: s });
  }
  let next = 0;
  let action = null;
  let clock = 0;
  let gapUntil = 1.8;

  const barFor = (fit) => 0.8 + Math.max(0, Math.min(1, (fit - 0.9) / 0.1)) * 9.5;

  function say(text, announce) {
    if (readout.textContent !== text) readout.textContent = text;
    if (announce && announcer.textContent !== announce) announcer.textContent = announce;
  }

  function setPinsFrom(bits) {
    for (let i = 0; i < 8; i++) for (let b = 0; b < 4; b++) pinP[i * 4 + b] = bits[i][b] ? PIN_HIGH : PIN_LOW;
  }

  function idleText() {
    const avg = boardScores.reduce((a, b) => a + b, 0) / 8;
    return `第 ${gen} 代 · 最优 ${bestFit.toFixed(4)} · 平均 ${avg.toFixed(4)}`;
  }

  /* ─────────────────────────── actions ─────────────────────────── */

  function startAction(entry) {
    action = entry;
    action.t = 0;
    if (entry.kind === "select") {
      const s = entry.step;
      setShares(boardScores);
      action.per = 1.15 / s.picks.length;
      action.dur = 1.15 + 0.15;
      action.gap = 0.3;
      action.targets = [];
      let from = spin;
      for (const i of s.picks) {
        const c = ((edges[i] + edges[i + 1]) / 2) * 360;
        let target = WHEEL.front - c;
        target += 360 * Math.ceil((from + 260 - target) / 360);
        action.targets.push(target);
        from = target;
      }
      action.balls = s.picks.map((_, p) => WHEEL.front - 360 * (p + 1));
      action.from = spin;
      flashCell = -1;
    } else if (entry.kind === "cross") {
      action.dur = 0.2 + 4 * 0.58;
      action.gap = 0.3;
      action.cutX = 101;
      action.pair = -1;
    } else if (entry.kind === "mutate") {
      action.dur = 0.25 + entry.step.flips.length * 0.3 + 0.2;
      action.gap = 0.3;
      action.done = 0;
    } else {
      action.dur = 1.15;
      action.gap = 1.5;
      action.fromFit = needleAt;
      action.fromBars = barP.slice();
      action.fromPen = [penGen, penFit];
      action.added = false;
    }
  }

  function applySelect(s, t) {
    const n = s.picks.length;
    const p = Math.min(n - 1, Math.floor(t / action.per));
    const u = ease((t - p * action.per) / action.per);
    const from = p === 0 ? action.from : action.targets[p - 1];
    spin = lerp(from, action.targets[p], u);
    ball = lerp(p === 0 ? WHEEL.front : action.balls[p - 1], action.balls[p], u);
    litSector = s.picks[p];
    flashCell = s.picks[p];
    say(`轮盘赌 · 第 ${p + 1}/8 次抽中个体 ${s.picks[p] + 1}`);
  }

  function applyCross(s, t) {
    const q = Math.min(3, Math.max(0, Math.floor((t - 0.2) / 0.58)));
    const u = clamp01((t - 0.2 - q * 0.58) / 0.58);
    const pair = s.pairs[q];
    const bitsA = s.afterSelect[pair.a];
    const bitsB = pair.b >= 0 ? s.afterSelect[pair.b] : null;
    const cut = pair.cut || 0;
    const cutX = cut ? K.CUT_X[cut] : K.STRIP.x1;

    if (action.pair !== q) {
      action.pair = q;
      action.cutX = cut ? cutX : 101;
      litSector = -1;
      flashCell = -1;
      say(`交叉 · 第 ${q + 1}/4 组：个体 ${pair.a + 1} × ${pair.b + 1}${cut ? `，第 ${cut} 位后剪断` : "，本组不交叉"}`);
    }
    if (cut) {
      const bx = u < 0.1 ? action.cutX : lerp(action.cutX, cutX, ease((u - 0.1) / 0.2));
      action.cutX = bx;
      const drop = u < 0.3 ? 0 : u < 0.42 ? ease((u - 0.3) / 0.12) * K.BLADE_DROP : u < 0.48 ? K.BLADE_DROP * (1 - ease((u - 0.42) / 0.06)) : 0;
      drawBlade(bx, drop);
      const w = clamp01((u - 0.46) / 0.38);
      const lift = Math.sin(Math.PI * w);
      drawStrip(0, bitsA.slice(0, cut), bitsB.slice(cut), cut, (K.STRIP.y[1] - K.STRIP.y[0]) * (1 - ease(w)), 15 * lift);
      drawStrip(1, bitsB.slice(0, cut), bitsA.slice(cut), cut, (K.STRIP.y[0] - K.STRIP.y[1]) * (1 - ease(w)), 1.5 * lift);
    } else {
      drawBlade(action.cutX, 0);
      drawStrip(0, bitsA, [], 0, 0, 0);
      drawStrip(1, bitsB || bitsA, [], 0, 0, 0);
    }
    if (u >= 0.86 && !action["done" + q]) {
      action["done" + q] = true;
      for (const child of [pair.a, pair.b]) {
        if (child < 0) continue;
        boardBits[child] = s.afterCross[child].slice();
        for (let b = 0; b < 4; b++) pinP[child * 4 + b] = s.afterCross[child][b] ? PIN_HIGH : PIN_LOW;
        barP[child] = 0.06;
      }
    }
  }

  function applyMutate(s, t) {
    for (let j = 0; j < s.flips.length; j++) {
      const f = s.flips[j];
      const at = 0.25 + j * 0.3;
      if (t < at) continue;
      const u = clamp01((t - at) / 0.24);
      pinP[f.i * 4 + f.bit] = lerp(f.from ? PIN_HIGH : PIN_LOW, f.to ? PIN_HIGH : PIN_LOW, ease(u));
      if (u >= 1) boardBits[f.i][f.bit] = f.to;
      if (u > 0.05 && u < 0.95) {
        flashCell = f.i;
        say(`变异 · 个体 ${f.i + 1} 第 ${f.bit + 1} 位 ${f.from}→${f.to}${f.repair ? "（全零修复）" : ""}`);
      }
    }
    if (!s.flips.length) {
      flashCell = -1;
      say("变异 · 本轮没有位被翻转");
    }
  }

  function applyEvaluate(s, t) {
    const u = ease(clamp01(t / 1.05));
    for (let i = 0; i < 8; i++) barP[i] = lerp(action.fromBars[i], barFor(s.scores[i]), u);
    needleAt = lerp(action.fromFit, s.bestFit, ease(clamp01((t - 0.08) / 0.8)));
    if (t > 0.3 && !action.added) {
      action.added = true;
      tracePoints.push({ gen: s.gen, fit: s.bestFit });
    }
    const w = ease(clamp01((t - 0.22) / 0.75));
    penGen = lerp(action.fromPen[0], s.gen, w);
    penFit = lerp(action.fromPen[1], s.bestFit, w);
    flashCell = -1;
    let top = 0;
    for (let i = 1; i < 8; i++) if (s.scores[i] > s.scores[top]) top = i;
    bestCell = top;
    say(`评价 · 平均 ${s.avg.toFixed(4)} · 最优 ${s.bestFit.toFixed(4)}${s.improved ? " · 历史最优更新" : ""}`);
  }

  function finishAction() {
    const entry = action;
    if (entry.kind === "select") {
      spin = entry.targets[entry.targets.length - 1];
      ball = entry.balls[entry.balls.length - 1];
      flashCell = -1;
      litSector = -1;
    } else if (entry.kind === "cross") {
      for (const pair of entry.step.pairs) {
        for (const child of [pair.a, pair.b]) {
          if (child < 0) continue;
          boardBits[child] = entry.step.afterCross[child].slice();
          for (let b = 0; b < 4; b++) pinP[child * 4 + b] = entry.step.afterCross[child][b] ? PIN_HIGH : PIN_LOW;
          barP[child] = 0.06;
        }
      }
    } else if (entry.kind === "mutate") {
      setPinsFrom(entry.step.afterMutate);
      flashCell = -1;
    } else {
      boardScores = entry.step.scores.slice();
      bestFit = entry.step.bestFit;
      needleAt = entry.step.bestFit;
      barP = entry.step.scores.map(barFor);
      gen = entry.step.gen;
      if (!tracePoints.length || tracePoints[tracePoints.length - 1].gen !== gen) tracePoints.push({ gen, fit: bestFit });
      penGen = gen;
      penFit = bestFit;
      let top = 0;
      for (let i = 1; i < 8; i++) if (boardScores[i] > boardScores[top]) top = i;
      bestCell = top;
    }
    action = null;
    gapUntil = clock + entry.gap;
    say(idleText(), `第 ${gen} 代`);
    stage.setAttribute("aria-valuetext", idleText());
  }

  /* ─────────────────────────── the loop ─────────────────────────── */

  function applyAction() {
    if (!action) return;
    const s = action.step;
    if (action.kind === "select") applySelect(s, action.t);
    else if (action.kind === "cross") applyCross(s, action.t);
    else if (action.kind === "mutate") applyMutate(s, action.t);
    else applyEvaluate(s, action.t);
  }

  function step() {
    if (action) {
      action.t = action.dur;
      applyAction();
      finishAction();
    }
    if (next >= ACTIONS.length) return;
    startAction(ACTIONS[next++]);
  }

  function reset() {
    action = null;
    next = 0;
    gen = 0;
    boardBits = T.initial.pop.map((b) => b.slice());
    boardScores = T.initial.scores.slice();
    bestFit = T.initial.bestFit;
    needleAt = T.initial.bestFit;
    barP = T.initial.scores.map(barFor);
    setPinsFrom(boardBits);
    tracePoints.length = 0;
    tracePoints.push({ gen: 0, fit: T.initial.bestFit });
    penGen = 0;
    penFit = T.initial.bestFit;
    spin = 0;
    ball = WHEEL.front;
    litSector = -1;
    flashCell = -1;
    bestCell = T.initial.scores.indexOf(Math.max(...T.initial.scores));
    setShares(boardScores);
    drawStrip(0, T.initial.pop[0], [], 0, 0, 0);
    drawStrip(1, T.initial.pop[1], [], 0, 0, 0);
    drawBlade(101, 0);
    gapUntil = clock + 1.6;
    redraw();
    say(idleText(), `第 0 代`);
  }

  function redraw() {
    drawWheel();
    drawBall();
    drawPins();
    drawBars();
    drawCells();
    put(needleEl, needleFor(needleAt));
    drawTrace();
    drawPen();
  }

  function needleFor(fit) {
    const lit = action && action.kind === "evaluate";
    const t = Math.max(0, Math.min(1, (fit - 0.9) / 0.1));
    const a = (150 + 300 * t) * DEG;
    const r = K.DIAL.r - 4;
    return lineSvg(
      lineOnTop(
        [K.DIAL.x - Math.cos(a) * 3.4, K.DIAL.y - Math.sin(a) * 3.4],
        [K.DIAL.x + Math.cos(a) * r, K.DIAL.y + Math.sin(a) * r],
        K.DIAL.top + 0.2,
        P,
      ),
      { tone: lit ? "lit" : "hi", free: "start" },
    );
  }

  let visible = true;
  let last = 0;
  let raf = 0;
  let auto = true;
  let idleTimer = 0;

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    if (action) {
      action.t = Math.min(action.dur, action.t + (still.matches ? action.dur : dt));
      applyAction();
      if (action.t >= action.dur) finishAction();
    } else if (auto && !still.matches && next < ACTIONS.length && clock > gapUntil) {
      startAction(ACTIONS[next++]);
    }
    redraw();
    const busy = !!action || (auto && next < ACTIONS.length);
    raf = visible && busy ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  }

  function run() {
    if (!raf && visible) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function takeOver() {
    auto = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      auto = true;
      run();
    }, 12000);
    run();
  }

  let hoverMute = 0;
  stage.addEventListener("pointerdown", () => {
    hoverMute = clock + 2.5;
    takeOver();
    step();
    redraw();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      takeOver();
      step();
      redraw();
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      takeOver();
      reset();
    }
  });

  // hovering a station explains it
  const NOTES = {
    wheel: "轮盘赌：个体被选中的概率 = 适应度 / 总适应度",
    board: "染色体针板：8 个个体 × 4 位；高针 = 1，表示选中该特征",
    stage: "交叉台：在第 k 位后剪断，两条钢带交换尾段",
    dial: "表盘：3-近邻 · 分层五折的平均准确率",
    tape: "记录仪：每代历史最优（纸带 0.94–1.00）",
  };
  const hits = [
    ["wheel", WHEEL.x, WHEEL.y, 50, 20],
    ["board", K.BOARD.x + K.BOARD.w / 2, K.BOARD.y + K.BOARD.d / 2, 84, 30],
    ["stage", 131, 32, 42, 30],
    ["dial", K.DIAL.x, K.DIAL.y, 18, 17],
    ["tape", K.TAPE.x + K.TAPE.w / 2, K.TAPE.y + K.TAPE.d / 2, 84, 20],
  ];
  for (const [name, x, y, r, z] of hits) {
    const [cx, cy] = iso([x, y, z], P);
    const node = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    node.setAttribute("cx", cx.toFixed(1));
    node.setAttribute("cy", cy.toFixed(1));
    node.setAttribute("rx", (r * scale).toFixed(1));
    node.setAttribute("ry", (r * scale * Math.sin(P.elevation * DEG)).toFixed(1));
    node.setAttribute("fill", "transparent");
    node.style.cursor = "pointer";
    node.addEventListener("pointerenter", () => {
      auto = false;
      clearTimeout(idleTimer);
      if (!action && clock > hoverMute && NOTES[name]) say(NOTES[name]);
    });
    node.addEventListener("pointerleave", () => {
      if (!action) say(idleText());
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        auto = true;
        run();
      }, 5000);
    });
    svg.appendChild(node);
  }

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  }, { rootMargin: "120px 0px" }).observe(stage);

  reset();
  if (still.matches) auto = false;
  run();
})();
