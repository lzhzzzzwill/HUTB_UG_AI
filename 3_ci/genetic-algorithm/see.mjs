// Rasterise the built SVG's line work to ASCII, honouring the translate()s on groups,
// so the drawing can be inspected without an image viewer.
//   node see.mjs page.html [cellPx] [x0,y0,x1,y1] [all|hi|mid|lo|faint]
import { readFileSync } from "node:fs";

const file = process.argv[2];
const cell = Number(process.argv[3] || 3);
const crop = process.argv[4] && process.argv[4] !== "-" ? process.argv[4].split(",").map(Number) : null;
const want = process.argv[5] || "all";
const html = readFileSync(file, "utf8");
const start = html.indexOf("<svg");
const svg = html.slice(start, html.indexOf("</svg>") + 6);

const polys = [];
const dots = [];
const stack = [];
let tx = 0, ty = 0;
const num = (s) => {
  const m = s.match(/-?\d+(\.\d+)?/g);
  return m ? m.map(Number) : [];
};
const tok = /<g\b([^>]*)>|<\/g>|<path\b([^>]*)>|<circle\b([^>]*)>|<text\b([^>]*)>([^<]*)<\/text>|<\/svg>/g;
let m;
while ((m = tok.exec(svg))) {
  if (m[0].startsWith("</g")) {
    const t = stack.pop();
    if (t) { tx -= t[0]; ty -= t[1]; }
    continue;
  }
  if (m[0].startsWith("</svg")) break;
  if (m[1] !== undefined) {
    const tr = m[1].match(/translate\(([^)]*)\)/);
    const t = tr ? num(tr[1]) : [0, 0];
    stack.push(t);
    tx += t[0] || 0;
    ty += t[1] || 0;
    continue;
  }
  if (m[2] !== undefined) {
    const a = m[2];
    const cls = (a.match(/class="([^"]*)"/) || [, ""])[1];
    const tone = (a.match(/data-tone="([^"]*)"/) || [, ""])[1];
    const d = (a.match(/\sd="([^"]*)"/) || [, ""])[1];
    if (!d) continue;
    const edge = /iso-line|iso-edge|iso-crease|iso-bevel/.test(cls);
    const fillish = /iso-fill|iso-top|iso-shade/.test(cls);
    if (!edge) continue;
    if (want !== "all" && edge && tone !== want) continue;
    const pts = [];
    for (const t of d.match(/[MLZ][^MLZ]*/g) || []) {
      const cmd = t[0];
      const ns = num(t.slice(1));
      if (cmd === "Z") { if (pts.length) pts.push(pts[0]); continue; }
      for (let i = 0; i + 1 < ns.length; i += 2) pts.push([ns[i] + tx, ns[i + 1] + ty]);
    }
    if (pts.length > 1) polys.push({ pts, edge, tone });
    continue;
  }
  if (m[3] !== undefined) {
    const ns = num(m[3]);
    const cx = (m[3].match(/cx="([^"]*)"/) || [, 0])[1];
    const cy = (m[3].match(/cy="([^"]*)"/) || [, 0])[1];
    dots.push([Number(cx) + tx, Number(cy) + ty]);
    continue;
  }
}

const x0 = crop ? crop[0] : 0, y0 = crop ? crop[1] : 0, x1 = crop ? crop[2] : 690, y1 = crop ? crop[3] : 452;
const cols = Math.ceil((x1 - x0) / cell);
const rows = Math.ceil((y1 - y0) / cell);
const grid = Array.from({ length: rows }, () => new Array(cols).fill(" "));
const order = " .:-=+*#%@";
const rankOf = (tone) => ({ faint: 2, lo: 4, mid: 6, hi: 8, lit: 9 }[tone] ?? 5);
const put = (x, y, rank) => {
  const c = Math.floor((x - x0) / cell), r = Math.floor((y - y0) / cell);
  if (r < 0 || c < 0 || r >= rows || c >= cols) return;
  const idx = order.indexOf(grid[r][c]);
  if (idx < rank) grid[r][c] = order[rank];
};
for (const p of polys) {
  const rank = p.edge ? rankOf(p.tone) : 0;
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1];
    const [bx, by] = p.pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (cell * 0.5)));
    for (let k = 0; k <= n; k++) put(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, rank);
  }
}
for (const [x, y] of dots) put(x, y, 9);
console.log(`# ${file} cell ${cell}px  ${x0},${y0}..${x1},${y1}  edges ${polys.filter((p) => p.edge).length}  dots ${dots.length}`);
for (let r = 0; r < rows; r++) console.log(grid[r].join(""));
