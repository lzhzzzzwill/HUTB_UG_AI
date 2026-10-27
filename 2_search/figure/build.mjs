import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import { kitScript } from "./kit/inline-kit.mjs";
import {
  P,
  WIDTH,
  HEIGHT,
  figureBody,
  makePieces,
  hotspots,
  SLOT_X,
  SLOTS,
  BAR_BACK,
  BED_TOP,
  BAR_H,
  PAD_REST,
  CARRIED,
  BAR_W,
  PAD_Y,
  TOP,
  SHEAR_X,
  KNOB,
} from "./geometry.mjs";
import { START, GOAL, measure, RULES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const stats = Object.fromEntries(RULES.map((rule) => [rule.id, measure(START, rule.id)]));
const hits = hotspots();
const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8");

const hot = (x, y, r, attribute) => `<circle class="iso-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" ${attribute}/>`;
const hotSvg = [
  hot(hits.knob[0], hits.knob[1], 19, 'data-hot="knob"'),
  hot(hits.button[0], hits.button[1], 15, 'data-hot="step"'),
].join("");

const caption =
  "边界台把 8 数码的搜索边界摆上台面：一根料条就是一个还在边界里等着的状态，料条的长短就是它的键。" +
  `切断机按 A* 的 f = g + h 定长（本题的起点离目标 ${stats.astar.path} 步），取料头拿探针量遍料台、只取最短的一根，取走的料条落进左端料仓——那就是闭表。` +
  `同一道题，A* 扩展 ${stats.astar.expanded} 次、${stats.astar.path} 步到达；换成队列（BFS）只按 g 记长，要 ${stats.queue.expanded} 次扩展，边界一度涨到 ${stats.queue.peak} 根，` +
  `料台只有 ${SLOTS} 个槽位，装不下就停；换成栈（DFS）只抽最新的一根，要到 ${stats.stack.expanded} 次扩展才摸到目标，还绕成 ${stats.stack.path} 步。`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Frontier bench · 边界台",
  hint: "旋钮/1 A* · 2 BFS · 3 DFS · 空格或按钮走一步",
  readout: "A* · 扩展 0 · 边界 1 · 台上 1",
  keys: [
    { mark: "lit", label: "目标针与探针：量遍料台，指住最该取的那一根" },
    { mark: "raised", label: "料条：一根是一个待扩展状态，长度就是它的键" },
    { mark: "dim", label: "切断机按 f 定长 · 左端仓是已扩展的闭表" },
    { mark: "dotted", label: "探针量出最短的一根，目标针才落到它上面" },
  ],
  caption,
  body: `<style>.iso-hit{fill:transparent;cursor:pointer}.iso-hit:hover{fill:var(--anatomy-lit);fill-opacity:.12}.iso-bar{pointer-events:none}.iso-stage:focus{outline:none}.iso-stage:focus-visible{outline:2px solid var(--anatomy-mid);outline-offset:6px}@media (max-width:640px){.iso-plate{padding:44px 12px 64px}.iso-plate-corners{inset:14px 12px}.iso-plate-corner[data-corner="readout"]{position:static;display:block;margin-top:6px;white-space:normal;text-align:right}.iso-plate-corner[data-corner="title"]{max-width:52%;white-space:normal;text-align:right}}</style><div class="iso-stage" tabindex="0" role="application" aria-label="边界台：按空格推进一步，按 1 2 3 换规则">${k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "An isometric frontier bench. A shear cuts a steel bar to the length of a state's key and the bar lands on a rack of 28 grooves; a gantry head measures each bar with a feeler and takes the shortest, or the newest, depending on the rule knob, and drops the taken bar into a bin at the left. A pusher closes the row.",
    body: figureBody() + `<g class="iso-hits" aria-hidden="true">${hotSvg}</g>`,
  })}</div>`,
});

const page = k.pageHtml({
  title: "边界台 · Frontier bench",
  theme,
  width: 920,
  body,
  script: `${kitScript()}
addEventListener("error", (event) => { document.title = "ERR " + event.message; const r = document.querySelector("[data-readout]"); if (r) r.textContent = "ERR " + event.message; });
const k = { slabOf, cylinder, solidSvg, lineSvg, dotsSvg, iso, pathOf, lineOnTop, sideArc, ring, knurl, topTicks, planOutline, insetPlan, corners, boxCorners, depthOf, haloOf, extrude, circleRing, translateAlong };
${model}
const LAYOUT = ${JSON.stringify({
    P,
    SLOT_X: Array.from({ length: SLOTS }, (_, index) => SLOT_X(index)),
    SLOTS,
    BAR_BACK,
    BED_TOP,
    BAR_H,
    PAD_REST,
    CARRIED,
    BAR_W,
    PAD_Y,
    TOP,
    SHEAR_X,
    KNOB: { x: KNOB.x, y: KNOB.y, from: KNOB.from, step: KNOB.step },
    rules: RULES,
    start: START,
    goal: GOAL,
    stats,
  })};
const { padSvg, rodSvg, barSvg } = (${makePieces.toString()})(k, LAYOUT);
${live}`,
});

writeFileSync(join(HERE, "..", theme === "light" ? "frontier-bench-light.html" : "frontier-bench.html"), page);
console.log("wrote", theme, JSON.stringify(stats));
