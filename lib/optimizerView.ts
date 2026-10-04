import type { OptimizerLock, SpikeTradeoff } from "@/lib/optimizer";
import type { SystemSelection } from "@/lib/types";

const NB = " ";
const MINUS = "−";

/** Sannolikhet → "1 på 89" (tusental med hårt mellanslag). */
export function fmtOneIn(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "–";
  const n = Math.max(1, Math.round(1 / p));
  return `1 på ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}`;
}

/** "8 rätt" och "7 rätt" för ett spel med n avdelningar. */
export function hitLabels(nRaces: number): { all: string; allButOne: string } {
  return { all: `${nRaces} rätt`, allButOne: `${nRaces - 1} rätt` };
}

/** Förslagets startbudget: samma som i backtesten. */
export function defaultBudget(gameType: string | null): number {
  return gameType === "V64" || gameType === "V65" ? 200 : 385;
}

export function defaultSpikes(nRaces: number): number {
  return nRaces >= 7 ? 3 : 2;
}

/** Hästar som redan ligger i kupongen ska vara med i förslaget. */
export function locksFromSelections(selections: SystemSelection[]): OptimizerLock[] {
  return selections.flatMap((s) => s.horses.map((h) => ({ race_number: s.race_number, start_number: h.start_number, kind: "in" as const })));
}

const signedPct = (v: number) => {
  const r = Math.round(v * 100);
  return `${r > 0 ? "+" : r < 0 ? MINUS : "±"}${Math.abs(r)}${NB}%`;
};

/** Vad en spik kostar och ger jämfört med att också ta nästa häst. */
export function spikeTradeoffText(t: SpikeTradeoff, horseName: string): string {
  return `Spik på ${t.start_number} ${horseName} i avd ${t.race_number}: ${signedPct(t.chanceDelta)} träffchans i avdelningen, `
    + `${signedPct(t.valueDelta)} utdelning per krona jämfört med att också ta nr ${t.nextStartNumber}.`;
}
