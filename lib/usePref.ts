"use client";

import { useCallback, useSyncExternalStore } from "react";
import { prefSnapshot, rememberPref, writePref } from "./prefs";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** En sparad inställning (vy, sortering). Servern och första renderingen får standardvärdet. */
export function usePref<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => prefSnapshot(key, allowed, fallback),
    () => fallback
  );
  const set = useCallback((v: T) => {
    rememberPref(key, v);
    writePref(key, v);
    listeners.forEach((l) => l());
  }, [key]);
  return [value, set];
}
