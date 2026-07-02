/**
 * Tysta signaler ("kant"-analys).
 *
 * Odds och streckning ser alla spelare direkt på ATG — de är redan inprisade.
 * Den här modulen letar i stället efter signaler som INTE syns i siffrorna
 * marknaden stirrar på, men som historiskt korrelerar med formtoppning:
 *
 *  1. Barfota-byte — tränaren drar skorna inför loppet (skoinfo finns i
 *     startlistan men vägs sällan in systematiskt av poolen). Barfota runt om
 *     efter byte är den klassiska "nu ska det köras"-signalen i travsport.
 *  2. Toppkusk-bokning — stallet har hyrt in en kusk i fältets absoluta topp.
 *     En topptränare sätter inte en toppkusk på en häst utan ambitioner.
 *  3. Formtrend — riktningen i de senaste starterna (stigande/fallande),
 *     inte bara snittet. En häst med 5-4-3-2 i placeringar är på väg uppåt
 *     även om formsnittet ser medelmåttigt ut.
 *  4. Uppehåll — mer än 60 dagar sedan senaste start är en riskfaktor som
 *     odds ofta underprisar på lågstreckade hästar.
 *
 * Varje signal ger plus- eller minuspoäng; summan blir en kantpoäng.
 * En häst med ≥ +2 flaggas ("flera oberoende positiva signaler").
 * Poängen ändrar INTE CS eller den kalibrerade sannolikheten — den är ett
 * kvalitativt lager ovanpå, tänkt att peka ut var det kan finnas spelvärde
 * som inte redan syns i odds/streck.
 */

/** Antal vilodagar som räknas som långt uppehåll */
export const EDGE_THRESHOLDS = {
  /** Kusken måste ligga topp-N i fältet på vinstprocent … */
  driverTopRank: 2,
  /** … och ha minst denna vinstprocent i år */
  driverMinWinPct: 15,
  /** Minsta antal starter i last_5 för att formtrend ska beräknas */
  trendMinStarts: 4,
  /** Skillnad i snittpoäng (senaste 2 vs äldre) som krävs för trendsignal */
  trendDelta: 2.5,
  /** Fler vilodagar än så här ⇒ uppehållssignal */
  maxRestDays: 60,
  /** Kantpoäng som krävs för flaggning */
  minEdgeScore: 2,
} as const;

export interface EdgeInput {
  start_number: number;
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  driver_win_pct: number | null;
  /** Senaste starter, nyast först (samma ordning som i formberäkningen) */
  last_5_results: { place: string; date: string }[] | null;
}

export type EdgeSignalKey =
  | "barfota"
  | "skor_pa"
  | "toppkusk"
  | "form_upp"
  | "form_ner"
  | "uppehall";

export interface EdgeSignal {
  key: EdgeSignalKey;
  /** Kort chip-text för UI */
  label: string;
  /** Förklaring (tooltip) */
  detail: string;
  points: number;
}

export interface EdgeResult {
  signals: EdgeSignal[];
  /** Summan av signalpoängen */
  score: number;
  /** true när score ≥ EDGE_THRESHOLDS.minEdgeScore */
  isEdge: boolean;
}

// Samma placeringspoäng som formkomponenten i formscore.ts
function placeScore(place: string): number {
  if (place === "1") return 10;
  if (place === "2") return 7;
  if (place === "3") return 5;
  if (place === "4" || place === "5") return 2;
  return 0; // U, G, d, disk, "–"
}

function daysBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function shoeSignals(s: EdgeInput): EdgeSignal[] {
  if (!s.shoes_reported) return [];
  const signals: EdgeSignal[] = [];

  const offFront = s.shoes_front_changed === true && s.shoes_front === false;
  const offBack = s.shoes_back_changed === true && s.shoes_back === false;
  const onFront = s.shoes_front_changed === true && s.shoes_front === true;
  const onBack = s.shoes_back_changed === true && s.shoes_back === true;

  if (offFront && offBack) {
    signals.push({
      key: "barfota",
      label: "Barfota",
      detail:
        "Skorna dras runt om inför loppet — klassisk formtoppningssignal från tränaren.",
      points: 2,
    });
  } else if (offFront || offBack) {
    signals.push({
      key: "barfota",
      label: offFront ? "Barfota fram" : "Barfota bak",
      detail: `Skon dras ${offFront ? "fram" : "bak"} inför loppet — tränaren trimmar för fart.`,
      points: 1,
    });
  }

  if (onFront || onBack) {
    signals.push({
      key: "skor_pa",
      label: "Skor på",
      detail:
        "Hästen får skor på jämfört med senast — ofta en försiktighetsåtgärd som kostar fart.",
      points: -1,
    });
  }

  return signals;
}

/**
 * Beräknar tysta signaler för ett helt startfält. Måste anropas med fältets
 * samtliga hästar — toppkusk-signalen är relativ fältet.
 *
 * @param raceDate ISO-datum/tidpunkt för loppet (för vilodagar); utelämnas
 *                 den hoppas uppehållssignalen över.
 */
export function computeEdgeSignals(
  starters: EdgeInput[],
  raceDate?: string | null
): EdgeResult[] {
  // Kuskrank inom fältet (competition ranking på vinstprocent i år)
  const driverPcts = starters
    .map((s) => s.driver_win_pct)
    .filter((p): p is number => p != null);
  const hasDriverData = driverPcts.length >= 3;

  return starters.map((s) => {
    const signals: EdgeSignal[] = [...shoeSignals(s)];

    // --- Toppkusk ---
    if (hasDriverData && s.driver_win_pct != null) {
      const rank = 1 + driverPcts.filter((p) => p > s.driver_win_pct!).length;
      if (
        rank <= EDGE_THRESHOLDS.driverTopRank &&
        s.driver_win_pct >= EDGE_THRESHOLDS.driverMinWinPct
      ) {
        signals.push({
          key: "toppkusk",
          label: "Toppkusk",
          detail: `Kusken har ${s.driver_win_pct}% vinst i år (topp ${EDGE_THRESHOLDS.driverTopRank} i fältet) — stallet menar allvar.`,
          points: 1,
        });
      }
    }

    // --- Formtrend ---
    const results = s.last_5_results ?? [];
    if (results.length >= EDGE_THRESHOLDS.trendMinStarts) {
      const scores = results.map((r) => placeScore(r.place));
      const recent = scores.slice(0, 2);
      const older = scores.slice(2);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const delta = recentAvg - olderAvg;
      if (delta >= EDGE_THRESHOLDS.trendDelta) {
        signals.push({
          key: "form_upp",
          label: "Form ↑",
          detail:
            "Placeringarna i de två senaste starterna är klart bättre än i de tidigare — hästen är på väg uppåt.",
          points: 1,
        });
      } else if (delta <= -EDGE_THRESHOLDS.trendDelta) {
        signals.push({
          key: "form_ner",
          label: "Form ↓",
          detail:
            "Placeringarna i de två senaste starterna är klart sämre än i de tidigare — formen pekar nedåt.",
          points: -1,
        });
      }
    }

    // --- Uppehåll ---
    const lastDate = results[0]?.date;
    if (raceDate && lastDate) {
      const days = daysBetween(lastDate, raceDate);
      if (days != null && days > EDGE_THRESHOLDS.maxRestDays) {
        signals.push({
          key: "uppehall",
          label: `Uppehåll ${days} d`,
          detail: `${days} dagar sedan senaste start — tävlingsrytmen är en riskfaktor.`,
          points: -1,
        });
      }
    }

    const score = signals.reduce((sum, sig) => sum + sig.points, 0);
    return {
      signals,
      score,
      isEdge: score >= EDGE_THRESHOLDS.minEdgeScore,
    };
  });
}

/** Som computeEdgeSignals, men returnerar en map på startnummer för UI-bruk. */
export function computeEdgeMap(
  starters: EdgeInput[],
  raceDate?: string | null
): Record<number, EdgeResult> {
  const results = computeEdgeSignals(starters, raceDate);
  return Object.fromEntries(starters.map((s, i) => [s.start_number, results[i]]));
}
