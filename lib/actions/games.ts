"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function deleteGame(gameId: string): Promise<{ error?: string }> {
  // Auth check — must be logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inte inloggad" };

  // Use service client to bypass RLS (games table only allows service_role writes)
  const db = createServiceClient();
  const { error } = await db.from("games").delete().eq("id", gameId);
  if (error) return { error: error.message };
  return {};
}
