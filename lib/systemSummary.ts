import { formatRowCost } from "./atg";
import type { SystemSelection } from "./types";

export function computeTotalRows(selections: SystemSelection[]): number {
  if (selections.length === 0) return 0;
  return selections.reduce((acc, s) => acc * Math.max(s.horses.length, 1), 1);
}

export interface SystemSummary {
  rows: number;
  done: number;
  total: number;
  complete: boolean;
  costText: string | null;
  headline: string;
  hint: string;
}

export function summarizeSystem(selections: SystemSelection[], raceCount: number, gameType: string | null): SystemSummary {
  const done = selections.filter((s) => s.horses.length > 0).length;
  const rows = computeTotalRows(selections);
  const complete = raceCount > 0 && done === raceCount;
  const costText = complete ? formatRowCost(rows, gameType ?? "") : null;
  return {
    rows,
    done,
    total: raceCount,
    complete,
    costText,
    headline: complete ? `${rows} ${rows === 1 ? "rad" : "rader"} · ${costText}` : `${done} av ${raceCount} avd`,
    hint: complete ? "Alla avdelningar klara" : "Välj minst en häst i varje avdelning",
  };
}
