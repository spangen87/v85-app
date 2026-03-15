export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  atg_team_url?: string | null;
}

export interface GroupMember {
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface GroupPost {
  id: string;
  group_id: string;
  game_id: string;
  author_id: string;
  author_display_name: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  replies: GroupPost[];
}

export interface Profile {
  id: string;
  display_name: string;
}

export type NoteLabel = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

export type ActivityItem =
  | {
      kind: "post";
      id: string;
      author: string;
      content: string;
      created_at: string;
      game_id: string;
      game_date: string;
      game_type: string;
    }
  | {
      kind: "note";
      id: string;
      author: string;
      content: string;
      created_at: string;
      horse_id: string;
      horse_name: string;
      label: NoteLabel | null;
    };

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
