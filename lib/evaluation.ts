/**
 * Utvärderingsmått: hur ofta CS:s respektive Grundchans toppval vinner.
 * Räknas på alla startande (även hästar som galopperat) i lopp med vinnare.
 */

export interface Overall {
  games_evaluated: number;
  races_evaluated: number;
  top_pick_win_rate: number;
  top_3_coverage_rate: number;
  fundamental_races_evaluated: number;
  fundamental_top_pick_win_rate: number;
  fundamental_top_3_coverage_rate: number;
}

export interface EvalStarterRow {
  race_id: string;
  start_number: number;
  formscore: number | null;
  fundamental_p: number | null;
  finish_position: number | null;
  races: {
    race_number: number;
    game_id: string;
    games: {
      id: string;
      date: string;
      game_type: string;
      track: string;
    } | null;
  } | null;
  horses: { name: string } | null;
}

export interface RaceEval {
  race_number: number;
  winner_name: string;
  top_pick_name: string;
  top_pick_won: boolean;
  top_3_covered_winner: boolean;
}

export interface GameEval {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  races_evaluated: number;
  top_pick_win_rate: number;
  top_3_coverage_rate: number;
  races: RaceEval[];
}

export function computeEvaluation(rows: EvalStarterRow[]): { overall: Overall; games: GameEval[] } {
  const byRace = new Map<string, EvalStarterRow[]>();
  for (const row of rows) {
    const key = row.race_id;
    if (!byRace.has(key)) byRace.set(key, []);
    byRace.get(key)!.push(row);
  }

  const byGame = new Map<string, { game: GameEval["game_id"] extends string ? Pick<GameEval, "game_id" | "date" | "game_type" | "track"> : never; races: Map<string, EvalStarterRow[]> }>();
  for (const [raceId, starters] of byRace) {
    const first = starters[0];
    if (!first?.races?.games) continue;
    const gameId = first.races.game_id;
    if (!byGame.has(gameId)) {
      byGame.set(gameId, {
        game: {
          game_id: gameId,
          date: first.races.games.date,
          game_type: first.races.games.game_type,
          track: first.races.games.track,
        },
        races: new Map(),
      });
    }
    byGame.get(gameId)!.races.set(raceId, starters);
  }

  const games: GameEval[] = [];
  let totalRaces = 0;
  let totalTopPickWins = 0;
  let totalTop3Coverage = 0;
  let fundamentalRaces = 0;
  let fundamentalTopWins = 0;
  let fundamentalTop3 = 0;

  for (const [, { game, races }] of byGame) {
    const raceEvals: RaceEval[] = [];
    let gameTopWins = 0;
    let gameTop3 = 0;

    for (const [, starters] of races) {
      const winner = starters.find((s) => s.finish_position === 1);
      if (!winner) continue;

      const ranked = [...starters]
        .filter((s) => s.formscore != null)
        .sort((a, b) => (b.formscore ?? 0) - (a.formscore ?? 0));

      if (ranked.length === 0) continue;

      const topPick = ranked[0];
      const top3 = ranked.slice(0, 3).map((s) => s.start_number);

      const top_pick_won = topPick.start_number === winner.start_number;
      const top_3_covered_winner = top3.includes(winner.start_number);

      // Grundchans: rangordna bland hästar med sparat värde (strukna saknar
      // värde); kräver att vinnaren har ett värde och minst två hästar har det
      const withGrund = starters.filter((s) => s.fundamental_p != null);
      if (winner.fundamental_p != null && withGrund.length >= 2) {
        const byGrund = [...withGrund].sort((a, b) => (b.fundamental_p ?? 0) - (a.fundamental_p ?? 0));
        fundamentalRaces++;
        if (byGrund[0].start_number === winner.start_number) fundamentalTopWins++;
        if (byGrund.slice(0, 3).some((s) => s.start_number === winner.start_number)) fundamentalTop3++;
      }

      if (top_pick_won) gameTopWins++;
      if (top_3_covered_winner) gameTop3++;

      const raceInfo = starters[0].races;
      raceEvals.push({
        race_number: raceInfo?.race_number ?? 0,
        winner_name: winner.horses?.name ?? `Nr ${winner.start_number}`,
        top_pick_name: topPick.horses?.name ?? `Nr ${topPick.start_number}`,
        top_pick_won,
        top_3_covered_winner,
      });
    }

    raceEvals.sort((a, b) => a.race_number - b.race_number);
    const n = raceEvals.length;
    if (n === 0) continue;

    totalRaces += n;
    totalTopPickWins += gameTopWins;
    totalTop3Coverage += gameTop3;

    games.push({
      ...game,
      races_evaluated: n,
      top_pick_win_rate: (gameTopWins / n) * 100,
      top_3_coverage_rate: (gameTop3 / n) * 100,
      races: raceEvals,
    });
  }

  games.sort((a, b) => b.date.localeCompare(a.date));

  return {
    overall: {
      games_evaluated: games.length,
      races_evaluated: totalRaces,
      top_pick_win_rate: totalRaces > 0 ? (totalTopPickWins / totalRaces) * 100 : 0,
      top_3_coverage_rate: totalRaces > 0 ? (totalTop3Coverage / totalRaces) * 100 : 0,
      fundamental_races_evaluated: fundamentalRaces,
      fundamental_top_pick_win_rate: fundamentalRaces > 0 ? (fundamentalTopWins / fundamentalRaces) * 100 : 0,
      fundamental_top_3_coverage_rate: fundamentalRaces > 0 ? (fundamentalTop3 / fundamentalRaces) * 100 : 0,
    },
    games,
  };
}
