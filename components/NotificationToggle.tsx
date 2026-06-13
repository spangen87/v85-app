"use client";

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
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--tn-text)" }}>Notiser</p>
          <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            Få en pushnotis när en omgång rättats och systemen fått sina poäng.
          </p>
        </div>
        {state === "denied" ? (
          <span className="text-xs shrink-0" style={{ color: "var(--tn-text-faint)" }}>Blockerat i webbläsaren</span>
        ) : (
          <button
            onClick={state === "on" ? disable : enable}
            disabled={state === "working"}
            className="text-sm font-semibold rounded-lg transition shrink-0 disabled:opacity-50"
            style={{
              padding: "6px 14px",
              background: state === "on" ? "var(--tn-bg-chip)" : "var(--tn-accent-faint)",
              border: `1px solid ${state === "on" ? "var(--tn-border)" : "var(--tn-accent-soft)"}`,
              color: state === "on" ? "var(--tn-text-dim)" : "var(--tn-accent)",
              cursor: "pointer",
            }}
          >
            {state === "working" ? "…" : state === "on" ? "Av" : "Slå på"}
          </button>
        )}
      </div>
      {error && <p className="text-xs mt-1" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </div>
  );
}
