"use client";

import { Button } from "@/components/ui";
import { useState, useEffect } from "react";
import { savePushSubscription, deletePushSubscription } from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

/**
 * Knapp för att slå på/av push-notiser (t.ex. "Resultaten är rättade").
 * Renderar inget om VAPID-nyckel saknas eller webbläsaren inte stödjer push.
 */
export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Inledande await gör att all state sätts asynkront (inte synkront i effekten)
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const supported =
        VAPID_PUBLIC_KEY &&
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as unknown as BufferSource,
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const result = await savePushSubscription(
        { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! } },
        navigator.userAgent
      );
      if (result.error) {
        setError(result.error);
        setState("off");
        return;
      }
      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte aktivera notiser");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte stänga av notiser");
      setState("on");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="ta-stack">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p style={{ margin: 0, font: "500 15px/20px var(--font-sans)", color: "var(--ink)" }}>Notiser</p>
          <p className="ta-text-sm">När en omgång är rättad och systemen har fått sina poäng.</p>
        </div>
        {state === "denied" ? (
          <span className="ta-text-sm shrink-0">Blockerat i webbläsaren</span>
        ) : (
          <Button size="sm" onClick={state === "on" ? disable : enable} disabled={state === "working"} aria-pressed={state === "on"}>
            {state === "working" ? "Vänta …" : state === "on" ? "Stäng av" : "Slå på"}
          </Button>
        )}
      </div>
      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
