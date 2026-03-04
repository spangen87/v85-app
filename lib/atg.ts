const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

export interface LifeRecord {
  start_method: string; // "auto" | "volte"
  distance: string;     // "short" | "medium" | "long"
  place: number;        // 1 = vunnit
  time: string;         // "1:12,3"
}

export interface AtgStarter {
  start_number: number;
  horse_id: string;
  horse_name: string;
  driver: string;
  trainer: string;
  odds: number | null;
  bet_distribution: number;      // streckprocent V85 (%)
  starts_total: number;
  wins_total: number;
  earnings_total: number;
  starts_current_year: number;
  wins_current_year: number;
  starts_prev_year: number;
  wins_prev_year: number;
  best_time: string;
  life_records: LifeRecord[];
  last_5_results: { place: string; date: string; track: string; time: string }[];
}

export interface AtgRace {
  race_number: number;
  distance: number;
  start_method: string; // "auto" | "volte"
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

async function findV85GameId(gameDate?: string): Promise<string> {
  const url = gameDate
    ? `${ATG_BASE}/calendar/day/${gameDate}`
    : `${ATG_BASE}/calendar/day`;

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`ATG kalender svarade ${res.status}`);

  const cal = await res.json();
  const v85List = cal?.games?.V85 ?? [];
  if (v85List.length === 0) throw new Error(`Inget V85-spel hittades ${gameDate ?? "idag"}`);
  return v85List[0].id as string;
}

export async function fetchV85Game(gameDate?: string): Promise<AtgGame> {
  const gameId = await findV85GameId(gameDate);

  const res = await fetch(`${ATG_BASE}/games/${gameId}`, {
    headers: HEADERS,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ATG API svarade ${res.status} för ${gameId}`);

  const raw = await res.json();
  return parseGame(raw);
}

function formatTime(timeObj: Record<string, number> | null | undefined): string {
  if (!timeObj) return "";
  const m = timeObj["minutes"] ?? 0;
  const s = timeObj["seconds"] ?? 0;
  const t = timeObj["tenths"] ?? 0;
  return `${m}:${String(s).padStart(2, "0")},${t}`;
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

function parseGame(raw: Record<string, unknown>): AtgGame {
  const currentYear = String(new Date().getFullYear());
  const prevYear = String(new Date().getFullYear() - 1);

  const rawRaces = (raw["races"] as Record<string, unknown>[]) ?? [];

  const races: AtgRace[] = rawRaces.map((race) => {
    const starts = (race["starts"] as Record<string, unknown>[]) ?? [];
    const startMethod = String(race["startMethod"] ?? "auto");

    const starters: AtgStarter[] = starts.map((s) => {
      const horse = (s["horse"] as Record<string, unknown>) ?? {};
      const driver = (s["driver"] as Record<string, unknown>) ?? {};
      const trainer = (horse["trainer"] as Record<string, unknown>) ?? {};

      // Odds: lagras som heltal × 100 (2145 = 21.45)
      const pools = (s["pools"] as Record<string, unknown>) ?? {};
      const vinnareOdds = (pools["vinnare"] as Record<string, unknown>)?.["odds"];
      const oddsFloat = vinnareOdds != null ? Math.round(Number(vinnareOdds)) / 100 : null;

      // Streckprocent V85: lagras i 1/10000-delar (10000 = 100 %) → ÷100 = %
      const betDistRaw = (pools["V85"] as Record<string, unknown>)?.["betDistribution"];
      const betDistribution = betDistRaw != null ? Math.round(Number(betDistRaw)) / 100 : 0;

      // Statistik: life + years
      const stats = (horse["statistics"] as Record<string, unknown>) ?? {};
      const life = (stats["life"] as Record<string, unknown>) ?? {};
      const lifePlacement = (life["placement"] as Record<string, string>) ?? {};
      const lifeRecords = (life["records"] as Record<string, unknown>[]) ?? [];

      const yearStats = (stats["years"] as Record<string, unknown>) ?? {};
      const curr = (yearStats[currentYear] as Record<string, unknown>) ?? {};
      const currPlacement = (curr["placement"] as Record<string, string>) ?? {};
      const prev = (yearStats[prevYear] as Record<string, unknown>) ?? {};
      const prevPlacement = (prev["placement"] as Record<string, string>) ?? {};

      // Normaliserade distansrekord för analysen
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
        horse_id: String(horse["id"] ?? ""),
        horse_name: String(horse["name"] ?? ""),
        driver: `${driver["firstName"] ?? ""} ${driver["lastName"] ?? ""}`.trim(),
        trainer: `${trainer["firstName"] ?? ""} ${trainer["lastName"] ?? ""}`.trim(),
        odds: oddsFloat,
        bet_distribution: betDistribution,
        starts_total: Number(life["starts"] ?? 0),
        wins_total: Number(lifePlacement["1"] ?? 0),
        earnings_total: Math.round(Number(life["earnings"] ?? 0) / 100), // ören → kr
        starts_current_year: Number(curr["starts"] ?? 0),
        wins_current_year: Number(currPlacement["1"] ?? 0),
        starts_prev_year: Number(prev["starts"] ?? 0),
        wins_prev_year: Number(prevPlacement["1"] ?? 0),
        best_time: bestRecord(lifeRecords),
        life_records: normalizedRecords,
        last_5_results: [],
      };
    });

    return {
      race_number: Number(race["number"] ?? 0),
      distance: Number(race["distance"] ?? 0),
      start_method: startMethod,
      track: String((race["track"] as Record<string, unknown>)?.["name"] ?? ""),
      starters,
    };
  });

  // Extrahera datum från game-ID (V85_2026-02-28_8_5)
  const gameId = String(raw["id"] ?? "");
  const parts = gameId.split("_");
  const date = parts[1] ?? "";
  const firstRaceTrack = races[0]?.track ?? "";

  return {
    game_id: gameId,
    game_type: "V85",
    date,
    track: firstRaceTrack,
    races,
  };
}
