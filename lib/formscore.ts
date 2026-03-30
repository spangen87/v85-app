import type { AtgStarter, LifeRecord } from "./atg";
import { computeDistanceSignal, computeTrackFactor, parseTimeToSeconds } from "./analysis";

// Vikter för senaste 5 starter (nyast → äldst)
const FORM_WEIGHTS = [0.40, 0.25, 0.15, 0.11, 0.09];

// Poäng per placering
function placeScore(place: string): number {
  if (place === "1") return 10;
  if (place === "2") return 7;
  if (place === "3") return 5;
  if (place === "4" || place === "5") return 2;
  return 0; // U, G, d, disk
}

// Normalisera ett värde 0–1 inom ett spann
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Race-metadata som behövs för distans- och spårfaktor */
export interface RaceContext {
  distance: number;
  start_method: string;
  field_size: number;
}

/**
 * Beräknar Composite Score (0–100) per häst i ett lopp.
 *
 * CS = 30% senaste form + 20% vinstprocent + 15% odds-index
 *    + 15% tidindex + 10% konsistens + 5% distansfaktor + 5% spårfaktor
 */
export function calculateCompositeScore(
  starters: AtgStarter[],
  race: RaceContext
): number[] {
  // --- Komponent 1: Senaste form (30%) ---
  const formComponents = starters.map((s) => {
    const results = s.last_5_results;
    if (results.length > 0) {
      const score = results.reduce((sum, r, i) => {
        const w = FORM_WEIGHTS[i] ?? 0;
        return sum + w * placeScore(r.place);
      }, 0);
      return score / 10; // Max = 10 * sum(weights) = 10, normaliserat 0–1
    }
    // Fallback: prioritera innevarande år, komplettera med föregående vid < 2 starter
    const currentStarts = Number(s.starts_current_year) || 0;
    const currentWins = Number(s.wins_current_year) || 0;
    if (currentStarts >= 2) return currentWins / currentStarts;
    const prevStarts = Number(s.starts_prev_year) || 0;
    const prevWins = Number(s.wins_prev_year) || 0;
    const combinedStarts = currentStarts + prevStarts;
    const combinedWins = currentWins + prevWins;
    if (combinedStarts > 0) return combinedWins / combinedStarts;
    const lifeStarts = Number(s.starts_total) || 0;
    const lifeWins = Number(s.wins_total) || 0;
    return lifeStarts > 0 ? lifeWins / lifeStarts : 0;
  });

  // --- Komponent 2: Vinstprocent (20%) ---
  const winRates = starters.map((s) => {
    const currentStarts = Number(s.starts_current_year) || 0;
    const currentWins = Number(s.wins_current_year) || 0;
    if (currentStarts >= 2) return currentWins / currentStarts;
    const prevStarts = Number(s.starts_prev_year) || 0;
    const prevWins = Number(s.wins_prev_year) || 0;
    const combined = currentStarts + prevStarts;
    return combined > 0 ? (currentWins + prevWins) / combined : 0;
  });

  // --- Komponent 3: Odds-index (15%) — lägre odds = bättre ---
  const validOdds = starters.map((s) => s.odds).filter((o): o is number => o != null && o > 0);
  const minOdds = validOdds.length ? Math.min(...validOdds) : 1;
  const maxOdds = validOdds.length ? Math.max(...validOdds) : 100;
  const oddsComponents = starters.map((s) => {
    if (!s.odds || s.odds <= 0) return 0;
    return 1 - normalize(s.odds, minOdds, maxOdds);
  });

  // --- Komponent 4: Tidindex (15%) — bästa tid relativt fältet ---
  const times = starters.map((s) => parseTimeToSeconds(s.best_time));
  const validTimes = times.filter((t): t is number => t != null);
  const minTime = validTimes.length ? Math.min(...validTimes) : 0;
  const maxTime = validTimes.length ? Math.max(...validTimes) : 100;
  const timeComponents = times.map((t) => {
    if (t == null) return 0;
    return 1 - normalize(t, minTime, maxTime); // Snabb tid → högt index
  });

  // --- Komponent 5: Konsistens (10%) — vinst + platsfrekvens ---
  const consistencyComponents = starters.map((s) => {
    const starts = Number(s.starts_total) || 0;
    if (starts === 0) return 0;
    const wins = Number(s.wins_total) || 0;
    const places = wins + (Number(s.places_2nd) || 0) + (Number(s.places_3rd) || 0);
    return 0.6 * (wins / starts) + 0.4 * (places / starts);
  });

  // --- Komponent 6: Distansfaktor (5%) — baserat på life_records ---
  const distComponents = starters.map((s) => {
    const records: LifeRecord[] = Array.isArray(s.life_records) ? s.life_records : [];
    const signal = computeDistanceSignal(records, race.distance, race.start_method);
    // Normalisera faktor 0.6–1.35 → 0–1
    return normalize(signal.factor, 0.6, 1.35);
  });

  // --- Komponent 7: Spårfaktor (5%) — post_position + historik ---
  const rawTrackFactors = starters.map((s) =>
    computeTrackFactor(
      s.post_position ?? 1,
      race.start_method,
      s.horse_starts_history ?? []
    )
  );
  // Normalisera min-max relativt fältet
  const trackMin = Math.min(...rawTrackFactors);
  const trackMax = Math.max(...rawTrackFactors);
  const trackRange = trackMax - trackMin;
  const trackComponents = rawTrackFactors.map((f) =>
    trackRange > 0 ? (f - trackMin) / trackRange : 0.5
  );

  // --- Vägt slutresultat (0–100) ---
  return starters.map((_, i) => {
    const score =
      formComponents[i] * 0.30 +
      winRates[i] * 0.20 +
      oddsComponents[i] * 0.15 +
      timeComponents[i] * 0.15 +
      consistencyComponents[i] * 0.10 +
      distComponents[i] * 0.05 +
      trackComponents[i] * 0.05;
    return Math.round(score * 100);
  });
}

/** @deprecated Använd calculateCompositeScore istället. Behålls för bakåtkompatibilitet. */
export function calculateFormscore(starters: AtgStarter[]): number[] {
  return calculateCompositeScore(starters, { distance: 2140, start_method: "auto", field_size: starters.length });
}
