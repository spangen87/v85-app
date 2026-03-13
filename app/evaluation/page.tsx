import { createClient } from "@/lib/supabase/server";
import { EvaluationPanel } from "@/components/EvaluationPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  const { data } = await supabase
    .from("starters")
    .select(`
      race_id, start_number, formscore, finish_position,
      races ( race_number, game_id, games ( id, date, game_type, track ) ),
      horses ( name )
    `)
    .not("formscore", "is", null)
    .not("finish_position", "is", null);

  const rows = (data ?? []) as unknown as StarterRow[];
  const { overall, games } = computeEvaluation(rows);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition"
          >
            ← Tillbaka
          </Link>
          <h1 className="text-xl font-bold">Modell-utvärdering</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <EvaluationPanel overall={overall} games={games} />
      </div>
    </main>
  );
}
