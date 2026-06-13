import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// Kontaktpunkt som push-tjänsterna kan nå vid problem (mailto: eller https-URL)
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@v85-app.se";

/** True om VAPID-nycklar är konfigurerade — utan dem är push avstängt (no-op). */
export const pushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
}

export interface PushPayload {
  title: string;
  body: string;
  /** Relativ URL som öppnas vid klick (default "/") */
  url?: string;
  tag?: string;
}

/**
 * Skickar en push-notis till samtliga prenumerationer för de angivna
 * användarna. Tysta no-op om VAPID saknas. Utgångna prenumerationer
 * (404/410) städas bort automatiskt. Fel på enskilda utskick sväljs så att
 * ett trasigt abonnemang inte stoppar resten.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  if (!pushConfigured || userIds.length === 0) return { sent: 0, pruned: 0 };

  const db = createServiceClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", [...new Set(userIds)]);

  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          body
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expiredIds.push(s.id as string);
        } else {
          console.warn("[push] sendNotification misslyckades:", err instanceof Error ? err.message : String(err));
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await db.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return { sent, pruned: expiredIds.length };
}
