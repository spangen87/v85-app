"use server";

import { createClient } from "@/lib/supabase/server";
import type { GroupPost } from "@/lib/types";

type RawPost = {
  id: string;
  group_id: string;
  game_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
};

async function fetchDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authorIds: string[]
): Promise<Map<string, string>> {
  if (authorIds.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", authorIds);
  const map = new Map<string, string>();
  for (const p of data ?? []) map.set(p.id, p.display_name ?? "Okänd");
  return map;
}

function mapPost(raw: RawPost, displayName: string, replies: GroupPost[] = []): GroupPost {
  return {
    id: raw.id,
    group_id: raw.group_id,
    game_id: raw.game_id,
    author_id: raw.author_id,
    author_display_name: displayName,
    content: raw.content,
    parent_id: raw.parent_id,
    created_at: raw.created_at,
    replies,
  };
}

export async function getGroupPosts(groupId: string, gameId: string): Promise<GroupPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_posts")
    .select("id, group_id, game_id, author_id, content, parent_id, created_at")
    .eq("group_id", groupId)
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const raws = data as RawPost[];
  const uniqueAuthorIds = [...new Set(raws.map((r) => r.author_id))];
  const names = await fetchDisplayNames(supabase, uniqueAuthorIds);

  const repliesMap = new Map<string, GroupPost[]>();
  for (const raw of raws) {
    if (raw.parent_id) {
      const arr = repliesMap.get(raw.parent_id) ?? [];
      arr.push(mapPost(raw, names.get(raw.author_id) ?? "Okänd"));
      repliesMap.set(raw.parent_id, arr);
    }
  }

  const topLevel: GroupPost[] = [];
  for (const raw of raws) {
    if (!raw.parent_id) {
      topLevel.push(mapPost(raw, names.get(raw.author_id) ?? "Okänd", repliesMap.get(raw.id) ?? []));
    }
  }

  return topLevel;
}

export async function addPost(
  groupId: string,
  gameId: string,
  content: string,
  parentId?: string
): Promise<{ data: GroupPost | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Inte inloggad" };

  const trimmed = content.trim();
  if (!trimmed) return { data: null, error: "Innehåll krävs" };

  const { data, error } = await supabase
    .from("group_posts")
    .insert({
      group_id: groupId,
      game_id: gameId,
      author_id: user.id,
      content: trimmed,
      parent_id: parentId ?? null,
    })
    .select("id, group_id, game_id, author_id, content, parent_id, created_at")
    .single();

  if (error) return { data: null, error: error.message };

  const raw = data as RawPost;
  const names = await fetchDisplayNames(supabase, [raw.author_id]);
  return { data: mapPost(raw, names.get(raw.author_id) ?? "Okänd"), error: null };
}

export async function deletePost(postId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { error } = await supabase
    .from("group_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export interface GamePostSummary {
  group_id: string;
  group_name: string;
  count: number;
}

/**
 * Sammanfattning av forumdiskussionen om en omgång för länken i loppvyn.
 * Returnerar det av användarens sällskap som har flest inlägg om omgången
 * (RLS begränsar till sällskap användaren är medlem i), eller null om inga
 * inlägg finns. Driver "💬 N inlägg om omgången"-länken på startsidan.
 */
export async function getGamePostSummary(gameId: string): Promise<GamePostSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_posts")
    .select("group_id, groups(name)")
    .eq("game_id", gameId);

  if (error || !data || data.length === 0) return null;

  const counts = new Map<string, { name: string; count: number }>();
  for (const row of data as unknown as { group_id: string; groups: { name: string } | null }[]) {
    const entry = counts.get(row.group_id) ?? { name: row.groups?.name ?? "Sällskap", count: 0 };
    entry.count += 1;
    counts.set(row.group_id, entry);
  }

  let best: GamePostSummary | null = null;
  for (const [group_id, { name, count }] of counts) {
    if (!best || count > best.count) best = { group_id, group_name: name, count };
  }
  return best;
}
