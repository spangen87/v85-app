import type { HorseStart } from "./atg";

export interface LifeRecord {
  start_method: string; // "auto" | "volte"
  distance: string;     // "short" | "medium" | "long"
  place: number;
  time: string;
}

export interface DistanceSignal {
  factor: number;
  label: string;
}

// Konverterar loppets meter till ATGs distanskat.
function metersToCategory(meters: number): string {
  if (meters <= 1800) return "short";
  if (meters <= 2400) return "medium";
  return "long";
}

const DIST_LABEL: Record<string, string> = {
  short: "kort (≤1800m)",
  medium: "medel (1800–2400m)",
  long: "lång (>2400m)",
};

/**
 * Beräknar distanssignalen baserat på hästens rekord på distansen.
 * ×1.35 = vunnit på exakt distans+metod
 * ×1.1  = placerat exakt
 * ×0.9  = sprungit men ej placerat exakt
 * ×1.2  = vunnit, annan startmetod
 * ×1.05 = placerat, annan startmetod
 * ×0.85 = sprungit men ej placerat, annan startmetod
 * ×0.6  = aldrig sprungit på denna distans
 */
export function computeDistanceSignal(
  records: LifeRecord[],
  raceMeters: number,
  raceStartMethod: string
): DistanceSignal {
  const cat = metersToCategory(raceMeters);
  const catLabel = DIST_LABEL[cat] ?? cat;

  const atDist = records.filter((r) => r.distance === cat);
  if (atDist.length === 0) {
    return { factor: 0.6, label: `Aldrig sprungit på ${catLabel}` };
  }

  const exactMatch = atDist.filter((r) => r.start_method === raceStartMethod);
  const otherMethod = atDist.filter((r) => r.start_method !== raceStartMethod);

  const bestExact = exactMatch.length
    ? Math.min(...exactMatch.map((r) => r.place).filter((p) => p > 0 && p < 99))
    : 99;
  const bestOther = otherMethod.length
    ? Math.min(...otherMethod.map((r) => r.place).filter((p) => p > 0 && p < 99))
    : 99;

  if (exactMatch.length > 0) {
    if (bestExact === 1)
      return { factor: 1.35, label: `Vunnit på ${catLabel} (${raceStartMethod}start)` };
    if (bestExact <= 3)
      return { factor: 1.1, label: `Placerat på ${catLabel} (${raceStartMethod}start)` };
    return { factor: 0.9, label: `Sprungit men ej placerat på ${catLabel} (${raceStartMethod}start)` };
  }

  if (bestOther === 1)
    return { factor: 1.2, label: `Vunnit på ${catLabel} (annan startmetod)` };
  if (bestOther <= 3)
    return { factor: 1.05, label: `Placerat på ${catLabel} (annan startmetod)` };
  return { factor: 0.85, label: `Sprungit men ej placerat på ${catLabel} (annan startmetod)` };
}

/** Statisk spårfaktor för voltstart (spår 1 = bäst). */
const TRACK_BIAS_VOLTE: Record<number, number> = {
  1: 1.00, 2: 0.95, 3: 0.88, 4: 0.80, 5: 0.72,
  6: 0.65, 7: 0.58, 8: 0.52, 9: 0.46, 10: 0.40,
  11: 0.35, 12: 0.30,
};

function staticTrackFactor(postPosition: number, startMethod: string): number {
  const pos = Math.max(1, postPosition);
  const baseVolte = pos <= 12 ? (TRACK_BIAS_VOLTE[pos] ?? 0.25) : 0.25;
  if (startMethod === "auto") {
    return 0.5 + (baseVolte - 0.5) * 0.4;
  }
  return baseVolte;
}

/**
 * Beräknar spårfaktor (0–1) för en häst baserat på post_position.
 * Hybrid: statisk tabell + dynamisk om ≥5 starter med spårdata finns.
 */
export function computeTrackFactor(
  postPosition: number,
  startMethod: string,
  horseHistory: HorseStart[]
): number {
  const staticF = staticTrackFactor(postPosition, startMethod);

  const startsWithPos = horseHistory.filter((s) => s.post_position != null);
  if (startsWithPos.length < 5) {
    return staticF;
  }

  const wins = startsWithPos.filter((s) => s.place === "1").length;
  const top3 = startsWithPos.filter((s) => {
    const p = parseInt(s.place);
    return !isNaN(p) && p <= 3;
  }).length;
  const total = startsWithPos.length;
  const dynamicRaw = 0.6 * (wins / total) + 0.4 * (top3 / total);
  const dynamicF = Math.min(Math.max(dynamicRaw * 2.5, 0), 1);

  return 0.5 * staticF + 0.5 * dynamicF;
}

/**
 * Konverterar "1:12,4" eller "1:12.4" → sekunder.
 */
export function parseTimeToSeconds(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+):(\d+)[,.](\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 10;
}

/**
 * Konsistenspoäng: kombinerar vinstfrekvens (60%) och platsfrekvens (40%).
 */
export function consistencyScore(
  starts: number,
  wins: number,
  places: number
): number {
  if (starts === 0) return 0;
  const winRate = wins / starts;
  const placeRate = places / starts;
  return Math.round((winRate * 0.6 + placeRate * 0.4) * 100);
}
