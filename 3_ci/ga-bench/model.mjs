// The truth behind the figure: the notebook's genetic algorithm, run on the real
// Iris data, exactly as 3_ci/3_teach_ci.ipynb does it — 8 individuals, 4-bit
// chromosomes, roulette selection, single-point crossover, per-bit mutation,
// fitness = mean accuracy of a 3-NN over stratified 5-fold, no shuffle, no scaling.
//
// The evaluator and the RNG are the same ones 3_ci/ci_animation.html uses, so the
// numbers here match the animation the course already ships (0.9600 → 0.9733).

export const FEATURES = ["花萼长", "花萼宽", "花瓣长", "花瓣宽"];

const POP = 8;
const BITS = 4;
const GENERATIONS = 6;
const FOLDS = 5;

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Stratified k-fold membership, in the order the notebook's data arrives. */
function foldsOf(data) {
  const classes = data.map((row) => row[row.length - 1]);
  const labels = [...new Set(classes)];
  const fold = new Array(data.length);
  let offset = 0;
  for (const label of labels) {
    const ids = classes.flatMap((c, i) => (c === label ? [i] : []));
    let k = 0;
    for (let f = 0; f < FOLDS; f++) {
      const count = ids.filter((_, j) => (offset + j) % FOLDS === f).length;
      for (let j = 0; j < count; j++) fold[ids[k++]] = f;
    }
    offset += ids.length;
  }
  return fold;
}

/** fitness(chromosome) — 3-nearest-neighbour accuracy, mean over the 5 folds. */
export function evaluator(data) {
  const classes = data.map((row) => row[row.length - 1]);
  const fold = foldsOf(data);
  const cache = new Map();
  return (bits) => {
    const key = bits.join("");
    if (cache.has(key)) return cache.get(key);
    if (!bits.some(Boolean)) return 0;
    const scores = [];
    for (let f = 0; f < FOLDS; f++) {
      let correct = 0;
      let total = 0;
      for (let i = 0; i < data.length; i++) {
        if (fold[i] !== f) continue;
        total++;
        const ds = [];
        for (let j = 0; j < data.length; j++) {
          if (fold[j] === f) continue;
          let d = 0;
          for (let k = 0; k < bits.length; k++) if (bits[k]) d += (data[i][k] - data[j][k]) ** 2;
          ds.push([d, j, classes[j]]);
        }
        ds.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const votes = [0, 0, 0];
        for (const near of ds.slice(0, 3)) votes[near[2]]++;
        correct += +(votes.indexOf(Math.max(...votes)) === classes[i]);
      }
      scores.push(correct / total);
    }
    const score = mean(scores);
    cache.set(key, score);
    return score;
  };
}

const copy = (x) => JSON.parse(JSON.stringify(x));

/**
 * One run, recorded phase by phase. Every value the figure shows comes from here.
 *   initial: { pop, scores, best, bestFit, avg }
 *   steps[]: { gen, picks, probs, afterSelect, pairs[{a,b,cut}], afterCross,
 *              flips[{i,bit,from,to}], afterMutate, scores, best, bestFit, avg, improved }
 */
export function runGA(data, { mutation = 0.15, cross = 0.8, seed = 42 } = {}) {
  const evaluate = evaluator(data);
  let state = seed >>> 0;
  const rand = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const binary = (xs) => {
    const bits = xs.map((v) => +(v > 0.5));
    if (!bits.some(Boolean)) bits[xs.indexOf(Math.max(...xs))] = 1;
    return bits;
  };
  const scoresOf = (p) => p.map((bits) => evaluate(bits));
  const bestOf = (p, s) => {
    let at = 0;
    for (let i = 1; i < p.length; i++) if (s[i] > s[at]) at = i;
    return at;
  };

  let pop = Array.from({ length: POP }, () => binary(Array.from({ length: BITS }, rand)));

  const initialScores = scoresOf(pop);
  const at = bestOf(pop, initialScores);
  let best = pop[at].slice();
  let bestFit = initialScores[at];
  const initial = { pop: copy(pop), scores: initialScores, best: best.slice(), bestFit, avg: mean(initialScores) };

  const steps = [];
  for (let gen = 1; gen <= GENERATIONS; gen++) {
    // selection: roulette wheel, POP draws with replacement
    const scores = scoresOf(pop);
    const sum = scores.reduce((a, b) => a + b, 0);
    const probs = sum > 0 ? scores.map((s) => s / sum) : scores.map(() => 1 / POP);
    const picks = [];
    const afterSelect = Array.from({ length: POP }, () => {
      let r = rand() * sum;
      let i = 0;
      while (i < POP - 1 && r > scores[i]) r -= scores[i++];
      picks.push(i);
      return pop[i].slice();
    });
    pop = afterSelect;

    // crossover: single point, per pair, with probability CROSS_RATE
    const pairs = [];
    for (let i = 0; i < POP; i += 2) {
      const a = pop[i].slice();
      const b = i + 1 < POP ? pop[i + 1].slice() : null;
      if (!b) {
        pairs.push({ a: i, b: -1, cut: null });
        continue;
      }
      if (rand() < cross) {
        const cut = 1 + Math.floor(rand() * (BITS - 1));
        pop[i] = a.slice(0, cut).concat(b.slice(cut));
        pop[i + 1] = b.slice(0, cut).concat(a.slice(cut));
        pairs.push({ a: i, b: i + 1, cut });
      } else {
        pairs.push({ a: i, b: i + 1, cut: null });
      }
    }
    const afterCross = copy(pop);

    // mutation: every bit with probability MUTATION_RATE, then repair an all-zero child
    const flips = [];
    pop = pop.map((bits, i) => {
      const next = bits.map((v, j) => {
        if (rand() < mutation) {
          flips.push({ i, bit: j, from: v, to: 1 - v });
          return 1 - v;
        }
        return v;
      });
      if (!next.some(Boolean)) {
        const j = Math.floor(rand() * BITS);
        flips.push({ i, bit: j, from: next[j], to: 1, repair: true });
        next[j] = 1;
      }
      return next;
    });

    // evaluate, then compare with the historical best (the notebook's replace step)
    const nextScores = scoresOf(pop);
    const bestAt = bestOf(pop, nextScores);
    const improved = nextScores[bestAt] > bestFit;
    if (improved) {
      bestFit = nextScores[bestAt];
      best = pop[bestAt].slice();
    }

    steps.push({
      gen,
      picks,
      probs,
      afterSelect: copy(afterSelect),
      pairs,
      afterCross,
      flips,
      afterMutate: copy(pop),
      scores: nextScores,
      best: best.slice(),
      bestFit,
      avg: mean(nextScores),
      improved,
    });
  }

  return { seed, mutation, cross, initial, steps };
}
