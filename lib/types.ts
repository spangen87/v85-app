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

export interface SystemHorse {
  horse_id: string;      // ATG horse_id — används för grading-matchning
  start_number: number;  // Visas i kvittoformat
  horse_name: string;    // Visas om bara en häst är vald i en avd.
}

export interface ActivityItem {
  id: string;
  kind: 'post' | 'note';
  created_at: string;
  content: string;
  author: string;
  game_id: string;
  game_type: string;
  game_date: string | null;
  label: string;
  horse_name: string | null;
}

export interface SystemSelection {
  race_number: number;
  horses: SystemHorse[];
}

export interface GameSystem {
  id: string;
  user_id: string;
  group_id: string | null;  // null = privat system
  game_id: string;
  name: string;
  selections: SystemSelection[];
  total_rows: number;
  score: number | null;
  is_graded: boolean;
  group_name?: string | null;        // null = privat system
  created_at: string;
  author_display_name?: string;
}
