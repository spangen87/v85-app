import { createClient } from "@/lib/supabase/server";
import { RaceList } from "@/components/RaceList";
import { FetchButton } from "@/components/FetchButton";
import { ResultsButton } from "@/components/ResultsButton";
import { GameSelector } from "@/components/GameSelector";
import { UserMenu } from "@/components/groups/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UsefulLinks } from "@/components/UsefulLinks";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getAllGames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("games")
    .select("id, date, track, game_type")
    .order("date", { ascending: false });
  return data ?? [];
}

async function getRaces(supabase: Awaited<ReturnType<typeof createClient>>, gameId: string) {
  const { data, error } = await supabase
    .from("races")
    .select(`
      id, race_number, race_name, distance, start_method, start_time,
      starters (
        id, start_number, post_position, horse_id,
        driver, driver_win_pct, trainer, trainer_win_pct,
        odds, p_odds, bet_distribution,
        shoes_reported, shoes_front, shoes_back, shoes_front_changed, shoes_back_changed,
        sulky_type, horse_age, horse_sex, horse_color, pedigree_father, home_track,
        starts_total, wins_total, places_2nd, places_3rd, earnings_total,
        starts_current_year, wins_current_year, places_2nd_current_year, places_3rd_current_year,
        starts_prev_year, wins_prev_year, places_2nd_prev_year, places_3rd_prev_year,
        best_time, last_5_results, life_records, formscore, finish_position, finish_time,
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
  const [games, profile, userGroups] = await Promise.all([
    getAllGames(supabase),
    getProfile(),
    getMyGroups(),
  ]);

  // Välj spel: URL-param → senaste sparade
  const selectedId = params.game && games.find((g) => g.id === params.game)
    ? params.game
    : games[0]?.id ?? null;

  const selectedGame = games.find((g) => g.id === selectedId) ?? null;
  const races = selectedId ? await getRaces(supabase, selectedId) : [];

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold shrink-0">Streckspel Analys</h1>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <Link
            href="/evaluation"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition shrink-0"
          >
            Utvärdering
          </Link>
          <GameSelector games={games} selectedId={selectedId} />
          <ResultsButton gameId={selectedId} />
          <FetchButton />
          <ThemeToggle />
          <UserMenu
            profile={profile}
            groups={userGroups}
            userEmail={user.email ?? ""}
          />
        </div>
      </header>

      {selectedGame && (
        <div className="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
          {selectedGame.date} &middot; {selectedGame.game_type} &middot; {selectedGame.track}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <UsefulLinks />
        </div>

        {races.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <p className="text-lg mb-2">Ingen data inladdad ännu.</p>
            <p className="text-sm">
              Välj ett datum och klicka på ett spel för att ladda en omgång från ATG.
            </p>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <RaceList races={races as any} userGroups={userGroups} currentUserId={user.id} />
        )}
      </div>
    </main>
  );
}
