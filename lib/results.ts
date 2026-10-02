import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGameResults } from "@/lib/atg";
import { gradeSystemsForGame } from "@/lib/systems";
import { sendPushToUsers } from "@/lib/push";

export type StoreResultsOutcome =
  | { status: "ok"; updated: number; races: number }
  | { status: "not_ready" }
  | { status: "not_found"; error: string };

/**
 * Skickar resultatnotis till medlemmar i sällskap som fick nyrättade system.
 * Körs bara när minst ett system faktiskt nyrättades, så upprepade
 * resultathämtningar inte ger dubbla notiser. Icke-fatal.
 */
async function notifyGradedGroups(
  db: SupabaseClient,
  gameId: string,
  groupIds: string[]
) {
  if (groupIds.length === 0) return;

  const { data: game } = await db
    .from("games")
    .select("game_type, date, track")
    .eq("id", gameId)
    .single();

  const { data: members } = await db
    .from("group_members")
    .select("user_id")
    .in("group_id", groupIds);
  const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
  if (userIds.length === 0) return;

  const label = game ? `${game.game_type} ${game.date}` : "omgången";
  await sendPushToUsers(userIds, {
    title: "Resultaten är rättade 🏆",
    body: `${label} är avgjord — se hur ditt sällskap gick.`,
    url: "/",
    tag: `results-${gameId}`,
  });
}

/**
 * Hämtar en omgångs resultat från ATG, sparar slutplacering och km-tid per
 * starter, rättar sparade system och (valfritt) skickar resultatnotis.
 * Används av resultatknapparna och av den schemalagda resultathämtningen.
 */
export async function fetchAndStoreResults(
  supabase: SupabaseClient,
  gameId: string,
  { notify = true }: { notify?: boolean } = {}
): Promise<StoreResultsOutcome> {
  const gameResults = await fetchGameResults(gameId);
  if (!gameResults.is_complete) return { status: "not_ready" };

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .single();
  if (!game) {
    return { status: "not_found", error: "Spelet finns inte i databasen. Hämta det först." };
  }

  const { data: races } = await supabase
    .from("races")
    .select("id, race_number")
    .eq("game_id", gameId)
    .order("race_number");
  if (!races || races.length === 0) {
    return { status: "not_found", error: "Inga avdelningar hittades" };
  }

  // race_number är 1-baserat, race_index från ATG är 0-baserat
  const raceIdByIndex: Record<number, string> = Object.fromEntries(
    races.map((r) => [r.race_number - 1, r.id])
  );

  let updated = 0;
  const racesSeen = new Set<number>();

  for (const result of gameResults.results) {
    const raceId = raceIdByIndex[result.race_index];
    if (!raceId) continue;

    const { error } = await supabase
      .from("starters")
      .update({
        finish_position: result.finish_position,
        finish_time: result.finish_time,
      })
      .eq("race_id", raceId)
      .eq("start_number", result.start_number);

    if (!error && result.finish_position !== null) {
      updated++;
      racesSeen.add(result.race_index);
    }
  }

  // Rätta sparade system (isolerat — fel här ska inte påverka resultatet)
  try {
    const newlyGradedGroups = await gradeSystemsForGame(supabase, gameId);
    if (notify) await notifyGradedGroups(supabase, gameId, newlyGradedGroups);
  } catch (err) {
    console.warn("[results] gradeSystemsForGame/notify failed (non-fatal):", err);
  }

  return { status: "ok", updated, races: racesSeen.size };
}
