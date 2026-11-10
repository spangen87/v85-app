/**
 * Regler för den schemalagda hämtningen (app/api/cron/games): vilka speltyper
 * som hämtas av sig själva, hur långt fram, och hur ofta odds och streck
 * uppdateras beroende på tiden kvar till första start. Rena funktioner.
 */

/** Speltyper som hämtas automatiskt, viktigast först */
export const AUTO_FETCH_TYPES = ["V85", "V86", "V75", "GS75", "V64", "V65"] as const;

/** Omgångar hämtas från och med i dag och så här många dagar framåt */
export const AUTO_FETCH_LOOKAHEAD_DAYS = 2;

const MIN = 60_000;
const HOUR = 60 * MIN;

/** [högst så lång tid till start, minst så lång tid sedan senaste hämtning] */
const REFRESH_STEPS: [number, number][] = [
  [1 * HOUR, 10 * MIN],
  [3 * HOUR, 30 * MIN],
  [24 * HOUR, 3 * HOUR],
  [Infinity, 12 * HOUR],
];

/**
 * Ska omgången hämtas om nu? Tätare ju närmare första start, aldrig efter
 * start (då är poolen stängd och resultatjobbet tar över).
 *
 * @param msToStart   tid kvar till första start, null om starttiden saknas
 * @param msSinceFetch tid sedan senaste hämtningen, null om den aldrig hämtats
 */
export function refreshDue(msToStart: number | null, msSinceFetch: number | null): boolean {
  if (msToStart != null && msToStart <= 0) return false;
  if (msSinceFetch == null) return true;
  const toStart = msToStart ?? Infinity;
  const step = REFRESH_STEPS.find(([within]) => toStart <= within)!;
  return msSinceFetch >= step[1];
}

/** YYYY-MM-DD i svensk tid, offsetDays dagar från nu */
export function stockholmDate(offsetDays = 0, now: Date = new Date()): string {
  const d = new Date(now.getTime() + offsetDays * 86_400_000);
  // sv-SE ger ISO-format YYYY-MM-DD
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
}

/**
 * Omgången som visas när ingen är vald: den närmast kommande (i dag eller
 * senare, viktigaste speltypen först samma dag), annars den senaste.
 */
export function defaultGameId(games: { id: string; date: string; game_type: string }[], today: string): string | null {
  if (games.length === 0) return null;
  const rank = (t: string) => {
    const i = (AUTO_FETCH_TYPES as readonly string[]).indexOf(t);
    return i === -1 ? AUTO_FETCH_TYPES.length : i;
  };
  const upcoming = games
    .filter((g) => g.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || rank(a.game_type) - rank(b.game_type));
  if (upcoming.length > 0) return upcoming[0].id;
  return [...games].sort((a, b) => b.date.localeCompare(a.date))[0].id;
}
