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

export interface StarterAnalysis {
  start_number: number;
  horse_name: string;
  calc_pct: number;
  streckning_pct: number;
  streckning_loaded: boolean;
  value: number;
  odds: number | null;
  dist_signal: DistanceSignal;
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

export interface AnalysisStarter {
  start_number: number;
  horses: { name: string } | null;
  starts_total: number | null;
  wins_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  starts_prev_year: number | null;
  wins_prev_year: number | null;
  odds: number | null;
  life_records: LifeRecord[] | null;
  bet_distribution: number | null;
  // Optional extended fields used by analyzeRaceEnhanced
  places_2nd?: number | null;
  places_3rd?: number | null;
  best_time?: string | null;
  last_5_results?: { place: string; date: string; track: string; time: string }[];
  finish_position?: number | null;
  finish_time?: string | null;
}

/**
 * Beräknar vinstchans per häst med distansfaktor.
 *
 * Baspoäng = 40% karriärvinst-% + 40% senaste form-% + 20% odds-implicit sannolikhet
 * Multipliceras med distansfaktor → normaliseras till 100%.
 * Spelvärde = beräknad chans − streckning.
 */
export function analyzeRace(
  starters: AnalysisStarter[],
  raceMeters: number,
  raceStartMethod: string
): StarterAnalysis[] {
  const scores = starters.map((s) => {
    const lifeStarts = Number(s.starts_total) || 0;
    const lifeWins = Number(s.wins_total) || 0;
    const careerWinPct = lifeStarts > 0 ? (lifeWins / lifeStarts) * 100 : 0;

    const recentStarts =
      (Number(s.starts_current_year) || 0) + (Number(s.starts_prev_year) || 0);
    const recentWins =
      (Number(s.wins_current_year) || 0) + (Number(s.wins_prev_year) || 0);
    const recentWinPct =
      recentStarts > 0 ? (recentWins / recentStarts) * 100 : careerWinPct;

    const oddsNum = s.odds != null ? Number(s.odds) : null;
    const oddsImplied =
      oddsNum && isFinite(oddsNum) && oddsNum > 0 ? (1 / oddsNum) * 100 : null;

    let base: number;
    if (oddsImplied !== null) {
      base = 0.4 * careerWinPct + 0.4 * recentWinPct + 0.2 * oddsImplied;
    } else {
      base = 0.5 * careerWinPct + 0.5 * recentWinPct;
    }

    const records: LifeRecord[] = Array.isArray(s.life_records) ? s.life_records : [];
    const distSignal = computeDistanceSignal(records, raceMeters, raceStartMethod);
    const rawScore = Math.max(isFinite(base) ? base : 0, 0.1) * distSignal.factor;

    return { starter: s, rawScore, distSignal, oddsNum };
  });

  const totalRaw = scores.reduce((sum, x) => sum + x.rawScore, 0);

  return scores.map(({ starter: s, rawScore, distSignal, oddsNum }) => {
    const calcPct = totalRaw > 0 ? Math.round((rawScore / totalRaw) * 1000) / 10 : 0;

    const betDist = s.bet_distribution;
    const streckningPct =
      betDist != null && isFinite(Number(betDist)) ? Number(betDist) : 0;
    const streckningLoaded = streckningPct > 0;

    const value = streckningLoaded
      ? Math.round((calcPct - streckningPct) * 10) / 10
      : 0;

    return {
      start_number: s.start_number,
      horse_name: s.horses?.name ?? "–",
      calc_pct: calcPct,
      streckning_pct: streckningPct,
      streckning_loaded: streckningLoaded,
      value,
      odds: oddsNum && isFinite(oddsNum) ? oddsNum : null,
      dist_signal: distSignal,
    };
  });
}

// ─── Enhanced analysis functions ────────────────────────────────────────────

/**
 * Viktad formpoäng baserat på senaste starter.
 * Nyare starter väger mer, placering viktas mot fältstorlek.
 */
export function weightedFormScore(
  lastStarts: Array<{ place: number; fieldSize: number }>
): number {
  const weights = [0.35, 0.25, 0.20, 0.12, 0.08];
  let score = 0;
  let totalWeight = 0;
  lastStarts.slice(0, 5).forEach((start, i) => {
    const positionScore = 1 - (start.place - 1) / Math.max(start.fieldSize - 1, 1);
    score += positionScore * weights[i];
    totalWeight += weights[i];
  });
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Värdeindex: positiv = hästen är undervärderad av marknaden.
 */
export function valueIndex(estimatedWinPct: number, odds: number): number {
  const impliedProb = 1 / odds;
  return Math.round((estimatedWinPct - impliedProb) * 1000) / 10;
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

/**
 * Tidsjustering relativt fältets medianbästa tid (sekunder).
 * Negativt tal = snabbare = bättre.
 */
export function timeAdjustment(
  horseBestTimeSec: number,
  fieldMedianTimeSec: number
): number {
  return Math.round((horseBestTimeSec - fieldMedianTimeSec) * 10) / 10;
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
 * Sammansatt rankingpoäng (0–100): normaliserar alla komponenter och viktar ihop.
 */
export function compositeScore(params: {
  formScore: number;
  valueIndex: number;
  consistencyScore: number;
  timeAdj: number;
}): number {
  const { formScore, valueIndex: vi, consistencyScore: cs, timeAdj } = params;
  const formNorm = formScore / 100;
  const valueNorm = Math.min(Math.max(vi / 20 + 0.5, 0), 1);
  const consistNorm = cs / 100;
  const timeNorm = Math.min(Math.max((-timeAdj + 3) / 6, 0), 1);
  return Math.round(
    (formNorm * 0.35 + valueNorm * 0.25 + consistNorm * 0.25 + timeNorm * 0.15) * 100
  );
}

export interface HorseAnalysis {
  horseId: string;
  horseName: string;
  startNumber: number;
  formScore: number;
  valueIndex: number;
  consistencyScore: number;
  timeAdjustment: number | null;
  compositeScore: number;
  estimatedWinPct: number;
  impliedWinPct: number;
  isValue: boolean;
  rank: number;
  finish_position?: number | null;
  finish_time?: string | null;
}

function parsePlaceStr(place: string): number {
  const n = parseInt(place);
  return isNaN(n) ? 99 : n;
}

/**
 * Utökad analys för ett helt lopp. Returnerar rankat HorseAnalysis[] per häst.
 * Kräver AnalysisStarter[] med de optionella fälten last_5_results, places_2nd,
 * places_3rd och best_time för bästa resultat; faller tillbaka på tillgänglig data.
 */
export function analyzeRaceEnhanced(starters: AnalysisStarter[]): HorseAnalysis[] {
  // Beräkna medianbästa tid i sekunder
  const times = starters
    .map((s) => parseTimeToSeconds(s.best_time ?? null))
    .filter((t): t is number => t !== null);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const medianTime =
    sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : null;

  const intermediate = starters.map((s) => {
    const careerStarts = Number(s.starts_total) || 0;
    const careerWins = Number(s.wins_total) || 0;
    const careerWinRate = careerStarts > 0 ? careerWins / careerStarts : 0;

    // Bygg lastStarts från last_5_results med estimerad fältstorlek 10.
    // Om last_5_results saknas (ATG:s spelendpoint returnerar den inte),
    // faller vi tillbaka på årets vinstprocent som formproxy (0–100).
    const last5 = s.last_5_results ?? [];
    let form: number;
    if (last5.length > 0) {
      const lastStarts = last5.map((r) => ({
        place: parsePlaceStr(r.place),
        fieldSize: 10,
      }));
      form = weightedFormScore(lastStarts);
    } else {
      // Proxy: årets vinstprocent, faller tillbaka på karriärvinstprocent
      const recentStarts0 =
        (Number(s.starts_current_year) || 0) + (Number(s.starts_prev_year) || 0);
      const recentWins0 =
        (Number(s.wins_current_year) || 0) + (Number(s.wins_prev_year) || 0);
      const proxyRate =
        recentStarts0 > 0 ? recentWins0 / recentStarts0 : careerWinRate;
      form = Math.round(proxyRate * 100);
    }

    // careerPlaces = topp-3 placeringar (wins + 2nd + 3rd)
    const careerPlaces =
      careerWins +
      (Number(s.places_2nd) || 0) +
      (Number(s.places_3rd) || 0);

    const consistency = consistencyScore(careerStarts, careerWins, careerPlaces);

    const recentStarts =
      (Number(s.starts_current_year) || 0) + (Number(s.starts_prev_year) || 0);
    const recentWins =
      (Number(s.wins_current_year) || 0) + (Number(s.wins_prev_year) || 0);
    const recentWinRate =
      recentStarts > 0 ? recentWins / recentStarts : careerWinRate;

    const oddsNum = s.odds != null ? Number(s.odds) : null;
    const impliedProb =
      oddsNum && isFinite(oddsNum) && oddsNum > 0 ? 1 / oddsNum : 0;

    const formRate = form / 100;
    const estimated =
      careerWinRate * 0.35 +
      formRate * 0.35 +
      recentWinRate * 0.15 +
      impliedProb * 0.15;

    const horseTimeSec = parseTimeToSeconds(s.best_time ?? null);
    const timeAdj =
      horseTimeSec !== null && medianTime !== null
        ? timeAdjustment(horseTimeSec, medianTime)
        : null;

    const vi = valueIndex(estimated, oddsNum && oddsNum > 0 ? oddsNum : 999);

    return { s, form, consistency, estimated, impliedProb, timeAdj, vi };
  });

  const results: HorseAnalysis[] = intermediate.map((d) => {
    const cs = compositeScore({
      formScore: d.form,
      valueIndex: d.vi,
      consistencyScore: d.consistency,
      timeAdj: d.timeAdj ?? 0,
    });
    return {
      horseId: String(d.s.start_number),
      horseName: d.s.horses?.name ?? "–",
      startNumber: d.s.start_number,
      formScore: d.form,
      valueIndex: d.vi,
      consistencyScore: d.consistency,
      timeAdjustment: d.timeAdj,
      compositeScore: cs,
      estimatedWinPct: Math.round(d.estimated * 1000) / 10,
      impliedWinPct: Math.round(d.impliedProb * 1000) / 10,
      isValue: cs > 55 && d.vi > 0,
      rank: 0,
      finish_position: d.s.finish_position ?? null,
      finish_time: d.s.finish_time ?? null,
    };
  });

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  results.forEach((r, i) => (r.rank = i + 1));

  return results;
}
