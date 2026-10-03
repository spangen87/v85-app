const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";

/** Pris per rad (kr) beroende på speltyp */
export function getRowPrice(gameType: string): number {
  switch (gameType.toUpperCase()) {
    case 'V86': return 0.25
    case 'V75': return 0.50
    case 'V85': return 0.50
    case 'V65': return 0.50
    case 'V64': return 1.00
    case 'GS75': return 1.00
    default:    return 1.00
  }
}

/** Formaterar totalkostnad som t.ex. "12,50 kr" eller "50 kr" */
export function formatRowCost(rows: number, gameType: string): string {
  const price = rows * getRowPrice(gameType)
  const formatted = price % 1 === 0
    ? String(price)
    : price.toFixed(2).replace('.', ',')
  return `${formatted} kr`
}
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

export interface LifeRecord {
  start_method: string; // "auto" | "volte"
  distance: string;     // "short" | "medium" | "long"
  place: number;
  time: string;
}

export interface HorseStart {
  /** Placering i travsportnotation: "1"–"9", "0" = oplacerad, "5g" = galopp, "d" = diskad */
  place: string;
  date: string;
  track: string;
  time: string;
  post_position: number | null;
  // Rådata från ATG — sparas för framtida analys (saknas i äldre rader)
  galloped?: boolean;
  disqualified?: boolean;
  distance?: number | null;
  start_method?: string | null;
  track_condition?: string | null;
  /** Förstapris i kr — mått på loppets klass */
  first_prize?: number | null;
  /** Kuskens namn i starten (för "kuskbyte") */
  driver?: string | null;
}

export interface AtgStarter {
  start_number: number;
  post_position: number;
  horse_id: string;
  horse_name: string;
  horse_age: number | null;
  horse_sex: string;
  horse_color: string;
  pedigree_father: string;
  home_track: string;
  driver: string;
  driver_win_pct: number | null;   // % innevarande år
  trainer: string;
  trainer_win_pct: number | null;  // % innevarande år
  odds: number | null;
  p_odds: number | null;           // Platsodds
  bet_distribution: number;
  /** Hästens faktiska distans inkl. tillägg (m) */
  start_distance?: number | null;
  /** ATG:s startpoäng (form senaste starterna) */
  start_points?: number | null;
  // Skoinfo
  shoes_reported: boolean;
  shoes_front: boolean;
  shoes_back: boolean;
  shoes_front_changed: boolean;
  shoes_back_changed: boolean;
  // Sulky
  sulky_type: string;
  // Karriärstatistik
  starts_total: number;
  wins_total: number;
  places_2nd: number;
  places_3rd: number;
  earnings_total: number;
  // Innevarande år
  starts_current_year: number;
  wins_current_year: number;
  places_2nd_current_year: number;
  places_3rd_current_year: number;
  // Föregående år
  starts_prev_year: number;
  wins_prev_year: number;
  places_2nd_prev_year: number;
  places_3rd_prev_year: number;
  best_time: string;
  life_records: LifeRecord[];
  last_5_results: HorseStart[];
  /** Populeras av fetch/route.ts efter att omgång hämtats – används för spårfaktoranalys */
  horse_starts_history?: HorseStart[];
}

export interface AtgRace {
  race_number: number;
  /** ATG:s lopp-id (t.ex. "2026-06-13_5_4") — används för extended-anrop */
  atg_race_id: string;
  race_name: string;
  distance: number;
  start_method: string;
  /** Förstapris i kr, tolkat ur pristexten — mått på klass */
  first_prize: number | null;
  /** "K" = kallblod, "V" = varmblod */
  breed: "V" | "K";
  start_time: string;
  track: string;
  starters: AtgStarter[];
}

export interface AtgGame {
  game_id: string;
  game_type: string;
  date: string;
  track: string;
  races: AtgRace[];
}

const SUPPORTED_GAME_TYPES = ["V75", "V86", "V85", "V64", "V65", "GS75"] as const;

export interface AtgStarterResult {
  race_index: number;        // 0-baserat, matchar races[]-arrayen
  horse_id: string;
  start_number: number;
  finish_position: number | null;   // null = ej startat/diskvalificerat
  finish_time: string | null;
}

export interface AtgGameResults {
  game_id: string;
  is_complete: boolean;      // true om minst en starter har finish_position
  results: AtgStarterResult[];
}

