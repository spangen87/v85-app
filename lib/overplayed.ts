/**
 * Överspelad favorit: en högt streckad häst där Chans ligger klart under
 * strecket. V-spelarna har då lagt mer på hästen än vinnaroddsen motiverar.
 *
 * Mätt 2026-11-09 på 484 avgjorda lopp i databasen (odds och streck från
 * hämtningen): 229 hästar med streck ≥ 20 % och Chans ≤ 0,8 × streck hade i
 * snitt 36,5 % streck och 25,8 % Chans — och vann 22,3 % (23,3 % / 20,8 % i
 * två perioder). Favoriten i loppet (högst streck) hade över lag 42,8 %
 * streck och vann 36,0 %: strecket överdriver favoriter.
 */
export const OVERPLAYED = {
  /** Strecket måste vara minst så här högt (%) */
  minStreck: 20,
  /** Chans delat med streck får vara högst så här */
  maxRatio: 0.8,
} as const;

/** Båda i procent. Saknas någon är hästen inte överspelad. */
export function isOverplayed(chansPct: number | null, streckPct: number | null): boolean {
  if (chansPct == null || streckPct == null) return false;
  return streckPct >= OVERPLAYED.minStreck && chansPct <= OVERPLAYED.maxRatio * streckPct;
}
