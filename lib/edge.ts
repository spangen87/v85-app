/**
 * Tysta signaler ("kant"-analys).
 *
 * Odds och streckning ser alla spelare direkt på ATG — de är redan inprisade.
 * Den här modulen letar i stället efter signaler som INTE syns i siffrorna
 * marknaden stirrar på:
 *
 *  1. Barfota-byte — tränaren drar skorna inför loppet. Barfota runt om
 *     efter byte är den klassiska "nu ska det köras"-signalen i travsport.
 *  2. Skor på — hästen får skor på jämfört med senast. Den starkaste
 *     signalen i datan, och den är negativ.
 *  3. Formtrend — riktningen i de senaste starterna (stigande/fallande),
 *     inte bara snittet.
 *
 * Varje signal ger plus- eller minuspoäng; summan blir en kantpoäng.
 * En häst med ≥ +2 flaggas. Poängen ändrar INTE CS eller den kalibrerade
 * sannolikheten — den är ett kvalitativt lager ovanpå.
 *
 * Omprövat 2026-11-09 på 484 avgjorda lopp i databasen (väntat = Chans):
 *  - Skor på: 362 hästar, väntat 9,3 %, vann 5,5 % (5,6 % / 5,4 % i två
 *    perioder). Vikten höjd från −1 till −2 och visas som eget märke.
 *  - Toppkusk (466 hästar, 15,4 % → 15,7 %) och uppehåll över 60 dagar
 *    (414 hästar, 10,6 % → 10,9 %) gav ingen effekt och är borttagna.
 *  - Signal ≥ +2 med de nya reglerna: 466 hästar, väntat 8,7 %, vann 10,5 %.
 */

export const EDGE_THRESHOLDS = {
  /** Minsta antal starter i last_5 för att formtrend ska beräknas */
  trendMinStarts: 4,
  /** Skillnad i snittpoäng (senaste 2 vs äldre) som krävs för trendsignal */
  trendDelta: 2.5,
  /** Kantpoäng som krävs för flaggning */
  minEdgeScore: 2,
  /** Poäng för skor på (negativ) */
  shoesOnPoints: -2,
} as const;

export interface EdgeInput {
  start_number: number;
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  /** Senaste starter, nyast först (samma ordning som i formberäkningen) */
  last_5_results: { place: string; date: string }[] | null;
}

export type EdgeSignalKey =
  | "barfota"
  | "skor_pa"
  | "form_upp"
  | "form_ner";

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
  /** true när hästen får skor på jämfört med senast */
  shoesOn: boolean;
}

// Samma placeringspoäng som formkomponenten i formscore.ts
function placeScore(place: string): number {
  if (place === "1") return 10;
  if (place === "2") return 7;
  if (place === "3") return 5;
  if (place === "4" || place === "5") return 2;
  return 0; // U, G, d, disk, "–"
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
        "Hästen får skor på jämfört med senast. Sådana hästar har vunnit klart mer sällan än oddsen och strecket säger.",
      points: EDGE_THRESHOLDS.shoesOnPoints,
    });
  }

  return signals;
}

/** Beräknar tysta signaler för varje häst i ett startfält. */
export function computeEdgeSignals(starters: EdgeInput[]): EdgeResult[] {
  return starters.map((s) => {
    const signals: EdgeSignal[] = [...shoeSignals(s)];

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

    const score = signals.reduce((sum, sig) => sum + sig.points, 0);
    return {
      signals,
      score,
      isEdge: score >= EDGE_THRESHOLDS.minEdgeScore,
      shoesOn: signals.some((sig) => sig.key === "skor_pa"),
    };
  });
}

/** Som computeEdgeSignals, men returnerar en map på startnummer för UI-bruk. */
export function computeEdgeMap(starters: EdgeInput[]): Record<number, EdgeResult> {
  const results = computeEdgeSignals(starters);
  return Object.fromEntries(starters.map((s, i) => [s.start_number, results[i]]));
}
