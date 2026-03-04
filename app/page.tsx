import { createClient } from "@/lib/supabase/server";
import { RaceList } from "@/components/RaceList";
import { FetchButton } from "@/components/FetchButton";
import { GameSelector } from "@/components/GameSelector";
import { redirect } from "next/navigation";

async function getAllGames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("games")
    .select("id, date, track")
    .order("date", { ascending: false });
  return data ?? [];
}

async function getRaces(supabase: Awaited<ReturnType<typeof createClient>>, gameId: string) {
  const { data, error } = await supabase
    .from("races")
    .select(`
      id, race_number, distance, start_method,
      starters (
        id, start_number, horse_id, driver, trainer, odds, bet_distribution,
        starts_total, wins_total, starts_current_year, wins_current_year,
        starts_prev_year, wins_prev_year,
        best_time, last_5_results, life_records, formscore,
        horses ( name )
      )
    `)
    .eq("game_id", gameId)
    .order("race_number");
  if (error) console.error("getRaces error:", error.message);
  return data ?? [];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const games = await getAllGames(supabase);

  // Välj spel: URL-param → senaste sparade
  const selectedId = params.game && games.find((g) => g.id === params.game)
    ? params.game
    : games[0]?.id ?? null;

  const selectedGame = games.find((g) => g.id === selectedId) ?? null;
  const races = selectedId ? await getRaces(supabase, selectedId) : [];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold shrink-0">V85 Analys</h1>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <GameSelector games={games} selectedId={selectedId} />
          <FetchButton />
        </div>
      </header>

      {selectedGame && (
        <div className="px-6 py-2 text-sm text-gray-400 border-b border-gray-800">
          {selectedGame.date} &middot; {selectedGame.track}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {races.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">Ingen V85-data inladdad ännu.</p>
            <p className="text-sm">
              Välj ett datum och klicka &quot;Hämta V85&quot; för att ladda en omgång från ATG.
            </p>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <RaceList races={races as any} />
        )}
      </div>
    </main>
  );
}
