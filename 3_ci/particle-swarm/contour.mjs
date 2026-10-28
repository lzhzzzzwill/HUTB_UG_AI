// Marching squares on the fitness field: the closed level curves that the
// contour-model terraces are cut from. Build-time only.
import { FIELD, fitness } from "./model.mjs";

const key = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`;

function chop(points, epsilon) {
  // Ramer–Douglas–Peucker on an open polyline.
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const span = Math.hypot(dx, dy) || 1;
  let worst = -1;
  let at = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const [px, py] = points[index];
    const distance = Math.abs(dy * (px - ax) - dx * (py - ay)) / span;
    if (distance > worst) {
      worst = distance;
      at = index;
    }
  }
  if (worst <= epsilon) return [points[0], points[points.length - 1]];
  const left = chop(points.slice(0, at + 1), epsilon);
  const right = chop(points.slice(at), epsilon);
  return [...left.slice(0, -1), ...right];
}

/** Simplify a closed ring: split it at the vertex farthest from the start, then chop both halves. */
function chopRing(ring, epsilon) {
  if (ring.length < 4) return ring;
  const [ax, ay] = ring[0];
  let far = 0;
  let best = -1;
  ring.forEach(([px, py], index) => {
    const distance = Math.hypot(px - ax, py - ay);
    if (distance > best) {
      best = distance;
      far = index;
    }
  });
  if (far < 2) return ring;
  const first = chop(ring.slice(0, far + 1), epsilon).slice(0, -1);
  const second = chop([...ring.slice(far), ring[0]], epsilon).slice(0, -1);
  return [...first, ...second];
}

function resample(ring, spacing) {
  // Even spacing along a closed ring, so terrace walls get sane facets.
  const lengths = [0];
  for (let index = 1; index <= ring.length; index++) {
    const [ax, ay] = ring[index - 1];
    const [bx, by] = ring[index % ring.length];
    lengths.push(lengths[index - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = lengths[lengths.length - 1];
  if (total < spacing * 3) return ring;
  const count = Math.max(10, Math.round(total / spacing));
  const out = [];
  let at = 0;
  for (let step = 0; step < count; step++) {
    const want = (step / count) * total;
    while (at < ring.length - 1 && lengths[at + 1] < want) at++;
    const [ax, ay] = ring[at];
    const [bx, by] = ring[(at + 1) % ring.length];
    const span = lengths[at + 1] - lengths[at] || 1;
    const t = Math.min(1, Math.max(0, (want - lengths[at]) / span));
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return out;
}

/**
 * Closed rings of `fitness(x, y) >= level` inside FIELD.
 * Returns arrays of [x, y] world points, resampled to `spacing` units.
 */

/** Walk along the field's border (parametric around the rectangle). */
function borderWalk(from, to, forward) {
  const { x0, y0, x1, y1 } = FIELD;
  const W = x1 - x0;
  const H = y1 - y0;
  const total = 2 * (W + H);
  const at = (t) => {
    const u = ((t % total) + total) % total;
    if (u <= W) return [x0 + u, y1];
    if (u <= W + H) return [x1, y1 - (u - W)];
    if (u <= 2 * W + H) return [x1 - (u - W - H), y0];
    return [x0, y0 + (u - 2 * W - H)];
  };
  const param = ([x, y]) => {
    if (Math.abs(y - y1) < 1e-6) return x - x0;
    if (Math.abs(x - x1) < 1e-6) return W + (y1 - y);
    if (Math.abs(y - y0) < 1e-6) return W + H + (x1 - x);
    return 2 * W + H + (y - y0);
  };
  const start = param(from);
  const span = forward ? (param(to) - start + total) % total : (start - param(to) + total) % total;
  const steps = Math.max(2, Math.ceil(span / 4));
  const points = [];
  for (let step = 0; step <= steps; step++) points.push(at(start + (forward ? 1 : -1) * span * (step / steps)));
  return points;
}

/** Close a contour that leaves the field by walking the border that lies inside the region. */
function closeOnBorder(chain, level) {
  const from = chain[chain.length - 1];
  const to = chain[0];
  const forward = borderWalk(from, to, true);
  const backward = borderWalk(from, to, false);
  const inside = (walk) => {
    let score = 0;
    for (const share of [0.3, 0.5, 0.7]) {
      const point = walk[Math.round(share * (walk.length - 1))];
      if (fitness(point[0], point[1]) >= level) score++;
    }
    return score;
  };
  const walk = inside(backward) > inside(forward) ? backward : forward;
  return [...chain, ...walk.slice(1, -1)];
}

export function contourRings(level, { step = 1.6, spacing = 5, epsilon = 0.55 } = {}) {
  const { x0, y0, x1, y1 } = FIELD;
  const nx = Math.round((x1 - x0) / step);
  const ny = Math.round((y1 - y0) / step);
  const sx = (x1 - x0) / nx;
  const sy = (y1 - y0) / ny;
  const grid = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) row.push(fitness(x0 + i * sx, y0 + j * sy));
    grid.push(row);
  }

  const segments = [];
  const cut = (ax, ay, bx, by, va, vb) => [ax + (bx - ax) * ((level - va) / (vb - va)), ay + (by - ay) * ((level - va) / (vb - va))];

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const ax = x0 + i * sx;
      const ay = y0 + j * sy;
      const v0 = grid[j][i];
      const v1 = grid[j][i + 1];
      const v2 = grid[j + 1][i + 1];
      const v3 = grid[j + 1][i];
      const mask = (v0 >= level ? 1 : 0) | (v1 >= level ? 2 : 0) | (v2 >= level ? 4 : 0) | (v3 >= level ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      const bottom = () => cut(ax, ay, ax + sx, ay, v0, v1); // v0 - v1
      const right = () => cut(ax + sx, ay, ax + sx, ay + sy, v1, v2); // v1 - v2
      const top = () => cut(ax, ay + sy, ax + sx, ay + sy, v3, v2); // v3 - v2
      const left = () => cut(ax, ay, ax, ay + sy, v0, v3); // v0 - v3
      const pairs = [];
      switch (mask) {
        case 1:
        case 14:
          pairs.push([bottom(), left()]);
          break;
        case 2:
        case 13:
          pairs.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          pairs.push([right(), left()]);
          break;
        case 4:
        case 11:
          pairs.push([right(), top()]);
          break;
        case 6:
        case 9:
          pairs.push([bottom(), top()]);
          break;
        case 7:
        case 8:
          pairs.push([top(), left()]);
          break;
        case 5: {
          const centre = (v0 + v1 + v2 + v3) / 4 >= level;
          if (centre) pairs.push([bottom(), right()], [top(), left()]);
          else pairs.push([bottom(), left()], [right(), top()]);
          break;
        }
        case 10: {
          const centre = (v0 + v1 + v2 + v3) / 4 >= level;
          if (centre) pairs.push([bottom(), left()], [right(), top()]);
          else pairs.push([bottom(), right()], [top(), left()]);
          break;
        }
        default:
          break;
      }
      for (const [a, b] of pairs) segments.push([a, b]);
    }
  }

  // Join segments into chains by shared endpoints.
  const at = new Map();
  segments.forEach((segment, index) => {
    for (const point of segment) {
      const tag = key(point[0], point[1]);
      if (!at.has(tag)) at.set(tag, []);
      at.get(tag).push(index);
    }
  });
  const used = new Array(segments.length).fill(false);
  const chains = [];
  const other = (segment, point) => (key(segment[0][0], segment[0][1]) === key(point[0], point[1]) ? segment[1] : segment[0]);
  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue;
    used[start] = true;
    const chain = [segments[start][0], segments[start][1]];
    for (let grow = 0; grow < 2; grow++) {
      for (;;) {
        const end = grow === 0 ? chain[chain.length - 1] : chain[0];
        const tags = at.get(key(end[0], end[1])) || [];
        const next = tags.find((index) => !used[index]);
        if (next === undefined) break;
        used[next] = true;
        const point = other(segments[next], end);
        if (grow === 0) chain.push(point);
        else chain.unshift(point);
      }
    }
    chains.push(chain);
  }

  const rings = [];
  const open = [];
  for (const chain of chains) {
    const closed = key(chain[0][0], chain[0][1]) === key(chain[chain.length - 1][0], chain[chain.length - 1][1]);
    let body = chain.slice(0, -1);
    if (!closed) {
      // The level curve runs off the field: finish it along the border that is inside the region.
      if (chain.length < 3) continue;
      body = closeOnBorder(chain, level).slice(0, -1);
      open.push(body);
    }
    const simplified = chopRing(body, epsilon);
    rings.push(resample(simplified, spacing));
  }
  return { rings, open };
}
