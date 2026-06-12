/**
 * Kalibrerad vinstsannolikhet.
 *
 * Marknadsodds och spelarnas streckning är båda brus-behäftade skattningar av
 * en hästs verkliga vinstchans. Databasanalys av 221 lopp med facit
 * (2026-06-13) visar att en jämn blandning av de två är bättre kalibrerad än
 * endera ensam:
 *
 *   log-loss   α=0.5 (blend)   1.5795   ← bäst
 *              α=1.0 (streck)  1.6194
 *              α=0.0 (odds)    1.6216
 *
 * Kurvan är flack mellan α=0.4 och 0.6, så 0.5 är ett robust val. Sanningen
 * ligger alltså mitt emellan poolen och oddsmarknaden — och differensen mot
 * streckningen är just den "spelvärde"-signal som driver skrällkandidaterna.
 *
 * Kör om kalibreringen (scripts/backtest-weights.ts visar metodiken) när mer
 * data samlats in.
 */

/** Vikt på streckningen i blandningen; (1 − α) läggs på oddsmarknaden. */
export const BLEND_ALPHA = 0.5;

export interface ProbabilityInput {
  odds: number | null;
  bet_distribution: number | null;
}

export interface WinProbability {
  /** Kalibrerad vinstsannolikhet 0–1, normaliserad så fältet summerar till 1 */
  p: number;
  /** Streckningens implicita sannolikhet 0–1 (poolens röst), eller null */
  streckProb: number | null;
  /** Oddsmarknadens implicita sannolikhet 0–1, eller null */
  oddsProb: number | null;
  /** Vilka signaler som faktiskt fanns för hästen */
  source: "blend" | "streck" | "odds" | "uniform";
}

function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  return values.map((v) => v / sum);
}

/**
 * Beräknar kalibrerad vinstsannolikhet för ett helt startfält.
 *
 * Måste anropas med fältets samtliga hästar — normaliseringen är relativ
 * fältet. Streckning och odds normaliseras var för sig till fördelningar som
 * summerar till 1, blandas per häst och normaliseras till slut så att hela
 * fältet summerar till 1 (robust även när enstaka hästar saknar odds/streck).
 */
export function computeWinProbabilities(
  starters: ProbabilityInput[]
): WinProbability[] {
  const n = starters.length;
  if (n === 0) return [];

  const streckProbs = normalize(
    starters.map((s) => (s.bet_distribution != null && s.bet_distribution > 0 ? s.bet_distribution : 0))
  );
  const oddsProbs = normalize(
    starters.map((s) => (s.odds != null && s.odds > 0 ? 1 / s.odds : 0))
  );

  const hasStreck = streckProbs.some((v) => v > 0);
  const hasOdds = oddsProbs.some((v) => v > 0);

  // Råblandning per häst — hanterar att enstaka hästar saknar en signal
  const raw = starters.map((_, i) => {
    const sv = hasStreck ? streckProbs[i] : null;
    const ov = hasOdds ? oddsProbs[i] : null;
    if (sv != null && ov != null) return BLEND_ALPHA * sv + (1 - BLEND_ALPHA) * ov;
    if (sv != null) return sv;
    if (ov != null) return ov;
    return 0;
  });

  const anyData = hasStreck || hasOdds;
  const p = anyData && raw.some((v) => v > 0) ? normalize(raw) : starters.map(() => 1 / n);

  return starters.map((s, i) => {
    const streckProb = hasStreck && s.bet_distribution != null && s.bet_distribution > 0 ? streckProbs[i] : null;
    const oddsProb = hasOdds && s.odds != null && s.odds > 0 ? oddsProbs[i] : null;
    let source: WinProbability["source"];
    if (!anyData) source = "uniform";
    else if (streckProb != null && oddsProb != null) source = "blend";
    else if (streckProb != null) source = "streck";
    else if (oddsProb != null) source = "odds";
    else source = "uniform";
    return { p: p[i], streckProb, oddsProb, source };
  });
}
