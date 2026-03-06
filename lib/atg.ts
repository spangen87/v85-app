const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
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
  last_5_results: { place: string; date: string; track: string; time: string }[];
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

      // Odds + streckning + platsodds
      const pools = (s["pools"] as Record<string, unknown>) ?? {};
      const vinnareOdds = (pools["vinnare"] as Record<string, unknown>)?.["odds"];
      const oddsFloat = vinnareOdds != null ? Math.round(Number(vinnareOdds)) / 100 : null;
      const platsPool = (pools["plats"] as Record<string, unknown>) ?? {};
      const pOddsRaw = platsPool["odds"];
      const pOdds = pOddsRaw != null ? Math.round(Number(pOddsRaw)) / 100 : null;
      const betDistRaw = (pools["V85"] as Record<string, unknown>)?.["betDistribution"];
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
      race_number: Number(race["number"] ?? 0),
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
    game_type: "V85",
    date,
    track: firstRaceTrack,
    races,
  };
}
