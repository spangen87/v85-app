/**
 * ATG-JSON (/races/{id}/extended) → Grundchans-indata. Används av
 * träningsskriptet; tolkningen följer lib/atg.ts parseGame så att träning
 * och app ser samma värden.
 */
import { detectBreed, normalizeLifeRecords, parseFirstPrize, parseHistoryRecords, winPct } from "@/lib/atg";
import { isAmericanSulky, type FundamentalRace, type FundamentalStarter } from "./features";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? fallback : n;
};

export function fromAtgRace(race: Json): FundamentalRace {
  return {
    date: String(race["date"] ?? ""),
    distance: num(race["distance"], 2140),
    start_method: String(race["startMethod"] ?? "auto"),
    breed: detectBreed(race["terms"]),
    first_prize: parseFirstPrize(race["prize"]),
  };
}

export function fromAtgStart(start: Json, race: FundamentalRace): FundamentalStarter {
  const horse = obj(start["horse"]);
  const stats = obj(horse["statistics"]);
  const life = obj(stats["life"]);
  const lp = obj(life["placement"]);
  const year = race.date.slice(0, 4);
  const prevYear = String(Number(year) - 1);
  const cy = obj(obj(stats["years"])[year]);
  const cyp = obj(cy["placement"]);
  const shoes = obj(horse["shoes"]);
  const front = obj(shoes["front"]);
  const back = obj(shoes["back"]);
  const sulkyText = String(obj(obj(horse["sulky"])["type"])["text"] ?? "");
  const driver = obj(start["driver"]);
  const trainer = obj(horse["trainer"]);
  const driverName = `${driver["firstName"] ?? ""} ${driver["lastName"] ?? ""}`.trim();
  const records = (obj(horse["results"])["records"] as Json[] | undefined) ?? [];

  return {
    start_number: num(start["number"]),
    post_position: num(start["postPosition"], num(start["number"])),
    start_distance: start["distance"] != null ? num(start["distance"]) : null,
    horse_age: horse["age"] != null ? num(horse["age"]) : null,
    horse_sex: horse["sex"] != null ? String(horse["sex"]) : null,
    starts_total: num(life["starts"]),
    wins_total: num(lp["1"]),
    places_2nd: num(lp["2"]),
    places_3rd: num(lp["3"]),
    // ATG anger pengar i ören — samma omräkning som parseGame
    earnings_total: Math.round(num(life["earnings"]) / 100),
    starts_current_year: num(cy["starts"]),
    wins_current_year: num(cyp["1"]),
    places_2nd_current_year: num(cyp["2"]),
    places_3rd_current_year: num(cyp["3"]),
    life_records: normalizeLifeRecords((life["records"] as Json[] | undefined) ?? []),
    shoes_reported: Boolean(shoes["reported"]),
    shoes_front: Boolean(front["hasShoe"]),
    shoes_back: Boolean(back["hasShoe"]),
    shoes_front_changed: Boolean(front["changed"]),
    shoes_back_changed: Boolean(back["changed"]),
    american_sulky: isAmericanSulky(sulkyText),
    driver: driverName || null,
    driver_win_pct: winPct(driver, year) ?? winPct(driver, prevYear),
    trainer_win_pct: winPct(trainer, year) ?? winPct(trainer, prevYear),
    start_points: life["startPoints"] != null ? num(life["startPoints"]) : null,
    history: parseHistoryRecords(records, race.date).slice(0, 5),
  };
}
