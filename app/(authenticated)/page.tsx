import { createClient } from "@/lib/supabase/server";
import { MainPageClient } from "@/components/MainPageClient";
import { GamePickerBar } from "@/components/GamePickerBar";
import { AutoLoadUpcoming } from "@/components/AutoLoadUpcoming";
import { UsefulLinks } from "@/components/UsefulLinks";
import { RaceTabProvider } from "@/components/RaceTabContext";
import { getMyGroups } from "@/lib/actions/groups";
import { getGroupActivity } from "@/lib/actions/activity";
import { GroupActivitySection } from "@/components/groups/GroupActivitySection";
import { getLatestGradedOutcome } from "@/lib/actions/outcome";
import { SystemOutcomeBanner } from "@/components/SystemOutcomeBanner";
import { getDraftForGame } from "@/lib/actions/systems";
import { getNoteCountsForHorses } from "@/lib/actions/notes";
import { getGamePostSummary } from "@/lib/actions/posts";
import { getTrackConfig } from "@/lib/actions/tracks";
import { getAuthUser } from "@/lib/supabase/guards";
import { redirect } from "next/navigation";
import { parseHastParam } from "@/lib/raceView";
import Link from "next/link";
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
      id, race_number, race_name, distance, start_method, start_time, breed, first_prize,
      starters (
        id, start_number, post_position, horse_id,
        driver, driver_win_pct, trainer, trainer_win_pct,
        odds, p_odds, bet_distribution,
        shoes_reported, shoes_front, shoes_back, shoes_front_changed, shoes_back_changed,
        sulky_type, horse_age, horse_sex, horse_color, pedigree_father, home_track,
        starts_total, wins_total, places_2nd, places_3rd, earnings_total,
        starts_current_year, wins_current_year, places_2nd_current_year, places_3rd_current_year,
        starts_prev_year, wins_prev_year, places_2nd_prev_year, places_3rd_prev_year,
        best_time, last_5_results, start_distance, start_points, horse_starts_history,
        life_records, formscore, finish_position, finish_time,
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
  searchParams: Promise<{ game?: string; systemMode?: string; groupId?: string; avd?: string; draft?: string; hast?: string }>;
}) {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [games, userGroups, activity, gradedOutcome] = await Promise.all([
    getAllGames(supabase),
    getMyGroups(),
    getGroupActivity(),
    getLatestGradedOutcome(),
  ]);

  // Välj spel: URL-param → senaste sparade
  const selectedId = params.game && games.find((g) => g.id === params.game)
    ? params.game
    : games[0]?.id ?? null;

  const selectedGame = games.find((g) => g.id === selectedId) ?? null;

  // Allt som bara beror på vald omgång hämtas parallellt i ett svep —
  // forumlänk, bandata och senaste utkast behöver inte vänta på loppdatan.
  const [races, postSummary, trackConfig, existingDraft] = await Promise.all([
    selectedId ? getRaces(supabase, selectedId) : Promise.resolve([]),
    selectedId ? getGamePostSummary(selectedId) : Promise.resolve(null),
    selectedGame ? getTrackConfig(selectedGame.track) : Promise.resolve(null),
    selectedId ? getDraftForGame(selectedId) : Promise.resolve(null),
  ]) as [
    Awaited<ReturnType<typeof getRaces>>,
    Awaited<ReturnType<typeof getGamePostSummary>>,
    TrackConfig | null,
    Awaited<ReturnType<typeof getDraftForGame>>,
  ];

  // Anteckningsantal per häst behöver häst-id:n från loppdatan
  const horseIds = Array.from(
    new Set(races.flatMap((r) => (r.starters ?? []).map((s: { horse_id: string }) => s.horse_id)))
  );
  const noteCounts: Record<string, number> = horseIds.length
    ? await getNoteCountsForHorses(horseIds)
    : {};

  const initialGroupId = params.groupId ?? null

  // Ladda senaste utkastet för spelet (hämtat ovan)
  const draftId: string | null = existingDraft?.id ?? null
  const initialSelections: SystemSelection[] = existingDraft?.selections ?? []

  const avdParam = params.avd ? parseInt(params.avd, 10) : NaN;
  // ?hast=<avd>-<nr> öppnar en häst direkt och vinner över ?avd=
  const hast = parseHastParam(params.hast ?? null, races);
  const activeRaceNumber = hast
    ? hast.race
    : (!isNaN(avdParam) && races.some((r) => r.race_number === avdParam))
      ? avdParam
      : (races[0]?.race_number ?? 1);

  // key per omgång: system, utkast och flikar får inte följa med till nästa omgång
  return (
    <RaceTabProvider key={selectedId ?? "none"} initialRaceNumber={activeRaceNumber}>
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <header className="sticky top-0 z-30 md:static" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-5">
          <div className="flex-1 min-w-0">
            <GamePickerBar savedGames={games} selectedId={selectedId} firstStartTime={races[0]?.start_time ?? null} />
          </div>
          <Link href="/manual" aria-label="Hjälp och manual" className="md:hidden w-10 h-10 rounded-md grid place-items-center"
            style={{ background: "var(--surface-sunken)", color: "var(--ink)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9" /><path d="M12 17.2v.1" />
            </svg>
          </Link>
        </div>
        {postSummary && selectedId && (
          <div className="px-4 pb-3 md:px-8">
            <Link href={`/sallskap/${postSummary.group_id}?game=${selectedId}`} className="ta-link">
              {`${postSummary.count} inlägg om omgången i sällskapet`}
            </Link>
          </div>
        )}
      </header>

      <div className="px-4 md:px-8 py-4 max-w-[1440px] mx-auto">
        <SystemOutcomeBanner outcome={gradedOutcome} />
        <GroupActivitySection activity={activity} />

        <div className="mb-6">
          <UsefulLinks />
        </div>

        {games.length === 0 && <AutoLoadUpcoming />}

        <MainPageClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          races={races as any}
          userGroups={userGroups}
          currentUserId={user.id}
          initialGroupId={initialGroupId}
          gameId={selectedId}
          gameType={selectedGame?.game_type ?? null}
          draftId={draftId}
          initialSelections={initialSelections}
          trackConfig={trackConfig}
          noteCounts={noteCounts}
          initialDetail={hast?.start ?? null}
        />
      </div>
    </main>
    </RaceTabProvider>
  );
}
