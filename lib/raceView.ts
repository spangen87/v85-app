import { computeWinProbabilities, type WinProbability } from "./probability";
import { computeSkrallMap, type SkrallSignal } from "./skrall";
import { computeEdgeMap, type EdgeResult } from "./edge";
import { computeFundamentalMapForRows, isDisagreement, scratchedMask, type FundamentalResult } from "./fundamental";
import type { Race, Starter } from "./raceTypes";
import type { SystemSelection } from "./types";
import type { NumberState } from "@/components/ui/StartNumber";

export type SortKey = "chans" | "streck" | "odds" | "grund" | "cs" | "number";
export const SORT_KEYS: SortKey[] = ["chans", "streck", "odds", "grund", "cs", "number"];
export const SORT_LABELS: Record<SortKey, string> = {
  chans: "Chans", streck: "Streck", odds: "Odds", grund: "Grund", cs: "CS", number: "Startnummer",
};

export interface Filters { value: boolean; skrall: boolean; signal: boolean; hideLongshots: boolean; search: string }
export const EMPTY_FILTERS: Filters = { value: false, skrall: false, signal: false, hideLongshots: false, search: "" };

export function activeFilterCount(f: Filters): number {
  return [f.value, f.skrall, f.signal, f.hideLongshots, f.search.trim().length > 0].filter(Boolean).length;
}

export type RowBadge = "skrall" | "signal" | "scratched" | null;

export interface RowModel {
  starter: Starter;
  n: number;
  name: string;
  driver: string;
  chansPct: number | null;
  chansRank: number | null;
  streckPct: number | null;
  odds: number | null;
  valueDelta: number | null;
  isValue: boolean;
  grundPct: number | null;
  grundRank: number | null;
  cs: number | null;
  csRank: number | null;
  disagree: boolean;
  badge: RowBadge;
  edgeScore: number;
  isEdge: boolean;
  form: string[];
  scratched: boolean;
  numberState: NumberState;
  selectable: boolean;
}

export interface RaceMaps {
  prob: Record<number, WinProbability>;
  skrall: Record<number, SkrallSignal>;
  edge: Record<number, EdgeResult>;
  fundamental: Record<number, FundamentalResult>;
  scratched: Set<number>;
}

/** Alla fältrelativa mått för en avdelning. Strukna hästar får ingen chans. */
export function computeRaceMaps(race: Race): RaceMaps {
  const mask = scratchedMask(race.starters);
  const scratched = new Set(race.starters.filter((_, i) => mask[i]).map((s) => s.start_number));
  const active = race.starters.filter((s) => !scratched.has(s.start_number));
  const probs = computeWinProbabilities(active);
  const raceDate = race.start_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return {
    prob: Object.fromEntries(active.map((s, i) => [s.start_number, probs[i]])),
    skrall: computeSkrallMap(race.starters),
    edge: computeEdgeMap(race.starters, race.start_time),
    fundamental: computeFundamentalMapForRows(race, raceDate, race.starters),
    scratched,
  };
}

export function raceHasResults(race: Pick<Race, "starters">): boolean {
  return race.starters.some((s) => s.finish_position != null);
}

/** Rang 1 = högst. null-värden får ingen rang. */
function ranks(values: Map<number, number | null>): Map<number, number> {
  const sorted = [...values.entries()].filter((e): e is [number, number] => e[1] != null).sort((a, b) => b[1] - a[1]);
  return new Map(sorted.map(([n], i) => [n, i + 1]));
}

function finishState(pos: number | null): NumberState {
  if (pos === 1) return "p1";
  if (pos === 2) return "p2";
  if (pos === 3) return "p3";
  return "finished";
}

