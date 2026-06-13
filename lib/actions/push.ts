"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/guards";

export interface SerializedSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Sparar (eller uppdaterar) en push-prenumeration för inloggad användare. */
export async function savePushSubscription(
  sub: SerializedSubscription,
  userAgent?: string
): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Ej inloggad" };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Ogiltig prenumeration" };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: "endpoint" }
    );

  if (error) return { error: error.message };
  return {};
}

/** Tar bort en prenumeration (när användaren stänger av notiser). */
export async function deletePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Ej inloggad" };

  const db = createServiceClient();
  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}
