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
