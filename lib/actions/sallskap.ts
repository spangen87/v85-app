"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { GroupMember, ActivityItem } from "@/lib/types";

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
  for (const p of profiles ?? []) nameMap.set(p.id, p.display_name ?? "Okänd");

  return data.map((row) => ({
    user_id: row.user_id as string,
    display_name: nameMap.get(row.user_id as string) ?? "Okänd",
    joined_at: row.joined_at as string,
  }));
}

export async function getRecentGroupActivity(
  _groupId: string
): Promise<ActivityItem[]> {
  return []
}