export function buildRowModels(race: Race, maps: RaceMaps, selected: Set<number>): RowModel[] {
  const results = raceHasResults(race);
  const chans = new Map<number, number | null>();
  const grund = new Map<number, number | null>();
  const cs = new Map<number, number | null>();
  for (const s of race.starters) {
    const p = maps.prob[s.start_number];
    const scratched = maps.scratched.has(s.start_number);
    chans.set(s.start_number, !scratched && p && p.source !== "uniform" ? p.p * 100 : null);
    const g = maps.fundamental[s.start_number]?.p;
    grund.set(s.start_number, !scratched && g != null ? g * 100 : null);
    cs.set(s.start_number, scratched ? null : s.formscore);
  }
  const chansRanks = ranks(chans);
  const grundRanks = ranks(grund);
  const csRanks = ranks(cs);

  return race.starters.map((s) => {
    const n = s.start_number;
    const scratched = maps.scratched.has(n);
    const chansPct = chans.get(n) ?? null;
    const streckPct = s.bet_distribution != null && s.bet_distribution > 0 ? s.bet_distribution : null;
    const valueDelta = chansPct != null && streckPct != null ? chansPct - streckPct : null;
    const isValue = !scratched && (s.formscore ?? 0) > 55 && streckPct != null && chansPct != null && chansPct > streckPct;
    const edge = maps.edge[n];
    const isEdge = !scratched && (edge?.isEdge ?? false);
    const badge: RowBadge = scratched ? "scratched" : maps.skrall[n]?.isCandidate ? "skrall" : isEdge ? "signal" : null;
    const grundPct = grund.get(n) ?? null;
    // En struken häst som redan ligger i systemet visas som vald och går att ta bort, men inte att lägga till
    const numberState: NumberState = results ? finishState(s.finish_position) : selected.has(n) ? "selected" : "idle";
    return {
      starter: s,
      n,
      name: s.horses?.name ?? "–",
      driver: s.driver,
      chansPct,
      chansRank: chansRanks.get(n) ?? null,
      streckPct,
      odds: s.odds != null && s.odds > 0 ? s.odds : null,
      valueDelta,
      isValue,
      grundPct,
      grundRank: grundRanks.get(n) ?? null,
      cs: cs.get(n) ?? null,
      csRank: csRanks.get(n) ?? null,
      disagree: !scratched && isDisagreement(grundPct != null ? grundPct / 100 : null, streckPct),
      badge,
      edgeScore: edge?.score ?? 0,
      isEdge,
      form: (s.last_5_results ?? []).map((r) => r.place),
      scratched,
      numberState,
      selectable: !results && (!scratched || selected.has(n)),
    };
  });
}

export function raceLacksMarket(rows: RowModel[]): boolean {
  return rows.length > 0 && rows.every((r) => r.scratched || r.chansPct == null);
}

const desc = (a: number | null, b: number | null) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : b - a);
const asc = (a: number | null, b: number | null) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a - b);

export function sortRows(rows: RowModel[], key: SortKey): RowModel[] {
  const cmp: Record<SortKey, (a: RowModel, b: RowModel) => number> = {
    chans: (a, b) => desc(a.chansPct, b.chansPct),
    streck: (a, b) => desc(a.streckPct, b.streckPct),
    odds: (a, b) => asc(a.odds, b.odds),
    grund: (a, b) => desc(a.grundPct, b.grundPct),
    cs: (a, b) => desc(a.cs, b.cs),
    number: (a, b) => a.n - b.n,
  };
  return [...rows].sort((a, b) => Number(a.scratched) - Number(b.scratched) || cmp[key](a, b) || a.n - b.n);
}

export function filterRows(rows: RowModel[], f: Filters): RowModel[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) =>
    (!f.value || r.isValue) &&
    (!f.skrall || r.badge === "skrall") &&
    (!f.signal || r.isEdge) &&
    (!f.hideLongshots || r.odds == null || r.odds <= 50) &&
    (!q || r.name.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || r.starter.trainer.toLowerCase().includes(q))
  );
}

export function raceTabsInfo(races: Race[], selections: SystemSelection[]): { n: number; done: boolean; picks: number }[] {
  return races.map((r) => ({
    n: r.race_number,
    done: raceHasResults(r),
    picks: selections.find((s) => s.race_number === r.race_number)?.horses.length ?? 0,
  }));
}

/** "?hast=3-2" → avdelning 3, startnummer 2. Allt annat → null. */
export function parseHastParam(
  v: string | null,
  races: { race_number: number; starters: { start_number: number }[] }[]
): { race: number; start: number } | null {
  const m = (v ?? "").match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const race = Number(m[1]);
  const start = Number(m[2]);
  const r = races.find((x) => x.race_number === race);
  return r && r.starters.some((s) => s.start_number === start) ? { race, start } : null;
}
