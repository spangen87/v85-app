const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";

/** Pris per rad (kr) beroende på speltyp */
export function getRowPrice(gameType: string): number {
  switch (gameType.toUpperCase()) {
    case 'V86': return 0.25
    case 'V75': return 0.50
    case 'V85': return 0.50
    case 'V65': return 0.50
    case 'V64': return 1.00
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
  place: string
  date: string
  track: string
  time: string
  post_position: number | null
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
  horse_starts_history?: HorseStart[];
}

export interface AtgRace {
  race_number: number;
  race_name: string;
  distance: number;
  start_method: string;
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

const SUPPORTED_GAME_TYPES = ["V75", "V86", "V85", "V64", "V65"] as const;

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
  return parseGame(raw, gameType);
}

export async function fetchV85Game(gameDate?: string): Promise<AtgGame> {
  const available = await fetchAvailableGames(gameDate);
  const v85 = available.find((g) => g.type === "V85");
  if (!v85) throw new Error(`Inget V85-spel hittades ${gameDate ?? "idag"}`);
  return fetchGame("V85", v85.id);
}

function formatTime(timeObj: Record<string, number> | null | undefined): string {
  if (!timeObj) return "";
  const m = timeObj["minutes"] ?? 0;
  const s = timeObj["seconds"] ?? 0;
  const t = timeObj["tenths"] ?? 0;
  return `${m}:${String(s).padStart(2, "0")},${t}`;
}

export async function fetchHorseStarts(
  horseId: string
): Promise<HorseStart[]> {
  try {
    const res = await fetch(`${ATG_BASE}/horses/${horseId}`, {
      headers: HEADERS,
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const startsRaw = (raw["starts"] as Record<string, unknown>[]) ?? [];
    return startsRaw.slice(0, 20).map((s) => {
      const race = (s["race"] as Record<string, unknown>) ?? {};
      const track = (race["track"] as Record<string, unknown>) ?? {};
      const postPos = s["postPosition"] ?? s["number"];
      return {
        date: String(race["date"] ?? s["date"] ?? ""),
        track: String(track["name"] ?? race["name"] ?? ""),
        place: String(s["place"] ?? "–"),
        time: formatTime(s["time"] as Record<string, number> | null | undefined),
        post_position: postPos != null ? Number(postPos) : null,
      };
    });
  } catch {
    return [];
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
function winPct(
  personStats: Record<string, unknown>,
  year: string
): number | null {
  const years = (personStats["years"] as Record<string, unknown>) ?? {};
  const yr = (years[year] as Record<string, unknown>) ?? {};
  const starts = Number(yr["starts"] ?? 0);
  if (starts === 0) return null;
  const placement = (yr["placement"] as Record<string, string>) ?? {};
  const wins = Number(placement["1"] ?? 0);
  return Math.round((wins / starts) * 1000) / 10; // en decimal
}

function parseGameResults(raw: Record<string, unknown>): AtgGameResults {
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

      // Prova result.time → s.time
      const timeObj = (result["time"] ?? s["time"]) as Record<string, number> | null | undefined;
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
      const normalizedRecords: LifeRecord[] = lifeRecords
        .filter((r) => r["startMethod"] && r["distance"])
        .map((r) => ({
          start_method: String(r["startMethod"]),
          distance: String(r["distance"]),
          place: Number(r["place"] ?? 99),
          time: formatTime(r["time"] as Record<string, number>),
        }));

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
        driver_win_pct: winPct(driver as Record<string, unknown>, currentYear),
        trainer: `${trainer["firstName"] ?? ""} ${trainer["lastName"] ?? ""}`.trim(),
        trainer_win_pct: winPct(trainer as Record<string, unknown>, currentYear),
        odds: oddsFloat,
        p_odds: pOdds,
        bet_distribution: betDistribution,
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
      race_name: String(race["name"] ?? ""),
      distance: Number(race["distance"] ?? 0),
      start_method: startMethod,
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
