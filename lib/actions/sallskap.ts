"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { ActivityItem, GroupMember, NoteLabel } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function getRecentGroupActivity(
  groupId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const db = createServiceClient();

  const [{ data: rawPosts }, { data: rawNotes }] = await Promise.all([
    db
      .from("group_posts")
      .select("id, content, created_at, author_id, game_id")
      .eq("group_id", groupId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    db
      .from("horse_notes")
      .select("id, content, created_at, author_id, horse_id, label")
      .eq("group_id", groupId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const posts = (rawPosts ?? []) as Row[];
  const notes = (rawNotes ?? []) as Row[];

  // Samla alla author-IDs och hämta display_name
  const authorIds = [
    ...new Set([
      ...posts.map((p) => p.author_id as string),
      ...notes.map((n) => n.author_id as string),
    ]),
  ];
  const { data: rawProfiles } =
    authorIds.length > 0
      ? await db.from("profiles").select("id, display_name").in("id", authorIds)
      : { data: [] as Row[] };
  const profiles = (rawProfiles ?? []) as Row[];
  const nameMap = new Map(profiles.map((p) => [p.id as string, (p.display_name ?? "Okänd") as string]));

  // Hämta hästnamn för noter
  const horseIds = [...new Set(notes.map((n) => n.horse_id as string))];
  const { data: rawHorses } =
    horseIds.length > 0
      ? await db.from("horses").select("id, name").in("id", horseIds)
      : { data: [] as Row[] };
  const horses = (rawHorses ?? []) as Row[];
  const horseMap = new Map(horses.map((h) => [h.id as string, h.name as string]));

  // Hämta speldatum och speltyp för forum-inlägg
  const gameIds = [...new Set(posts.map((p) => p.game_id as string))];
  const { data: rawGames } =
    gameIds.length > 0
      ? await db.from("games").select("id, date, game_type").in("id", gameIds)
      : { data: [] as Row[] };
  const gamesRows = (rawGames ?? []) as Row[];
  const gameMap = new Map(
    gamesRows.map((g) => [g.id as string, { date: g.date as string, game_type: g.game_type as string }])
  );

  const result: ActivityItem[] = [
    ...posts.map(
      (p): ActivityItem => ({
        kind: "post",
        id: p.id as string,
        author: nameMap.get(p.author_id as string) ?? "Okänd",
        content: p.content as string,
        created_at: p.created_at as string,
        game_id: p.game_id as string,
        game_date: gameMap.get(p.game_id as string)?.date ?? "",
        game_type: gameMap.get(p.game_id as string)?.game_type ?? "",
      })
    ),
    ...notes.map(
      (n): ActivityItem => ({
        kind: "note",
        id: n.id as string,
        author: nameMap.get(n.author_id as string) ?? "Okänd",
        content: n.content as string,
        created_at: n.created_at as string,
        horse_id: n.horse_id as string,
        horse_name: horseMap.get(n.horse_id as string) ?? "Okänd häst",
        label: (n.label as NoteLabel) ?? null,
      })
    ),
  ];

  return result
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error || !data || data.length === 0) return [];

  const userIds = data.map((row) => row.user_id as string);
  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as Row[]) nameMap.set(p.id as string, (p.display_name ?? "Okänd") as string);

  return (data as Row[]).map((row) => ({
    user_id: row.user_id as string,
    display_name: nameMap.get(row.user_id as string) ?? "Okänd",
    joined_at: row.joined_at as string,
  }));
}
