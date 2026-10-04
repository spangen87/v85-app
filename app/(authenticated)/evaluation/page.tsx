import { createClient } from "@/lib/supabase/server";
import { isAdmin, getAuthUser } from "@/lib/supabase/guards";
import { EvaluationPanel } from "@/components/EvaluationPanel";
import { computeEvaluation, type EvalStarterRow } from "@/lib/evaluation";
import { PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

interface GameSummary {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  has_results: boolean;
}

export default async function EvaluationPage() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { data: allGamesData } = await supabase
    .from("games")
    .select("id, date, game_type, track")
    .order("date", { ascending: false })
    .limit(100);

  // Alla startande i lopp med formscore (även de som galopperat) — sidvis,
  // Supabase returnerar högst 1 000 rader per anrop
  const rows: EvalStarterRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("starters")
      .select(`
        race_id, start_number, formscore, fundamental_p, finish_position,
        races ( race_number, game_id, games ( id, date, game_type, track ) ),
        horses ( name )
      `)
      .not("formscore", "is", null)
      .order("race_id")
      .order("start_number")
      .range(from, from + 999);
    rows.push(...((page ?? []) as unknown as EvalStarterRow[]));
    if (!page || page.length < 1000) break;
  }

  const { data: allRacesData } = await supabase
    .from("races")
    .select("id, game_id");

  const resultedRacesData: { race_id: string; races: { game_id: string } | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("starters")
      .select("race_id, races(game_id)")
      .not("finish_position", "is", null)
      .order("race_id")
      .order("start_number")
      .range(from, from + 999);
    resultedRacesData.push(...((page ?? []) as unknown as { race_id: string; races: { game_id: string } | null }[]));
    if (!page || page.length < 1000) break;
  }

  const { overall, games } = computeEvaluation(rows);

  const racesWithResultsByGame = new Map<string, Set<string>>();
  for (const row of (resultedRacesData ?? []) as unknown as { race_id: string; races: { game_id: string } | null }[]) {
    const gameId = row.races?.game_id;
    const raceId = row.race_id;
    if (gameId && raceId) {
      if (!racesWithResultsByGame.has(gameId)) racesWithResultsByGame.set(gameId, new Set());
      racesWithResultsByGame.get(gameId)!.add(raceId);
    }
  }

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
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PageHeader title="Utvärdering" sub="Hur ofta modellernas toppval vinner" />
      <div className="ta-page">
        <EvaluationPanel overall={overall} games={games} allGames={allGames} isAdmin={isAdmin(user.id)} />
      </div>
    </main>
  );
}
