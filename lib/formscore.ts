import type { AtgStarter } from "./atg";

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

export interface FormscoreInput {
  starter: AtgStarter;
  allOddsInRace: (number | null)[];
}

export function calculateFormscore(starters: AtgStarter[]): number[] {
  // --- Komponent 1: Senaste form (40%) ---
  // ATG:s horses-API returnerar inte individuella starter, så last_5_results är tom.
  // Fallback: beräknad form från vinstprocent (år + karriär).
  const formComponents = starters.map((s) => {
    const results = s.last_5_results;
    if (results.length > 0) {
      const score = results.reduce((sum, r, i) => {
        const w = FORM_WEIGHTS[i] ?? 0;
        return sum + w * placeScore(r.place);
      }, 0);
      // Max möjlig poäng = 10 * sum(weights) = 10
      return score / 10;
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

  // --- Komponent 2: Vinstprocent (20%) — innevarande år, kompletteras med föregående vid < 2 starter ---
  const winRates = starters.map((s) => {
    const currentStarts = Number(s.starts_current_year) || 0;
    const currentWins = Number(s.wins_current_year) || 0;
    if (currentStarts >= 2) return currentWins / currentStarts;
    const prevStarts = Number(s.starts_prev_year) || 0;
    const prevWins = Number(s.wins_prev_year) || 0;
    const combined = currentStarts + prevStarts;
    return combined > 0 ? (currentWins + prevWins) / combined : 0;
  });

  // --- Komponent 3: Odds-index (20%) — lägre odds = bättre ---
  const validOdds = starters.map((s) => s.odds).filter((o): o is number => o != null && o > 0);
  const minOdds = validOdds.length ? Math.min(...validOdds) : 1;
  const maxOdds = validOdds.length ? Math.max(...validOdds) : 100;
  const oddsComponents = starters.map((s) => {
    if (!s.odds || s.odds <= 0) return 0;
    // Inverterat: låga odds → högt index
    return 1 - normalize(s.odds, minOdds, maxOdds);
  });

  // --- Komponent 4: Tidindex (20%) — bästa tid relativt loppet ---
  // Tolka "1.12,3" som sekunder/km
  function parseTime(t: string | null): number | null {
    if (!t) return null;
    const match = t.match(/(\d+)\.(\d+),(\d+)/);
    if (!match) return null;
    const min = parseInt(match[1]);
    const sec = parseInt(match[2]);
    const tenth = parseInt(match[3]);
    return min * 60 + sec + tenth / 10;
  }

  const times = starters.map((s) => parseTime(s.best_time));
  const validTimes = times.filter((t): t is number => t != null);
  const minTime = validTimes.length ? Math.min(...validTimes) : 0;
  const maxTime = validTimes.length ? Math.max(...validTimes) : 100;
  const timeComponents = times.map((t) => {
    if (t == null) return 0;
    // Inverterat: snabb tid → högt index
    return 1 - normalize(t, minTime, maxTime);
  });

  // --- Vägt slutresultat (0–100) ---
  return starters.map((_, i) => {
    const score =
      formComponents[i] * 0.40 +
      winRates[i] * 0.20 +
      oddsComponents[i] * 0.20 +
      timeComponents[i] * 0.20;
    return Math.round(score * 100);
  });
}
