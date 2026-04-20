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
import { getTrackConfig } from "@/lib/actions/tracks";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { SystemSelection, TrackConfig } from "@/lib/types";

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

  const trackConfig: TrackConfig | null = selectedGame
    ? await getTrackConfig(selectedGame.track)
    : null;

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
    <main className="min-h-screen" style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: "color-mix(in oklab, var(--tn-bg) 88%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--tn-border)",
        }}
      >
        <div className="px-4 pt-3 pb-2">
          {/* Brand row (mobile only — desktop has TopNav) */}
          <div className="flex items-center justify-between md:hidden">
            <div className="flex items-baseline gap-2">
              <span className="tn-brand-mark text-xl">Travappen</span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--tn-accent)", transform: "translateY(-3px)" }}
              />
              {selectedGame && (
                <span
                  className="tn-mono text-xs ml-1"
                  style={{ color: "var(--tn-text-faint)" }}
                >
                  {selectedGame.game_type}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu
                profile={profile}
                groups={userGroups}
                userEmail={user.email ?? ""}
              />
            </div>
          </div>
          {/* Game controls */}
          <div className="mt-2 md:mt-0">
            <CollapsibleControls>
              <GamePickerBar savedGames={games} selectedId={selectedId} />
              <ResultsButton gameId={selectedId} />
            </CollapsibleControls>
          </div>
        </div>

        {/* Game meta bar */}
        {selectedGame && (
          <div
            className="px-4 py-1.5 tn-mono text-xs flex items-center gap-2"
            style={{ color: "var(--tn-text-faint)", borderTop: "1px solid var(--tn-border)" }}
          >
            <span>{selectedGame.date}</span>
            <span style={{ color: "var(--tn-border-strong)" }}>·</span>
            <span style={{ color: "var(--tn-accent)", fontWeight: 600 }}>{selectedGame.game_type}</span>
            <span style={{ color: "var(--tn-border-strong)" }}>·</span>
            <span>{selectedGame.track}</span>
          </div>
        )}

        {races.length > 0 && (
          <Suspense fallback={<div className="h-10" style={{ borderTop: "1px solid var(--tn-border)" }} />}>
            <RaceTabBar
              races={races.map((r) => ({ race_number: r.race_number, start_time: r.start_time }))}
            />
          </Suspense>
        )}
      </header>

      <div className="px-4 lg:px-[5%] xl:px-[8%] py-6">
        <div className="mb-6">
          <UsefulLinks />
        </div>

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
          trackConfig={trackConfig}
        />
      </div>
    </main>
    </RaceTabProvider>
  );
}
