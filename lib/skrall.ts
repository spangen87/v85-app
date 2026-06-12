/**
 * Skrällkandidat-signal.
 *
 * Bygger på databasanalys av 155 lopp med facit (2026-06-12):
 *  - Hästar med < 10 % streck vinner ~2× så ofta som streckningen antyder
 *    (5,8 % faktisk vinst mot 2,8 % förväntad, n=687).
 *  - Hästar vars odds-implicerade sannolikhet ligger ≥ 5 procentenheter över
 *    streckningen vinner 16,4 % vid 11,3 % snittstreck (+45 % mot poolen).
 *  - Bland hästar med < 15 % streck vinner de som ligger topp-3 i fältet på
 *    intjänat per start 12,8 % vid 5,9 % snittstreck (2,2× förväntat).
 *
 * En häst flaggas som skrällkandidat när alla tre villkor är uppfyllda.
 * Trösklarna bör valideras om mot data när mer facit samlats in.
 */

export const SKRALL_THRESHOLDS = {
  /** Streckning måste vara under denna gräns (%) */
  maxStreck: 15,
  /** Odds-sannolikhet minus streckning måste överstiga detta (procentenheter) */
  minEdge: 5,
  /** Klassrank (intjänat/start inom fältet) måste vara högst denna */
  maxClassRank: 3,
} as const;

export interface SkrallInput {
  start_number: number;
  bet_distribution: number | null;
  odds: number | null;
  earnings_total: number | null;
  starts_total: number | null;
}

export interface SkrallSignal {
  /** Odds-implicerad vinstsannolikhet, normaliserad inom fältet (%) */
  oddsProbPct: number | null;
  /** oddsProbPct − streckning (procentenheter); positivt = understreckad */
  edge: number | null;
  /** Rank inom fältet på intjänat per start (1 = högst) */
  classRank: number;
  isCandidate: boolean;
}

/**
 * Beräknar skrällsignaler för ett helt startfält. Måste anropas med fältets
 * samtliga hästar — odds-normaliseringen och klassranken är relativa fältet.
 */
export function computeSkrallSignals(starters: SkrallInput[]): SkrallSignal[] {
  // Odds-implicerad sannolikhet: 1/odds normaliserad till att summera 100 %
  const invOdds = starters.map((s) =>
    s.odds != null && s.odds > 0 ? 1 / s.odds : null
  );
  const invSum = invOdds.reduce<number>((sum, v) => sum + (v ?? 0), 0);

  // Klass: intjänat per start, rankad inom fältet (competition ranking)
  const earningsPerStart = starters.map((s) => {
    const startsTotal = Number(s.starts_total) || 0;
    const earnings = Number(s.earnings_total) || 0;
    return startsTotal > 0 ? earnings / startsTotal : 0;
  });

  return starters.map((s, i) => {
    const oddsProbPct =
      invOdds[i] != null && invSum > 0 ? (invOdds[i]! / invSum) * 100 : null;

    const streck = s.bet_distribution;
    const hasStreck = streck != null && streck > 0;
    const edge =
      oddsProbPct != null && hasStreck ? oddsProbPct - streck : null;

    const classRank =
      1 + earningsPerStart.filter((e) => e > earningsPerStart[i]).length;

    const isCandidate =
      hasStreck &&
      streck < SKRALL_THRESHOLDS.maxStreck &&
      edge != null &&
      edge > SKRALL_THRESHOLDS.minEdge &&
      classRank <= SKRALL_THRESHOLDS.maxClassRank;

    return { oddsProbPct, edge, classRank, isCandidate };
  });
}

/** Som computeSkrallSignals, men returnerar en map på startnummer för UI-bruk. */
export function computeSkrallMap(
  starters: SkrallInput[]
): Record<number, SkrallSignal> {
  const signals = computeSkrallSignals(starters);
  return Object.fromEntries(
    starters.map((s, i) => [s.start_number, signals[i]])
  );
}
