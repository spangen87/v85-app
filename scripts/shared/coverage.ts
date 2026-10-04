/**
 * Kalibrering av ett systems täckning per avdelning (lib/optimizer.ts →
 * adjustCoverage): logit(c′) = alpha + beta·logit(c), skattad med maximum
 * likelihood (logistisk regression, Newton) på punkter (förutsagd täckning,
 * gick avdelningen in). Används av scripts/backtest-optimizer.ts.
 */
import type { CoverageCalibration } from "../../lib/calibrated";

const clamp = (c: number) => Math.min(Math.max(c, 1e-4), 1 - 1e-4);
const logit = (p: number) => Math.log(p / (1 - p));

export function fitCoverageCalibration(points: [number, boolean][]): CoverageCalibration {
  let alpha = 0;
  let beta = 1;
  for (let it = 0; it < 50; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    for (const [c, hit] of points) {
      const x = logit(clamp(c));
      const q = 1 / (1 + Math.exp(-(alpha + beta * x)));
      const e = (hit ? 1 : 0) - q;
      const w = q * (1 - q);
      g0 += e; g1 += e * x; h00 += w; h01 += w * x; h11 += w * x * x;
    }
    const det = h00 * h11 - h01 * h01;
    if (!(det > 0)) break;
    const da = (h11 * g0 - h01 * g1) / det;
    const db = (h00 * g1 - h01 * g0) / det;
    alpha += da;
    beta += db;
    if (Math.abs(da) + Math.abs(db) < 1e-10) break;
  }
  return { alpha: Math.round(alpha * 1e4) / 1e4, beta: Math.round(beta * 1e4) / 1e4, n: points.length };
}
