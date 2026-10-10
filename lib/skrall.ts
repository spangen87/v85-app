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
 *
 * Validerat 2026-10-04 på 3 685 V-spelslopp (ATG, sep 2025–sep 2026, slutodds
 * och slutstreck) i tre kronologiska perioder: 165 kandidater, snitt 9,1 %
 * streck, vann 16,4 % (1,6× / 1,8× / 2,5× per period). En bredare variant
 * (kalibrerad odds+streck ≥ 1,3× streck och ≥ 8 %) gav 5× fler kandidater men
 * höll inte i valideringsperioden (1,0×) — behåll den smala regeln.
 */

export const SKRALL_THRESHOLDS = {
  /** Streckning måste vara under denna gräns (%) */
  maxStreck: 15,
  /** Odds-sannolikhet minus streckning måste överstiga detta (procentenheter) */
  minEdge: 5,
  /** Klassrank (intjänat/start inom fältet) måste vara högst denna */
  maxClassRank: 3,
} as const;

/**
 * Skrällbud: omgångens bästa lågt streckade hästar med klass. Bredare än
 * skrällkandidaten (inget oddsvillkor) och alltid en lista, sorterad på chans.
 *
 * Testat 2026-10-10 på 405 lopp med facit i databasen (mars–okt 2026), delat i två
 * perioder: topp 5 per omgång på chans bland streck < 15 % och topp 3 på intjänat
 * per start vann 15,5 % / 14,5 % — 1,43× / 1,36× vad chansen sa. Oddsvillkoret i
 * skrällregeln höll inte i den datan (oddsen är från hämtningen, inte slutodds),
 * klassvillkoret gjorde det.
 */
export const SKRALLBUD = {
  /** Streckning måste vara under denna gräns (%) */
  maxStreck: 15,
  /** Klassrank (intjänat/start inom fältet) måste vara högst denna */
  maxClassRank: 3,
  /** Så många per omgång */
  count: 5,
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
