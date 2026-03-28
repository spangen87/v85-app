import { createClient } from "@/lib/supabase/server";
import { MainPageClient } from "@/components/MainPageClient";
import { ResultsButton } from "@/components/ResultsButton";
import { GamePickerBar } from "@/components/GamePickerBar";
import { AutoLoadUpcoming } from "@/components/AutoLoadUpcoming";
import { UserMenu } from "@/components/groups/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UsefulLinks } from "@/components/UsefulLinks";
import { CollapsibleControls } from "@/components/CollapsibleControls";
import { RaceTabBar } from "@/components/RaceTabBar";
import { RaceTabProvider } from "@/components/RaceTabContext";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { getDraftForGame } from "@/lib/actions/systems";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { SystemSelection } from "@/lib/types";

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
  searchParams: Promise<{ game?: string; systemMode?: string; groupId?: string; avd?: string; draft?: string }>;
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

  const initialSystemMode = params.systemMode === '1'
  const initialGroupId = params.groupId ?? null

  // Ladda utkast om draft-param finns, eller det senaste utkastet för spelet
  let draftId: string | null = null
  let initialSelections: SystemSelection[] = []

  if (selectedId) {
    // Om draft-ID angavs explicit i URL, eller leta upp senaste utkast
    const existingDraft = await getDraftForGame(selectedId)
    if (existingDraft) {
      draftId = existingDraft.id
      initialSelections = existingDraft.selections ?? []
    }
  }

  const avdParam = params.avd ? parseInt(params.avd, 10) : NaN;
  const activeRaceNumber = (!isNaN(avdParam) && races.some((r) => r.race_number === avdParam))
    ? avdParam
    : (races[0]?.race_number ?? 1);

  return (
    <RaceTabProvider initialRaceNumber={activeRaceNumber}>
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header: mobilanpassad med 2 rader på små skärmar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-4">
          {/* Rad 1: titel + avatar/tema */}
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold tracking-tight shrink-0">Streckspel Analys</h1>
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <UserMenu
                profile={profile}
                groups={userGroups}
                userEmail={user.email ?? ""}
              />
            </div>
          </div>
          {/* Rad 2: spelkontroller */}
          <CollapsibleControls>
            <GamePickerBar savedGames={games} selectedId={selectedId} />
            <ResultsButton gameId={selectedId} />
          </CollapsibleControls>
        </div>
        {races.length > 0 && (
          <Suspense fallback={<div className="h-10 border-t border-gray-200 dark:border-gray-800" />}>
            <RaceTabBar
              races={races.map((r) => ({ race_number: r.race_number, start_time: r.start_time }))}
            />
          </Suspense>
        )}
      </header>

      {selectedGame && (
        <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800 tracking-wide">
          {selectedGame.date} &middot; {selectedGame.game_type} &middot; {selectedGame.track}
        </div>
      )}

      <div className="px-4 lg:px-[5%] xl:px-[8%] py-6">
        <div className="mb-6">
          <UsefulLinks />
        </div>

        {/* Auto-ladda nästkommande V85/V86 om inga spel finns */}
        {games.length === 0 && <AutoLoadUpcoming />}

        <MainPageClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          races={races as any}
          userGroups={userGroups}
          currentUserId={user.id}
          initialSystemMode={initialSystemMode}
          initialGroupId={initialGroupId}
          gameId={selectedId}
          gameType={selectedGame?.game_type ?? null}
          draftId={draftId}
          initialSelections={initialSelections}
        />
      </div>
    </main>
    </RaceTabProvider>
  );
}
