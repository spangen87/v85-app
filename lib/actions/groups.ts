"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Group, Profile } from "@/lib/types";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Hämta inloggad användare — returnerar null om ej inloggad */
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

export async function updateProfile(displayName: string): Promise<{ error: string | null }> {
  const user = await getAuthUser();
  if (!user) return { error: "Inte inloggad" };

  // Service client bypasses RLS för upsert
  const db = createServiceClient();
  const { error } = await db
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName.trim() });

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
}

export async function getMyGroups(): Promise<Group[]> {
  const user = await getAuthUser();
  if (!user) return [];

  // Service client: hämta membership + grupper för denna user
  const db = createServiceClient();
  const { data } = await db
    .from("group_members")
    .select("groups(id, name, invite_code, created_by, created_at)")
    .eq("user_id", user.id);

  if (!data) return [];
  return data.flatMap((row) => {
    const g = (row.groups as unknown) as Group | null;
    return g ? [g] : [];
  });
}

export async function createGroup(name: string): Promise<{ data: Group | null; error: string | null }> {
  const user = await getAuthUser();
  if (!user) return { data: null, error: "Inte inloggad" };

  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: "Namn krävs" };

  const db = createServiceClient();

  // Skapa grupp med unik inbjudningskod
  let invite_code = generateInviteCode();
  let insertResult = await db
    .from("groups")
    .insert({ name: trimmed, invite_code, created_by: user.id })
    .select()
    .single();

  if (insertResult.error?.code === "23505") {
    invite_code = generateInviteCode();
    insertResult = await db
      .from("groups")
      .insert({ name: trimmed, invite_code, created_by: user.id })
      .select()
      .single();
  }

  if (insertResult.error) return { data: null, error: insertResult.error.message };

  const group = insertResult.data as Group;

  // Lägg till skaparen som medlem
  await db
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  revalidatePath("/");
  return { data: group, error: null };
}

export async function joinGroup(inviteCode: string): Promise<{ data: Group | null; error: string | null }> {
  const user = await getAuthUser();
  if (!user) return { data: null, error: "Inte inloggad" };

  const code = inviteCode.trim().toUpperCase();
  const db = createServiceClient();

  // Service client behövs för att söka grupp via inbjudningskod
  // (SELECT-policyn kräver annars att man redan är medlem)
  const { data: group, error: groupError } = await db
    .from("groups")
    .select("id, name, invite_code, created_by, created_at")
    .eq("invite_code", code)
    .single();

  if (groupError || !group) return { data: null, error: "Ogiltig inbjudningskod" };

  const { error: memberError } = await db
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    if (memberError.code === "23505") return { data: null, error: "Du är redan med i detta sällskap" };
    return { data: null, error: memberError.message };
  }

  revalidatePath("/");
  return { data: group as Group, error: null };
}

export async function leaveGroup(groupId: string): Promise<{ error: string | null }> {
  const user = await getAuthUser();
  if (!user) return { error: "Inte inloggad" };

  const db = createServiceClient();
  const { error } = await db
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { error: null };
}
