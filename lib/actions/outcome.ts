import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/guards";

/** Ett rättat system i den senaste avgjorda omgången */
export interface GradedSystem {
  id: string;
  name: string;
  score: number;
  total_rows: number;
  author_name: string;
  is_own: boolean;
  group_id: string | null;
  group_name: string | null;
}

export interface GradedOutcome {
  game: { id: string; date: string; track: string | null; game_type: string };
  systems: GradedSystem[];
  /** Högsta antal rätt i omgången */
  bestScore: number;
}

/** Hur länge efter speldagen utfallet visas på startsidan */
const OUTCOME_WINDOW_DAYS = 7;

/**
 * Senaste rättade omgång där användaren eller någon i användarens sällskap
 * hade sparade system. Driver "Resultaten är klara"-bannern på startsidan —
 * återbesökskroken efter en speldag. React-cache():ad per request.
 */
export const getLatestGradedOutcome = cache(async (): Promise<GradedOutcome | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const db = createServiceClient();

  const { data: memberships } = await db
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const groupIds = (memberships ?? []).map((m) => m.group_id as string);

  // Rättade, färdigspelade system som är mina eller ligger i mina sällskap
  const orFilter = groupIds.length
    ? `user_id.eq.${user.id},group_id.in.(${groupIds.join(",")})`
    : `user_id.eq.${user.id}`;

  const windowStart = new Date(Date.now() - OUTCOME_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data: systems, error } = await db
    .from("game_systems")
    .select("id, user_id, group_id, game_id, name, score, total_rows, games(id, date, track, game_type)")
    .eq("is_graded", true)
    .eq("is_draft", false)
    .not("score", "is", null)
    .or(orFilter);
  if (error || !systems || systems.length === 0) return null;

  type Row = (typeof systems)[number] & {
    games: { id: string; date: string; track: string | null; game_type: string } | null;
  };
  const rows = (systems as Row[]).filter(
    (s) => s.games != null && s.games.date >= windowStart
  );
  if (rows.length === 0) return null;

  // Senaste speldatumet med rättade system
  rows.sort((a, b) => (a.games!.date < b.games!.date ? 1 : -1));
  const game = rows[0].games!;
  const gameRows = rows.filter((r) => r.games!.id === game.id);

  // Författarnamn + sällskapsnamn
  const authorIds = Array.from(new Set(gameRows.map((r) => r.user_id as string)));
  const usedGroupIds = Array.from(
    new Set(gameRows.map((r) => r.group_id as string | null).filter((g): g is string => g != null))
  );
  const [{ data: profiles }, { data: groups }] = await Promise.all([
    db.from("profiles").select("id, display_name").in("id", authorIds),
    usedGroupIds.length
      ? db.from("groups").select("id, name").in("id", usedGroupIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const authorName = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string | null]));
  const groupName = new Map((groups ?? []).map((g) => [g.id as string, g.name as string]));

  const graded: GradedSystem[] = gameRows
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      score: r.score as number,
      total_rows: r.total_rows as number,
      author_name: authorName.get(r.user_id as string) ?? "Okänd",
      is_own: r.user_id === user.id,
      group_id: (r.group_id as string | null) ?? null,
      group_name: r.group_id ? groupName.get(r.group_id as string) ?? null : null,
    }))
    .sort((a, b) => b.score - a.score || (a.is_own ? -1 : 1));

  return {
    game: { id: game.id, date: game.date, track: game.track, game_type: game.game_type },
    systems: graded,
    bestScore: graded[0]?.score ?? 0,
  };
});
