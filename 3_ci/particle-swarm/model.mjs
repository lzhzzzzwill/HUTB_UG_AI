// The true model behind the figure: a fitness field and a gbest particle swarm.
// The build script draws the contour terraces from it, and the page runs the
// same code, so every number in the readout and every height on the table is
// measured from here.

/** The plotting field, in world units (x right, y toward the viewer). */
export const FIELD = { x0: -196, y0: -110, x1: 104, y1: 102 };

/** Height of the board the contour model is built on. */
export const FIELD_Z = 8;

/** One contour terrace. Nine terraces make the relief. */
export const LAYER_H = 2.3;

/** Normalised fitness levels that carry a terrace (every 0.08, index contours every 4th). */
export const LEVELS = [0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86, 0.94];

/** Three hills: the broad main one, a secondary one near the front, a small one behind. */
export const BUMPS = [
  { a: 1.0, cx: -70, cy: -18, sx: 56, sy: 50 },
  { a: 0.72, cx: 36, cy: 34, sx: 40, sy: 30 },
  { a: 0.45, cx: -6, cy: -76, sx: 34, sy: 28 },
];

/** Sum of Gaussians, before normalisation. */
export function rawFitness(x, y) {
  let sum = 0;
  for (const bump of BUMPS) {
    const dx = (x - bump.cx) / bump.sx;
    const dy = (y - bump.cy) / bump.sy;
    sum += bump.a * Math.exp(-0.5 * (dx * dx + dy * dy));
  }
  return sum;
}

/** The field's own maximum, so fitness is reported in 0..1. */
export const PEAK = (() => {
  let best = 0;
  for (let x = FIELD.x0; x <= FIELD.x1; x += 0.5) {
    for (let y = FIELD.y0; y <= FIELD.y1; y += 0.5) best = Math.max(best, rawFitness(x, y));
  }
  return best;
})();

export const fitness = (x, y) => rawFitness(x, y) / PEAK;

/** How many terraces a point at this fitness stands on (0 = the bare board). */
export function terraceCount(f) {
  let count = 0;
  while (count < LEVELS.length && f >= LEVELS[count]) count++;
  return count;
}

/** The height of the contour model's surface there: the terraces are stepped. */
export const surfaceZ = (f) => FIELD_Z + LAYER_H * terraceCount(f);

export const SWARM = {
  count: 6,
  c1: 1.49618,
  c2: 1.49618,
  vmax: 34,
  omega: 0.73,
  inset: 18,
  /** Seconds of wall clock between two iterations of the displayed run. */
  dt: 0.62,
  /** Maximum iterations before the table is re-seeded. */
  life: 30,
  /** Iterations without an improvement in the group best before the run counts as converged. */
  stall: 9,
};

/** Seeds the idle tour cycles through: each starts low and ends near the summit. */
export const SEEDS = [5, 8, 20, 32, 14, 23];

/** A small deterministic generator, so seed n always draws the same swarm. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clampTo = (value, low, high) => Math.min(high, Math.max(low, value));

/** Seed a swarm: random positions, zero-ish initial velocity, pbest at the start. */
export function createSwarm(seed) {
  const rand = mulberry32(seed * 2654435761);
  const particles = [];
  for (let index = 0; index < SWARM.count; index++) {
    const x = FIELD.x0 + SWARM.inset + rand() * (FIELD.x1 - FIELD.x0 - SWARM.inset * 2);
    const y = FIELD.y0 + SWARM.inset + rand() * (FIELD.y1 - FIELD.y0 - SWARM.inset * 2);
    particles.push({
      x,
      y,
      vx: (rand() - 0.5) * 16,
      vy: (rand() - 0.5) * 16,
      pbest: { x, y, f: fitness(x, y) },
    });
  }
  let gbest = { ...particles[0].pbest };
  for (const particle of particles) if (particle.pbest.f > gbest.f) gbest = { ...particle.pbest };
  return { seed, rand, particles, gbest, iter: 0, stall: 0, history: [gbest.f] };
}

/** One simultaneous PSO update: inertia + cognitive + social, then measure. */
export function stepSwarm(swarm, omega) {
  for (const particle of swarm.particles) {
    const r1 = swarm.rand();
    const r2 = swarm.rand();
    particle.vx =
      omega * particle.vx + SWARM.c1 * r1 * (particle.pbest.x - particle.x) + SWARM.c2 * r2 * (swarm.gbest.x - particle.x);
    particle.vy =
      omega * particle.vy + SWARM.c1 * r1 * (particle.pbest.y - particle.y) + SWARM.c2 * r2 * (swarm.gbest.y - particle.y);
    const speed = Math.hypot(particle.vx, particle.vy);
    if (speed > SWARM.vmax) {
      particle.vx *= SWARM.vmax / speed;
      particle.vy *= SWARM.vmax / speed;
    }
    particle.x = clampTo(particle.x + particle.vx, FIELD.x0 + 5, FIELD.x1 - 5);
    particle.y = clampTo(particle.y + particle.vy, FIELD.y0 + 5, FIELD.y1 - 5);
    // The pucks bounce off the field's walls.
    if (particle.x <= FIELD.x0 + 5.01 || particle.x >= FIELD.x1 - 5.01) particle.vx *= -0.45;
    if (particle.y <= FIELD.y0 + 5.01 || particle.y >= FIELD.y1 - 5.01) particle.vy *= -0.45;
    const f = fitness(particle.x, particle.y);
    if (f > particle.pbest.f) particle.pbest = { x: particle.x, y: particle.y, f };
    if (f > swarm.gbest.f + 1e-4) {
      swarm.gbest = { x: particle.x, y: particle.y, f };
      swarm.stall = 0;
    }
  }
  swarm.iter += 1;
  swarm.stall += 1;
  swarm.history.push(swarm.gbest.f);
  return swarm;
}

/** How far the swarm still is from its best, in world units. */
export function spreadOf(swarm) {
  let worst = 0;
  for (const particle of swarm.particles) {
    worst = Math.max(worst, Math.hypot(particle.x - swarm.gbest.x, particle.y - swarm.gbest.y));
  }
  return worst;
}

/** True once the best has stopped improving, or the run reaches its life. */
export const converged = (swarm) => swarm.stall >= SWARM.stall || swarm.iter >= SWARM.life;
