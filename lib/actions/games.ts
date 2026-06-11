"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, isAdmin } from "@/lib/supabase/guards";

export async function deleteGame(gameId: string): Promise<{ error?: string }> {
  // Omgångar är delad data för alla användare — endast admin får radera
  const user = await getAuthUser();
  if (!user) return { error: "Inte inloggad" };
  if (!isAdmin(user.id)) return { error: "Endast admin kan ta bort omgångar" };

  // Use service client to bypass RLS (games table only allows service_role writes)
  const db = createServiceClient();
  const { error } = await db.from("games").delete().eq("id", gameId);
  if (error) return { error: error.message };
  return {};
}
