import { cache } from "react";
import { createClient, createServiceClient } from "./server";

/**
 * Hämtar inloggad användare via session-cookies, eller null.
 *
 * React-cache():ad — `auth.getUser()` är ett nätverksanrop till Supabase
 * Auth-servern som validerar JWT:n. Under en sidrendering anropas det från
 * layout, TopNav, sidan själv och flera server-actions; cachen deduplicerar
 * allt till ett enda anrop per request.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** True om användaren är medlem i sällskapet. Körs med service-klient (RLS kringgås). */
export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const db = createServiceClient();
  const { data } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data != null;
}

/** True om användaren finns i ADMIN_USER_IDS (kommaseparerad miljövariabel). */
export function isAdmin(userId: string): boolean {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}
