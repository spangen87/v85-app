export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
}

export type NoteLabel = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

export interface HorseNote {
  id: string;
  horse_id: string;
  group_id: string | null;
  group_name: string | null;
  author_id: string;
  author_display_name: string;
  content: string;
  label: NoteLabel | null;
  parent_id: string | null;
  created_at: string;
  replies: HorseNote[];
}
