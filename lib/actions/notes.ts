"use server";

import { createClient } from "@/lib/supabase/server";
import type { HorseNote, NoteLabel } from "@/lib/types";

type RawNote = {
  id: string;
  horse_id: string;
  group_id: string | null;
  author_id: string;
  content: string;
  label: NoteLabel | null;
  parent_id: string | null;
  created_at: string;
  groups: { name: string } | null;
  profiles: { display_name: string } | null;
};

function mapNote(raw: RawNote, replies: HorseNote[] = []): HorseNote {
  return {
    id: raw.id,
    horse_id: raw.horse_id,
    group_id: raw.group_id,
    group_name: raw.groups?.name ?? null,
    author_id: raw.author_id,
    author_display_name: raw.profiles?.display_name ?? "Okänd",
    content: raw.content,
    label: raw.label,
    parent_id: raw.parent_id,
    created_at: raw.created_at,
    replies,
  };
}

export async function getHorseNotes(horseId: string): Promise<HorseNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("horse_notes")
    .select(`
      id, horse_id, group_id, author_id, content, label, parent_id, created_at,
      groups ( name ),
      profiles ( display_name )
    `)
    .eq("horse_id", horseId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const raws = data as unknown as RawNote[];

  // Group replies under their parents
  const topLevel: HorseNote[] = [];
  const repliesMap = new Map<string, HorseNote[]>();

  for (const raw of raws) {
    if (raw.parent_id) {
      const arr = repliesMap.get(raw.parent_id) ?? [];
      arr.push(mapNote(raw));
      repliesMap.set(raw.parent_id, arr);
    }
  }

  for (const raw of raws) {
    if (!raw.parent_id) {
      topLevel.push(mapNote(raw, repliesMap.get(raw.id) ?? []));
    }
  }

  return topLevel;
}

export async function addNote(
  horseId: string,
  groupId: string | null,
  content: string,
  label: NoteLabel | null,
  parentId?: string
): Promise<{ data: HorseNote | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Inte inloggad" };

  const trimmed = content.trim();
  if (!trimmed) return { data: null, error: "Innehåll krävs" };

  const { data, error } = await supabase
    .from("horse_notes")
    .insert({
      horse_id: horseId,
      group_id: groupId,
      author_id: user.id,
      content: trimmed,
      label: label ?? null,
      parent_id: parentId ?? null,
    })
    .select(`
      id, horse_id, group_id, author_id, content, label, parent_id, created_at,
      groups ( name ),
      profiles ( display_name )
    `)
    .single();

  if (error) return { data: null, error: error.message };

  return { data: mapNote(data as unknown as RawNote), error: null };
}

export async function deleteNote(noteId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  const { error } = await supabase
    .from("horse_notes")
    .delete()
    .eq("id", noteId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
