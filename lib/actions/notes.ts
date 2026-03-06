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

export interface HorseWithNotes {
  horse_id: string;
  horse_name: string;
  start_number: number;
  notes: HorseNote[];
}

export interface RaceWithNotes {
  race_number: number;
  race_name: string | null;
  start_time: string | null;
  horses: HorseWithNotes[];
}

/** Hämta alla grupphästanteckningar för hästar som deltar i ett specifikt spel */
export async function getGroupNotesForGame(
  groupId: string,
  gameId: string
): Promise<RaceWithNotes[]> {
  const supabase = await createClient();

  // Hämta alla starters i spelet med löp- och hästinfo
  const { data: races } = await supabase
    .from("races")
    .select("race_number, race_name, start_time, starters ( horse_id, start_number, horses ( name ) )")
    .eq("game_id", gameId)
    .order("race_number");

  if (!races || races.length === 0) return [];

  // Samla alla horse_ids
  const horseIds: string[] = [];
  for (const race of races) {
    for (const s of (race.starters as { horse_id: string }[])) {
      horseIds.push(s.horse_id);
    }
  }
  if (horseIds.length === 0) return [];

  // Hämta alla grupphästanteckningar för dessa hästar
  const { data: notesData } = await supabase
    .from("horse_notes")
    .select(`
      id, horse_id, group_id, author_id, content, label, parent_id, created_at,
      groups ( name ),
      profiles ( display_name )
    `)
    .eq("group_id", groupId)
    .in("horse_id", horseIds)
    .order("created_at", { ascending: true });

  if (!notesData || notesData.length === 0) return [];

  const rawNotes = notesData as unknown as RawNote[];

  // Bygg trådad struktur per häst
  const notesByHorse = new Map<string, HorseNote[]>();

  const repliesMap = new Map<string, HorseNote[]>();
  for (const raw of rawNotes) {
    if (raw.parent_id) {
      const arr = repliesMap.get(raw.parent_id) ?? [];
      arr.push(mapNote(raw));
      repliesMap.set(raw.parent_id, arr);
    }
  }
  for (const raw of rawNotes) {
    if (!raw.parent_id) {
      const note = mapNote(raw, repliesMap.get(raw.id) ?? []);
      const arr = notesByHorse.get(raw.horse_id) ?? [];
      arr.push(note);
      notesByHorse.set(raw.horse_id, arr);
    }
  }

  // Bygg resultat per lopp, bara hästar med anteckningar
  const result: RaceWithNotes[] = [];

  for (const race of races) {
    const starters = race.starters as unknown as { horse_id: string; start_number: number; horses: { name: string } | null }[];
    const horsesWithNotes: HorseWithNotes[] = [];

    for (const starter of starters) {
      const notes = notesByHorse.get(starter.horse_id);
      if (notes && notes.length > 0) {
        horsesWithNotes.push({
          horse_id: starter.horse_id,
          horse_name: starter.horses?.name ?? starter.horse_id,
          start_number: starter.start_number,
          notes,
        });
      }
    }

    if (horsesWithNotes.length > 0) {
      horsesWithNotes.sort((a, b) => a.start_number - b.start_number);
      result.push({
        race_number: race.race_number as number,
        race_name: race.race_name as string | null,
        start_time: race.start_time as string | null,
        horses: horsesWithNotes,
      });
    }
  }

  return result;
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
