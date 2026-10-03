/**
 * Grundchans — skattning av conditional logit (Bolton & Chapman 1986) med
 * L2-regularisering och L-BFGS, mått och banpar. Används av
 * scripts/fit-fundamental.ts. Rena funktioner, inga beroenden.
 */
import { distCategory, parFallbackKey, parKey, type SpeedTables } from "./features";
import { softmax } from "./model";

export interface TrainingRace {
  /** Standardiserade faktorer: en rad per häst, en kolumn per faktor */
  z: number[][];
  /** Index för vinnaren i z */
  winner: number;
}

export interface Metrics {
  logloss: number;
  pseudo_r2: number;
  top1: number;
  top3: number;
  n: number;
}

export interface SpeedRecord {
  breed: string;
  track: string;
  start_method: string;
  distance: number;
  condition: string | null;
  seconds: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function raceProbs(z: number[][], beta: number[]): number[] {
  return softmax(z.map((row) => dot(row, beta)));
}

/** Negativ log-likelihood för vinnarna + λ‖β‖², med analytisk gradient */
export function objective(
  beta: number[],
  races: TrainingRace[],
  lambda: number
): { f: number; grad: number[] } {
  const k = beta.length;
  let f = 0;
  const grad = new Array<number>(k).fill(0);
  for (const r of races) {
    const p = raceProbs(r.z, beta);
    f -= Math.log(Math.max(p[r.winner], 1e-300));
    for (let j = 0; j < k; j++) {
      let expected = 0;
      for (let i = 0; i < p.length; i++) expected += p[i] * r.z[i][j];
      grad[j] -= r.z[r.winner][j] - expected;
    }
  }
  for (let j = 0; j < k; j++) {
    f += lambda * beta[j] * beta[j];
    grad[j] += 2 * lambda * beta[j];
  }
  return { f, grad };
}

/** L-BFGS med backtracking (Armijo) */
export function lbfgs(
  fg: (x: number[]) => { f: number; grad: number[] },
  x0: number[],
  opts: { m?: number; maxIter?: number; tol?: number } = {}
): number[] {
  const m = opts.m ?? 10;
  const maxIter = opts.maxIter ?? 500;
  const tol = opts.tol ?? 1e-9;
  let x = [...x0];
  let { f, grad: g } = fg(x);
  const S: number[][] = [];
  const Y: number[][] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.sqrt(dot(g, g)) < 1e-8) break;
    // Tvåloopsrekursionen ger riktningen −H·g
    const q = [...g];
    const alphas: number[] = new Array(S.length);
    for (let i = S.length - 1; i >= 0; i--) {
      const a = dot(S[i], q) / dot(Y[i], S[i]);
      alphas[i] = a;
      for (let j = 0; j < q.length; j++) q[j] -= a * Y[i][j];
    }
    const gamma = S.length > 0
      ? dot(S[S.length - 1], Y[Y.length - 1]) / dot(Y[Y.length - 1], Y[Y.length - 1])
      : 1 / Math.max(Math.sqrt(dot(g, g)), 1);
    const r = q.map((v) => v * gamma);
    for (let i = 0; i < S.length; i++) {
      const b = dot(Y[i], r) / dot(Y[i], S[i]);
      for (let j = 0; j < r.length; j++) r[j] += S[i][j] * (alphas[i] - b);
    }
    let d = r.map((v) => -v);
    let dg = dot(d, g);
    if (dg >= 0) {
      d = g.map((v) => -v);
      dg = dot(d, g);
      S.length = 0;
      Y.length = 0;
    }

    let step = 1;
    let xn = x;
    let fn = f;
    let gn = g;
    for (let ls = 0; ls < 50; ls++) {
      xn = x.map((v, i) => v + step * d[i]);
      ({ f: fn, grad: gn } = fg(xn));
      if (fn <= f + 1e-4 * step * dg) break;
      step *= 0.5;
    }

    const s = xn.map((v, i) => v - x[i]);
    const y = gn.map((v, i) => v - g[i]);
    if (dot(s, y) > 1e-12) {
      S.push(s);
      Y.push(y);
      if (S.length > m) {
        S.shift();
        Y.shift();
      }
    }
    const converged = Math.abs(f - fn) <= tol * Math.max(1, Math.abs(f));
    x = xn;
    f = fn;
    g = gn;
    if (converged) break;
  }
  return x;
}

export function fitConditionalLogit(races: TrainingRace[], k: number, lambda: number): number[] {
  return lbfgs((b) => objective(b, races, lambda), new Array<number>(k).fill(0));
}

export function evaluate(probs: number[][], winners: number[]): Metrics {
  const n = probs.length;
  let ll = 0, uniform = 0, top1 = 0, top3 = 0;
  probs.forEach((p, idx) => {
    const w = winners[idx];
    ll += -Math.log(Math.max(p[w], 1e-12));
    uniform += Math.log(p.length);
    const order = p.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i);
    if (order[0] === w) top1++;
    if (order.slice(0, 3).includes(w)) top3++;
  });
  return {
    logloss: ll / n,
    pseudo_r2: 1 - ll / uniform,
    top1: top1 / n,
    top3: top3 / n,
    n,
  };
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Banpar (median ≥ 15 poster) och underlagsjusteringar (median residual ≥ 30 poster) */
export function estimateSpeedTables(records: SpeedRecord[]): SpeedTables {
  const byKey = new Map<string, number[]>();
  const byFallback = new Map<string, number[]>();
  for (const r of records) {
    const cat = distCategory(r.distance);
    const k = parKey(r.breed, r.track, r.start_method, cat);
    const fk = parFallbackKey(r.breed, r.start_method, cat);
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(r.seconds);
    (byFallback.get(fk) ?? byFallback.set(fk, []).get(fk)!).push(r.seconds);
  }
  const par: Record<string, number> = {};
  for (const [k, v] of byKey) if (v.length >= 15) par[k] = median(v);
  const par_fallback: Record<string, number> = {};
  for (const [k, v] of byFallback) if (v.length >= 15) par_fallback[k] = median(v);

  const residuals = new Map<string, number[]>();
  for (const r of records) {
    const cat = distCategory(r.distance);
    const p = par[parKey(r.breed, r.track, r.start_method, cat)] ?? par_fallback[parFallbackKey(r.breed, r.start_method, cat)];
    if (p == null) continue;
    const c = r.condition ?? "";
    (residuals.get(c) ?? residuals.set(c, []).get(c)!).push(r.seconds - p);
  }
  const condition_adj: Record<string, number> = {};
  for (const [c, v] of residuals) if (v.length >= 30) condition_adj[c] = median(v);
  return { par, par_fallback, condition_adj };
}
