import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/guards";

/** En händelse i något av användarens sällskap (annan medlems inlägg/anteckning/system) */
export interface GroupActivityItem {
  type: "post" | "note" | "system";
  group_id: string;
  group_name: string;
  author_name: string;
  created_at: string;
  /** Omgång händelsen hör till (saknas för anteckningar — de sitter på hästen) */
  game_id: string | null;
  /** Innehållsutdrag: inläggstext, anteckningstext eller systemnamn */
  text: string;
  horse_name?: string;
}

export interface GroupActivitySummary {
  /** Antal osedda händelser totalt över användarens sällskap */
  unseenTotal: number;
  /** Antal osedda händelser per sällskap */
  unseenByGroup: Record<string, number>;
  /** Senaste osedda händelserna, nyast först */
  recent: GroupActivityItem[];
}

const EMPTY: GroupActivitySummary = { unseenTotal: 0, unseenByGroup: {}, recent: [] };

/** Hur långt bak vi tittar — äldre händelser räknas aldrig som nya */
const ACTIVITY_WINDOW_DAYS = 30;
/** Max antal händelser i "Nytt i dina sällskap" */
const RECENT_LIMIT = 6;

/**
 * Markerar ett sällskap som besökt — händelser fram till nu räknas som sedda.
 * Anropas från sällskapssidan (server) när användaren öppnar den.
 */
export async function markGroupSeen(groupId: string): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const db = createServiceClient();
  await db
    .from("group_last_seen")
    .upsert(
      { user_id: user.id, group_id: groupId, seen_at: new Date().toISOString() },
      { onConflict: "user_id,group_id" }
    );
}

/**
 * Osedda händelser i användarens sällskap: foruminlägg, anteckningar och
 * sparade system skapade av andra medlemmar efter användarens senaste besök.
 * Utan tidigare besök räknas allt inom aktivitetsfönstret som nytt.
 *
 * React-cache():ad — layout, navigering och startsida kan alla anropa utan
 * dubbla databasfrågor inom samma request.
 */
export const getGroupActivity = cache(async (): Promise<GroupActivitySummary> => {
  const user = await getAuthUser();
  if (!user) return EMPTY;

  const db = createServiceClient();

  // Användarens sällskap + senaste besök
  const [{ data: memberships }, { data: seenRows }] = await Promise.all([
    db.from("group_members").select("group_id").eq("user_id", user.id),
    db.from("group_last_seen").select("group_id, seen_at").eq("user_id", user.id),
  ]);
  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  if (groupIds.length === 0) return EMPTY;

  const windowStart = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86_400_000).toISOString();
  const seenAt = new Map((seenRows ?? []).map((r) => [r.group_id as string, r.seen_at as string]));
  // Brytpunkt per grupp: senaste besöket, dock aldrig äldre än fönstret
  const cutoff = (groupId: string) => {
    const seen = seenAt.get(groupId);
    return seen && seen > windowStart ? seen : windowStart;
  };

  // Hämta kandidater per typ inom fönstret (per-grupp-cutoff filtreras efteråt)
  const [{ data: posts }, { data: notes }, { data: systems }, { data: groups }] =
    await Promise.all([
      db
        .from("group_posts")
        .select("group_id, game_id, author_id, content, created_at")
        .in("group_id", groupIds)
        .neq("author_id", user.id)
        .gt("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("horse_notes")
        .select("group_id, author_id, content, created_at, horses(name)")
        .in("group_id", groupIds)
        .neq("author_id", user.id)
        .gt("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("game_systems")
        .select("group_id, game_id, user_id, name, created_at")
        .in("group_id", groupIds)
        .neq("user_id", user.id)
        .gt("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("groups").select("id, name").in("id", groupIds),
    ]);

  const groupName = new Map((groups ?? []).map((g) => [g.id as string, g.name as string]));

  type Raw = {
    type: GroupActivityItem["type"];
    group_id: string;
    author_id: string;
    created_at: string;
    game_id: string | null;
    text: string;
    horse_name?: string;
  };
  const all: Raw[] = [
    ...(posts ?? []).map((p) => ({
      type: "post" as const,
      group_id: p.group_id as string,
      author_id: p.author_id as string,
      created_at: p.created_at as string,
      game_id: (p.game_id as string) ?? null,
      text: p.content as string,
    })),
    ...(notes ?? []).map((n) => ({
      type: "note" as const,
      group_id: n.group_id as string,
      author_id: n.author_id as string,
      created_at: n.created_at as string,
      game_id: null,
      text: n.content as string,
      horse_name: (n.horses as unknown as { name: string } | null)?.name,
    })),
    ...(systems ?? []).map((s) => ({
      type: "system" as const,
      group_id: s.group_id as string,
      author_id: s.user_id as string,
      created_at: s.created_at as string,
      game_id: (s.game_id as string) ?? null,
      text: s.name as string,
    })),
  ];

  // Osett = nyare än användarens senaste besök i respektive sällskap
  const unseen = all.filter((item) => item.created_at > cutoff(item.group_id));

  const unseenByGroup: Record<string, number> = {};
  for (const item of unseen) {
    unseenByGroup[item.group_id] = (unseenByGroup[item.group_id] ?? 0) + 1;
  }

  unseen.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const top = unseen.slice(0, RECENT_LIMIT);

  // Författarnamn endast för de som visas
  const authorIds = Array.from(new Set(top.map((t) => t.author_id)));
  const { data: profiles } = authorIds.length
    ? await db.from("profiles").select("id, display_name").in("id", authorIds)
    : { data: [] };
  const authorName = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.display_name as string | null])
  );

  return {
    unseenTotal: unseen.length,
    unseenByGroup,
    recent: top.map((t) => ({
      type: t.type,
      group_id: t.group_id,
      group_name: groupName.get(t.group_id) ?? "Sällskap",
      author_name: authorName.get(t.author_id) ?? "Okänd",
      created_at: t.created_at,
      game_id: t.game_id,
      text: t.text,
      horse_name: t.horse_name,
    })),
  };
});