export interface AvailableGame {
  type: string;
  id: string;
  label: string;
}

export async function fetchAvailableGames(gameDate?: string): Promise<AvailableGame[]> {
  const url = gameDate
    ? `${ATG_BASE}/calendar/day/${gameDate}`
    : `${ATG_BASE}/calendar/day`;

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`ATG kalender svarade ${res.status}`);

  const cal = await res.json();
  const games = (cal?.games ?? {}) as Record<string, { id: string }[]>;

  const result: AvailableGame[] = [];
  for (const type of SUPPORTED_GAME_TYPES) {
    const list = games[type] ?? [];
    list.forEach((entry, i) => {
      const suffix = list.length > 1 ? ` (${i + 1}/${list.length})` : "";
      result.push({ type, id: entry.id, label: `${type}${suffix}` });
    });
  }
  return result;
}

export async function fetchGame(gameType: string, gameId: string): Promise<AtgGame> {
  const res = await fetch(`${ATG_BASE}/games/${gameId}`, {
    headers: HEADERS,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ATG API svarade ${res.status} för ${gameId}`);

  const raw = await res.json();
  const game = parseGame(raw, gameType);
  await enrichPersonStats(game);
  return game;
}

/**
 * Kusk-/tränarstatistik saknas ofta i /games-svaret (alla winPct blir null).
 * Den finns i stället i /races/{id}/extended — hämta därifrån för avdelningar
 * där spelsvaret inte gav någon statistik alls.
 */
async function enrichPersonStats(game: AtgGame): Promise<void> {
  const currentYear = String(new Date().getFullYear());
  const prevYear = String(new Date().getFullYear() - 1);

  for (const race of game.races) {
    if (!race.atg_race_id) continue;
    const allMissing = race.starters.every((s) => s.driver_win_pct == null);
    if (!allMissing || race.starters.length === 0) continue;

    try {
      const res = await fetch(`${ATG_BASE}/races/${race.atg_race_id}/extended`, {
        headers: HEADERS,
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        console.warn(`[enrichPersonStats] /races/${race.atg_race_id}/extended svarade ${res.status}`);
        continue;
      }
      const raw = await res.json();
      const starts = (raw["starts"] as Record<string, unknown>[]) ?? [];
      if (!Array.isArray(starts)) continue;

      const byNumber = new Map<number, Record<string, unknown>>();
      for (const s of starts) byNumber.set(Number(s["number"] ?? 0), s);

      let filled = 0;
      for (const starter of race.starters) {
        const s = byNumber.get(starter.start_number);
        if (!s) continue;
        const driver = (s["driver"] as Record<string, unknown>) ?? {};
        const horse = (s["horse"] as Record<string, unknown>) ?? {};
        const trainer = (horse["trainer"] as Record<string, unknown>) ?? {};
        starter.driver_win_pct =
          winPct(driver, currentYear) ?? winPct(driver, prevYear);
        starter.trainer_win_pct =
          winPct(trainer, currentYear) ?? winPct(trainer, prevYear);
        if (starter.driver_win_pct != null) filled++;
      }
      console.log(`[enrichPersonStats] Avd ${race.race_number}: kuskstatistik för ${filled}/${race.starters.length} via extended`);
    } catch (err) {
      console.warn(`[enrichPersonStats] Fel för ${race.atg_race_id}:`, err instanceof Error ? err.message : String(err));
    }
  }
}

export async function fetchV85Game(gameDate?: string): Promise<AtgGame> {
  const available = await fetchAvailableGames(gameDate);
  const v85 = available.find((g) => g.type === "V85");
  if (!v85) throw new Error(`Inget V85-spel hittades ${gameDate ?? "idag"}`);
  return fetchGame("V85", v85.id);
}

function formatTime(timeObj: Record<string, number> | null | undefined): string {
  // Diskade/galopperande hästar får t.ex. { code: "u" } i stället för en tid
  if (!timeObj || (timeObj["minutes"] == null && timeObj["seconds"] == null)) return "";
  const m = timeObj["minutes"] ?? 0;
  const s = timeObj["seconds"] ?? 0;
  const t = timeObj["tenths"] ?? 0;
  return `${m}:${String(s).padStart(2, "0")},${t}`;
}

/** "Pris: 80.000-40.000-…" → 80000 (kr). Null om texten saknar pris. */
export function parseFirstPrize(prizeText: unknown): number | null {
  const m = /Pris:\s*([\d.]+)/.exec(String(prizeText ?? ""));
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Kallblod om loppvillkoren nämner det, annars varmblod */
export function detectBreed(terms: unknown): "V" | "K" {
  const text = Array.isArray(terms) ? terms.join(" ") : String(terms ?? "");
  return text.toLowerCase().includes("kallblod") ? "K" : "V";
}

/** ATG:s statistics.life.records → LifeRecord[] (poster utan startmetod/distans hoppas över) */
export function normalizeLifeRecords(records: Record<string, unknown>[]): LifeRecord[] {
  return (records ?? [])
    .filter((r) => r["startMethod"] && r["distance"])
    .map((r) => ({
      start_method: String(r["startMethod"]),
      distance: String(r["distance"]),
      place: Number(r["place"] ?? 99),
      time: formatTime(r["time"] as Record<string, number>),
    }));
}

// Backoff-fördröjningar vid 429/5xx från ATG — utan retry tappas historiken
// tyst när många anrop görs i följd
const HISTORY_RETRY_DELAYS_MS = [500, 1500, 4000];

/**
 * Översätter en historikpost från ATG (`horse.results.records[]` i
 * /races/{id}/extended och /races/{id}/start/{n}) till HorseStart.
 * Returnerar null för strykningar — de är inga starter.
 *
 * Placeringen kodas i travsportnotation så att formkomponent, galopprisk och
 * hästkortet kan läsa den direkt: "d" = diskad, "5g" = galopp (placering 5),
 * "0" = oplacerad, "–" = okänd.
 */
export function parseHistoryRecord(r: Record<string, unknown>): HorseStart | null {
  if (r["scratched"]) return null;
  const race = (r["race"] as Record<string, unknown>) ?? {};
  const track = (r["track"] as Record<string, unknown>) ?? {};
  const start = (r["start"] as Record<string, unknown>) ?? {};
  const galloped = r["galloped"] === true;
  const disqualified = r["disqualified"] === true;

  const rawPlace = r["place"];
  const placeNum = rawPlace != null && rawPlace !== "" ? String(rawPlace) : null;
  let place: string;
  if (disqualified) place = "d";
  else if (galloped) place = `${placeNum ?? "0"}g`;
  else place = placeNum ?? "–";

  const postPos = start["postPosition"];
  const distance = start["distance"];
  const firstPrize = race["firstPrize"];
  const driverRaw = (start["driver"] as Record<string, unknown>) ?? {};
  const driverName = `${driverRaw["firstName"] ?? ""} ${driverRaw["lastName"] ?? ""}`.trim();
  return {
    date: String(r["date"] ?? ""),
    track: String(track["name"] ?? ""),
    place,
    time: formatTime(r["kmTime"] as Record<string, number> | undefined),
    post_position: postPos != null ? Number(postPos) : null,
    galloped,
    disqualified,
    distance: distance != null ? Number(distance) : null,
    start_method: race["startMethod"] != null ? String(race["startMethod"]) : null,
    track_condition: track["condition"] != null ? String(track["condition"]) : null,
    // ATG anger pris i ören
    first_prize: firstPrize != null ? Math.round(Number(firstPrize) / 100) : null,
    driver: driverName || null,
  };
}

/** Historikposter → HorseStart[], nyast först, bara starter före `beforeDate` (ISO-datum) */
export function parseHistoryRecords(
  records: Record<string, unknown>[],
  beforeDate?: string
): HorseStart[] {
  return records
    .map(parseHistoryRecord)
    .filter((h): h is HorseStart => h != null && (!beforeDate || h.date < beforeDate))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Hämtar de senaste starterna för samtliga hästar i ett lopp med ett enda
 * anrop (/races/{id}/extended ger 5 starter per häst). Historiken gäller
 * läget vid loppet — även för avgjorda lopp — så den är fri från läckage.
 *
 * Returnerar en map startnummer → starter (nyast först). Tom map vid fel.
 */
export async function fetchRaceHistories(
  atgRaceId: string,
  raceDate?: string
): Promise<Map<number, HorseStart[]>> {
  const result = new Map<number, HorseStart[]>();
  try {
    let res: Response;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(`${ATG_BASE}/races/${atgRaceId}/extended`, {
        headers: HEADERS,
        next: { revalidate: 0 },
      });
      if (res.ok) break;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= HISTORY_RETRY_DELAYS_MS.length) {
        console.warn(`[fetchRaceHistories] ATG svarade ${res.status} för lopp ${atgRaceId} — ger upp efter ${attempt + 1} försök`);
        return result;
      }
      await new Promise((r) => setTimeout(r, HISTORY_RETRY_DELAYS_MS[attempt]));
    }
    const raw = await res.json();
    const starts = (raw["starts"] as Record<string, unknown>[]) ?? [];
    for (const s of starts) {
      const horse = (s["horse"] as Record<string, unknown>) ?? {};
      const results = (horse["results"] as Record<string, unknown>) ?? {};
      const records = (results["records"] as Record<string, unknown>[]) ?? [];
      result.set(Number(s["number"] ?? 0), parseHistoryRecords(records, raceDate));
    }
  } catch (err) {
    console.warn(`[fetchRaceHistories] Fel för lopp ${atgRaceId}:`, err instanceof Error ? err.message : String(err));
  }
  return result;
}

/** Delar vårt interna lopp-id "{gameId}_{avdelning}" → { gameId, raceNumber } */
export function splitInternalRaceId(
  internalRaceId: string
): { gameId: string; raceNumber: number } | null {
  const i = internalRaceId.lastIndexOf("_");
  if (i <= 0) return null;
  const raceNumber = parseInt(internalRaceId.slice(i + 1), 10);
  if (isNaN(raceNumber) || raceNumber < 1) return null;
  return { gameId: internalRaceId.slice(0, i), raceNumber };
}

/**
 * Slår upp ATG:s lopp-id ("2026-09-16_7_6") för vårt interna lopp-id
 * ("V86_2026-09-16_40_1_1") via spelet. Lopp-id kan inte härledas ur
 * spel-id:t: V86 m.fl. går på två banor och avdelningarnas lopp-id följer
 * respektive banas löpnummer.
 */
export async function resolveAtgRaceId(internalRaceId: string): Promise<string | null> {
  const parts = splitInternalRaceId(internalRaceId);
  if (!parts) return null;
  try {
    const res = await fetch(`${ATG_BASE}/games/${parts.gameId}`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const races = (raw["races"] as Record<string, unknown>[]) ?? [];
    const id = races[parts.raceNumber - 1]?.["id"];
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

function bestRecord(records: Record<string, unknown>[]): string {
  if (!records?.length) return "";
  const priority: [string, string][] = [
    ["auto", "short"],
    ["auto", "medium"],
    ["volte", "short"],
  ];
  for (const [method, dist] of priority) {
    const rec = records.find(
      (r) => r["startMethod"] === method && r["distance"] === dist
    );
    if (rec) return formatTime(rec["time"] as Record<string, number>);
  }
  return formatTime(records[0]["time"] as Record<string, number>);
}

/** Beräknar vinstprocent från statistik-objekt för ett år */
export function winPct(
  personStats: Record<string, unknown>,
  year: string
): number | null {
  // ATG nästlar kusk-/tränarstatistik under "statistics" (samma struktur som
  // hästens) — fallback till platt struktur om API:t ändras
  const stats = (personStats["statistics"] as Record<string, unknown>) ?? personStats;
  const years = (stats["years"] as Record<string, unknown>)
    ?? (personStats["years"] as Record<string, unknown>)
    ?? {};
  const yr = (years[year] as Record<string, unknown>) ?? {};
  const starts = Number(yr["starts"] ?? 0);
  if (starts > 0) {
    const placement = (yr["placement"] as Record<string, string>) ?? {};
    const wins = Number(placement["1"] ?? 0);
    return Math.round((wins / starts) * 1000) / 10; // en decimal
  }
  // Fallback: ATG:s färdigberäknade winPercentage — heltal i hundradels
  // procent (1393 = 13,93 %) i vissa svar, vanlig procent i andra
  const wpRaw = yr["winPercentage"] ?? stats["winPercentage"];
  const wp = Number(wpRaw);
  if (wpRaw != null && !isNaN(wp) && wp > 0) {
    return wp > 100 ? Math.round(wp / 10) / 10 : wp;
  }
  return null;
}

export function parseGameResults(raw: Record<string, unknown>): AtgGameResults {
  const gameId = String(raw["id"] ?? "");
  const rawRaces = (raw["races"] as Record<string, unknown>[]) ?? [];
  const results: AtgStarterResult[] = [];
  let hasAnyResult = false;

  rawRaces.forEach((race, raceIndex) => {
    const starts = (race["starts"] as Record<string, unknown>[]) ?? [];
    starts.forEach((s) => {
      const horse = (s["horse"] as Record<string, unknown>) ?? {};
      const horseId = String(horse["id"] ?? "");
      const startNumber = Number(s["number"] ?? 0);

      // Prova result.finish → result.place → s.place (fallback)
      const result = (s["result"] as Record<string, unknown>) ?? {};
      const finishRaw = result["finish"] ?? result["place"] ?? s["place"];
      const finishNum = finishRaw != null && finishRaw !== "" && finishRaw !== "–"
        ? Number(finishRaw)
        : NaN;
      const finish_position = !isNaN(finishNum) && finishNum > 0 ? finishNum : null;

      // ATG levererar km-tiden i result.kmTime (äldre svar: result.time / s.time)
      const timeObj = (result["kmTime"] ?? result["time"] ?? s["time"]) as Record<string, number> | null | undefined;
      const formatted = formatTime(timeObj);
      const finish_time = formatted || null;

      if (finish_position !== null) hasAnyResult = true;

      results.push({ race_index: raceIndex, horse_id: horseId, start_number: startNumber, finish_position, finish_time });
    });
  });

  return { game_id: gameId, is_complete: hasAnyResult, results };
}

export async function fetchGameResults(gameId: string): Promise<AtgGameResults> {
  const res = await fetch(`${ATG_BASE}/games/${gameId}`, {
    headers: HEADERS,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ATG API svarade ${res.status} för ${gameId}`);
  const raw = await res.json();
  return parseGameResults(raw);
}

function parseGame(raw: Record<string, unknown>, gameType: string): AtgGame {
  const currentYear = String(new Date().getFullYear());
  const prevYear = String(new Date().getFullYear() - 1);

  const rawRaces = (raw["races"] as Record<string, unknown>[]) ?? [];

  const races: AtgRace[] = rawRaces.map((race, avdIndex) => {
    const starts = (race["starts"] as Record<string, unknown>[]) ?? [];
    const startMethod = String(race["startMethod"] ?? "auto");

    const starters: AtgStarter[] = starts.map((s) => {
      const horse = (s["horse"] as Record<string, unknown>) ?? {};
      const driver = (s["driver"] as Record<string, unknown>) ?? {};
      const trainer = (horse["trainer"] as Record<string, unknown>) ?? {};

      // Odds + streckning + platsodds
      const pools = (s["pools"] as Record<string, unknown>) ?? {};
      const vinnareOdds = (pools["vinnare"] as Record<string, unknown>)?.["odds"];
      const oddsFloat = vinnareOdds != null ? Math.round(Number(vinnareOdds)) / 100 : null;
      const platsPool = (pools["plats"] as Record<string, unknown>) ?? {};
      const pOddsRaw = platsPool["odds"];
      const pOdds = pOddsRaw != null ? Math.round(Number(pOddsRaw)) / 100 : null;
      const betDistRaw = (pools[gameType] as Record<string, unknown>)?.["betDistribution"];
      const betDistribution = betDistRaw != null ? Math.round(Number(betDistRaw)) / 100 : 0;

      // Häststats
      const stats = (horse["statistics"] as Record<string, unknown>) ?? {};
      const life = (stats["life"] as Record<string, unknown>) ?? {};
      const lifePlacement = (life["placement"] as Record<string, string>) ?? {};
      const lifeRecords = (life["records"] as Record<string, unknown>[]) ?? [];

      const yearStats = (stats["years"] as Record<string, unknown>) ?? {};
      const curr = (yearStats[currentYear] as Record<string, unknown>) ?? {};
      const currPlacement = (curr["placement"] as Record<string, string>) ?? {};
      const prev = (yearStats[prevYear] as Record<string, unknown>) ?? {};
      const prevPlacement = (prev["placement"] as Record<string, string>) ?? {};

      // Skoinfo
      const shoes = (horse["shoes"] as Record<string, unknown>) ?? {};
      const shoesFront = (shoes["front"] as Record<string, unknown>) ?? {};
      const shoesBack = (shoes["back"] as Record<string, unknown>) ?? {};

      // Sulky
      const sulky = (horse["sulky"] as Record<string, unknown>) ?? {};
      const sulkyType = String(
        (sulky["type"] as Record<string, unknown>)?.["text"] ?? ""
      );

      // Stamtavla + hemmaplan
      const pedigree = (horse["pedigree"] as Record<string, unknown>) ?? {};
      const father = String(
        (pedigree["father"] as Record<string, unknown>)?.["name"] ?? ""
      );
      const homeTrack = String(
        (horse["homeTrack"] as Record<string, unknown>)?.["name"] ?? ""
      );

      // Normaliserade distansrekord
      const normalizedRecords = normalizeLifeRecords(lifeRecords);

      return {
        start_number: Number(s["number"] ?? 0),
        post_position: Number(s["postPosition"] ?? s["number"] ?? 0),
        horse_id: String(horse["id"] ?? ""),
        horse_name: String(horse["name"] ?? ""),
        horse_age: horse["age"] != null ? Number(horse["age"]) : null,
        horse_sex: String(horse["sex"] ?? ""),
        horse_color: String(horse["color"] ?? ""),
        pedigree_father: father,
        home_track: homeTrack,
        driver: `${driver["firstName"] ?? ""} ${driver["lastName"] ?? ""}`.trim(),
        driver_win_pct:
          winPct(driver, currentYear) ?? winPct(driver, prevYear),
        trainer: `${trainer["firstName"] ?? ""} ${trainer["lastName"] ?? ""}`.trim(),
        trainer_win_pct:
          winPct(trainer, currentYear) ?? winPct(trainer, prevYear),
        odds: oddsFloat,
        p_odds: pOdds,
        bet_distribution: betDistribution,
        start_distance: s["distance"] != null ? Number(s["distance"]) : null,
        start_points: life["startPoints"] != null ? Number(life["startPoints"]) : null,
        shoes_reported: Boolean(shoes["reported"]),
        shoes_front: Boolean(shoesFront["hasShoe"]),
        shoes_back: Boolean(shoesBack["hasShoe"]),
        shoes_front_changed: Boolean(shoesFront["changed"]),
        shoes_back_changed: Boolean(shoesBack["changed"]),
        sulky_type: sulkyType,
        starts_total: Number(life["starts"] ?? 0),
        wins_total: Number(lifePlacement["1"] ?? 0),
        places_2nd: Number(lifePlacement["2"] ?? 0),
        places_3rd: Number(lifePlacement["3"] ?? 0),
        earnings_total: Math.round(Number(life["earnings"] ?? 0) / 100),
        starts_current_year: Number(curr["starts"] ?? 0),
        wins_current_year: Number(currPlacement["1"] ?? 0),
        places_2nd_current_year: Number(currPlacement["2"] ?? 0),
        places_3rd_current_year: Number(currPlacement["3"] ?? 0),
        starts_prev_year: Number(prev["starts"] ?? 0),
        wins_prev_year: Number(prevPlacement["1"] ?? 0),
        places_2nd_prev_year: Number(prevPlacement["2"] ?? 0),
        places_3rd_prev_year: Number(prevPlacement["3"] ?? 0),
        best_time: bestRecord(lifeRecords),
        life_records: normalizedRecords,
        last_5_results: [],
      };
    });

    return {
      race_number: avdIndex + 1, // avdelningsnummer 1-N (inte banans interna löpnummer)
      atg_race_id: String(race["id"] ?? ""),
      race_name: String(race["name"] ?? ""),
      distance: Number(race["distance"] ?? 0),
      start_method: startMethod,
      first_prize: parseFirstPrize(race["prize"]),
      breed: detectBreed(race["terms"]),
      start_time: String(race["startTime"] ?? ""),
      track: String((race["track"] as Record<string, unknown>)?.["name"] ?? ""),
      starters,
    };
  });

  const gameId = String(raw["id"] ?? "");
  const parts = gameId.split("_");
  const date = parts[1] ?? "";
  const firstRaceTrack = races[0]?.track ?? "";

  return {
    game_id: gameId,
    game_type: gameType,
    date,
    track: firstRaceTrack,
    races,
  };
}
