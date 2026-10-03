/** Vilka starters behöver nytt fundamental_p? Delas av omräkningsskriptet och adminroute. */
import { computeFundamentalForRows, type DbStarterLike } from "./dbAdapter";
import { MODEL, type FundamentalModel } from "./model";

export interface RecomputeRace {
  id: string;
  game_id: string;
  distance: number | null;
  start_method: string | null;
  breed: string | null;
  first_prize: number | null;
}

export interface FundamentalUpdate {
  id: string;
  fundamental_p: number | null;
  fundamental_version: string | null;
}

type Row = DbStarterLike & {
  id: string;
  race_id: string;
  fundamental_p?: number | null;
  fundamental_version?: string | null;
};

export function computeFundamentalUpdates(
  races: RecomputeRace[],
  gameDates: Map<string, string>,
  starters: Row[],
  model: FundamentalModel = MODEL
): FundamentalUpdate[] {
  const raceById = new Map(races.map((r) => [r.id, r]));
  const byRace = new Map<string, Row[]>();
  for (const s of starters) {
    if (!byRace.has(s.race_id)) byRace.set(s.race_id, []);
    byRace.get(s.race_id)!.push(s);
  }

  const updates: FundamentalUpdate[] = [];
  for (const [raceId, rows] of byRace) {
    const race = raceById.get(raceId);
    const date = race ? gameDates.get(race.game_id) : undefined;
    if (!race || !date) continue;
    const results = computeFundamentalForRows(race, date, rows, model);
    rows.forEach((row, i) => {
      const p = results[i]?.p ?? null;
      const version = p != null ? model.version : null;
      const old = row.fundamental_p ?? null;
      const same =
        (old == null && p == null) || (old != null && p != null && Math.abs(old - p) < 1e-9);
      if (!same || (row.fundamental_version ?? null) !== version) {
        updates.push({ id: row.id, fundamental_p: p, fundamental_version: version });
      }
    });
  }
  return updates;
}
