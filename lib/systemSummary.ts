import { formatRowCost } from "./atg";
import { scratchedMask, type DbStarterLike } from "./fundamental";
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

export type DraftSync = "none" | "create" | "update" | "delete";

/** Vad som ska hända med utkastet för att det ska stämma med det som syns. */
export function planDraftSync(selections: SystemSelection[], activeDraftId: string | null): DraftSync {
  if (selections.length === 0) return activeDraftId ? "delete" : "none";
  return activeDraftId ? "update" : "create";
}

/** Startnummer som inte går att lägga till: strukna hästar, och alla när loppet är avgjort. */
export function lockedStarts(race: { starters: (DbStarterLike & { finish_position?: number | null })[] }): Set<number> {
  if (race.starters.some((s) => s.finish_position != null)) return new Set(race.starters.map((s) => s.start_number));
  const mask = scratchedMask(race.starters);
  return new Set(race.starters.filter((_, i) => mask[i]).map((s) => s.start_number));
}
