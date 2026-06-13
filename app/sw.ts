import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any as WorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined };

const serwist = new Serwist({
  precacheEntries: sw.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// --- Web push: visa notis + öppna rätt sida vid klick ---
// Service worker-globalen och event-typerna ligger i webworker-libet som inte
// är aktiverat i tsconfig; vi typar det minimalt här för att hålla workern
// fristående.
interface PushLike {
  data: { json: () => unknown; text: () => string } | null;
  waitUntil: (p: Promise<unknown>) => void;
}
interface NotificationClickLike {
  notification: { close: () => void; data: { url?: string } | null };
  waitUntil: (p: Promise<unknown>) => void;
}
type SwClient = { navigate?: (u: string) => void; focus?: () => unknown };
interface SwScope {
  addEventListener: (type: string, listener: (event: never) => void) => void;
  registration: { showNotification: (title: string, options?: Record<string, unknown>) => Promise<void> };
  clients: {
    matchAll: (opts: { type: string; includeUncontrolled: boolean }) => Promise<SwClient[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
}
const swScope = self as unknown as SwScope;

swScope.addEventListener("push", (event: PushLike) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; tag?: string };
  try {
    payload = (event.data.json() as typeof payload) ?? {};
  } catch {
    payload = { title: "V85 Analys", body: event.data.text() };
  }
  event.waitUntil(
    swScope.registration.showNotification(payload.title ?? "V85 Analys", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/" },
    })
  );
});

swScope.addEventListener("notificationclick", (event: NotificationClickLike) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    swScope.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.focus) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      return swScope.clients.openWindow(url);
    })
  );
});
