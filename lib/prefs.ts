/** Små inställningar per enhet (vy, sortering). Tål att localStorage saknas eller kastar. */
/** Läser localStorage — själva åtkomsten kan kasta (blockerad webbplatsdata). */
function defaultStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function readPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage?: Pick<Storage, "getItem">
): T {
  try {
    const v = (storage ?? defaultStorage())?.getItem(key);
    return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(
  key: string,
  value: string,
  storage?: Pick<Storage, "setItem">
): void {
  try {
    (storage ?? defaultStorage())?.setItem(key, value);
  } catch {
    // privat läge eller full lagring — inställningen gäller bara nu
  }
}

/** Val gjorda i den här sidvisningen — gäller även när localStorage inte fungerar. */
const memory = new Map<string, string>();

export function rememberPref(key: string, value: string): void {
  memory.set(key, value);
}

/** Aktuellt värde: minnet först, sedan lagringen, sist standardvärdet. */
export function prefSnapshot<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage?: Pick<Storage, "getItem">
): T {
  const remembered = memory.get(key);
  if (remembered !== undefined) return (allowed as readonly string[]).includes(remembered) ? (remembered as T) : fallback;
  return readPref(key, allowed, fallback, storage);
}
