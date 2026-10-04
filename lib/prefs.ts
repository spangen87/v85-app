/** Små inställningar per enhet (vy, sortering). Tål att localStorage saknas eller kastar. */
export function readPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage: Pick<Storage, "getItem"> | undefined = typeof window !== "undefined" ? window.localStorage : undefined
): T {
  try {
    const v = storage?.getItem(key);
    return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(
  key: string,
  value: string,
  storage: Pick<Storage, "setItem"> | undefined = typeof window !== "undefined" ? window.localStorage : undefined
): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // privat läge eller full lagring — inställningen gäller bara nu
  }
}
