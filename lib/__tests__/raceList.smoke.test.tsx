import { renderToStaticMarkup as html } from "react-dom/server";
import { RaceList } from "@/components/RaceList";
import type { Race, Starter } from "@/lib/raceTypes";

function starter(n: number, o: Partial<Starter> = {}): Starter {
  return {
    id: `s${n}`, start_number: n, post_position: n, horse_id: `h${n}`, driver: `Kusk ${n}`, driver_win_pct: 10,
    trainer: `Tränare ${n}`, trainer_win_pct: 10, odds: 2 + n, p_odds: 1.5, bet_distribution: 30 / n,
    shoes_reported: true, shoes_front: true, shoes_back: false, shoes_front_changed: false, shoes_back_changed: true,
    sulky_type: null, horse_age: 5, horse_sex: "gelding", horse_color: null, pedigree_father: null, home_track: null,
    starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 500000 / n,
    starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
    starts_prev_year: 10, wins_prev_year: 2, places_2nd_prev_year: 2, places_3rd_prev_year: 1,
    best_time: "1.12,0", last_5_results: [{ place: "1", date: "2026-09-01", track: "Solvalla", time: "1:12,4", post_position: 2 }],
    life_records: [{ start_method: "auto", distance: "medium", place: 1, time: "1:12,0" }],
    formscore: 70 - n * 5, finish_position: null, finish_time: null, horses: { name: `Häst ${n}` }, ...o,
  } as Starter;
}

const race = { id: "V85_2026-10-10_1_3", race_number: 3, race_name: null, distance: 2140, start_method: "auto",
  start_time: "2026-10-10T14:45:00Z", starters: [1, 2, 3, 4, 5].map((n) => starter(n)) } as Race;

describe("RaceList (rök)", () => {
  it("renderar listan med hästrader och flikar utan fel", () => {
    const out = html(
      <RaceList races={[race]} activeRaceNumber={3} onSelectRace={() => {}} userGroups={[]} currentUserId="u"
        systemSelections={[{ race_number: 3, horses: [{ horse_id: "h1", start_number: 1, horse_name: "Häst 1" }] }]}
        canSelect onToggleHorse={() => {}} />
    );
    expect(out).toContain("Avdelning 3");
    expect(out).toContain("2140 m · Autostart · 5 hästar");
    expect(out.match(/class="ta-row(?: ta-row-scratched)?"/g)).toHaveLength(5);
    expect(out).toContain('aria-pressed="true"');
  });

  it("fliken Alla: hela omgången, avdelningen i raden och snabbknappar", () => {
    const race1 = { ...race, id: "V85_2026-10-10_1_1", race_number: 1, starters: [1, 2, 3].map((n) => starter(n)) } as Race;
    const out = html(
      <RaceList races={[race1, race]} activeRaceNumber={0} onSelectRace={() => {}} userGroups={[]} currentUserId="u"
        systemSelections={[{ race_number: 3, horses: [{ horse_id: "h1", start_number: 1, horse_name: "Häst 1" }] }]}
        canSelect onToggleHorse={() => {}} />
    );
    expect(out).toContain("Hela omgången");
    expect(out).toContain("2 avdelningar · 8 hästar");
    expect(out.match(/class="ta-row(?: ta-row-scratched)?"/g)).toHaveLength(8);
    expect(out).toContain("Avd 1 · Kusk 1");
    expect(out).toContain('aria-label="Ta bort avd 3 nr 1 från systemet"');
    expect(out).toContain('aria-label="Visa bara"');
    expect(out).toContain("Skrällar");
  });
});
