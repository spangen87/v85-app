import { fitCoverageCalibration } from "../../scripts/shared/coverage";
import { adjustCoverage } from "../optimizer";

// Syntetiska avdelningar där sann täckning = justerad med kända alpha/beta
function synthetic(alpha: number, beta: number, n: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const c = 0.3 + rnd() * 0.65;
    const truth = adjustCoverage(c, { alpha, beta });
    return [c, rnd() < truth] as [number, boolean];
  });
}

describe("fitCoverageCalibration", () => {
  it("hittar tillbaka alpha och beta", () => {
    const fit = fitCoverageCalibration(synthetic(-0.15, 1.1, 40000));
    expect(fit.alpha).toBeCloseTo(-0.15, 1);
    expect(fit.beta).toBeCloseTo(1.1, 1);
    expect(fit.n).toBe(40000);
  });
  it("kalibrerad data ger ungefär identitet", () => {
    const fit = fitCoverageCalibration(synthetic(0, 1, 40000));
    expect(Math.abs(fit.alpha)).toBeLessThan(0.1);
    expect(Math.abs(fit.beta - 1)).toBeLessThan(0.1);
  });
});
