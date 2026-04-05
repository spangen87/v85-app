import { createClient } from "@/lib/supabase/server";
import { EvaluationPanel } from "@/components/EvaluationPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { redirect } from "next/navigation";

interface GameSummary {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  has_results: boolean; // true only when ALL races in the game have at least one finish_position
}

interface StarterRow {
  race_id: string;
  start_number: number;
  formscore: number | null;
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

interface RaceEval {
  race_number: number;
  winner_name: string;
  top_pick_name: string;
  top_pick_won: boolean;
  top_3_covered_winner: boolean;
}

interface GameEval {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  races_evaluated: number;
  top_pick_win_rate: number;
  top_3_coverage_rate: number;
  races: RaceEval[];
}

function computeEvaluation(rows: StarterRow[]) {
  // Gruppera per lopp
  const byRace = new Map<string, StarterRow[]>();
  for (const row of rows) {
    const key = row.race_id;
    if (!byRace.has(key)) byRace.set(key, []);
    byRace.get(key)!.push(row);
  }

  // Gruppera per spel
  const byGame = new Map<string, { game: GameEval["game_id"] extends string ? Pick<GameEval, "game_id" | "date" | "game_type" | "track"> : never; races: Map<string, StarterRow[]> }>();
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

  for (const [, { game, races }] of byGame) {
    const raceEvals: RaceEval[] = [];
    let gameTopWins = 0;
    let gameTop3 = 0;

    for (const [, starters] of races) {
      const winner = starters.find((s) => s.finish_position === 1);
      if (!winner) continue; // lopp utan vinnare hoppas över

      const ranked = [...starters]
        .filter((s) => s.formscore != null)
        .sort((a, b) => (b.formscore ?? 0) - (a.formscore ?? 0));

      if (ranked.length === 0) continue;

      const topPick = ranked[0];
      const top3 = ranked.slice(0, 3).map((s) => s.start_number);

      const top_pick_won = topPick.start_number === winner.start_number;
      const top_3_covered_winner = top3.includes(winner.start_number);

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
    },
    games,
  };
}

export default async function EvaluationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Query A — all games ordered by date descending (limit 100 to prevent unbounded results)
  const { data: allGamesData } = await supabase
    .from("games")
    .select("id, date, game_type, track")
    .order("date", { ascending: false })
    .limit(100);

  // Query B — starters with finish_position to determine which games have results
  const { data } = await supabase
    .from("starters")
    .select(`
      race_id, start_number, formscore, finish_position,
      races ( race_number, game_id, games ( id, date, game_type, track ) ),
      horses ( name )
    `)
    .not("formscore", "is", null)
    .not("finish_position", "is", null);

  // Query C — all races to know total race count per game (needed for completeness check)
  const { data: allRacesData } = await supabase
    .from("races")
    .select("id, game_id");

  const rows = (data ?? []) as unknown as StarterRow[];
  const { overall, games } = computeEvaluation(rows);

  // Races with at least one result per game (from Query B)
  const racesWithResultsByGame = new Map<string, Set<string>>();
  for (const row of rows) {
    const gameId = row.races?.games?.id;
    const raceId = row.race_id;
    if (gameId && raceId) {
      if (!racesWithResultsByGame.has(gameId)) racesWithResultsByGame.set(gameId, new Set());
      racesWithResultsByGame.get(gameId)!.add(raceId);
    }
  }

  // Total races per game (from Query C)
  const totalRacesByGame = new Map<string, number>();
  for (const race of (allRacesData ?? [])) {
    totalRacesByGame.set(race.game_id, (totalRacesByGame.get(race.game_id) ?? 0) + 1);
  }

  const allGames: GameSummary[] = (allGamesData ?? []).map((g) => {
    const resultRaceCount = racesWithResultsByGame.get(g.id)?.size ?? 0;
    const totalRaceCount = totalRacesByGame.get(g.id) ?? 0;
    return {
      game_id: g.id,
      date: g.date,
      game_type: g.game_type,
      track: g.track,
      has_results: totalRaceCount > 0 && resultRaceCount >= totalRaceCount,
    };
  });

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold">Modell-utvärdering</h1>
        <ThemeToggle />
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <EvaluationPanel overall={overall} games={games} allGames={allGames} />
      </div>
    </main>
  );
}
