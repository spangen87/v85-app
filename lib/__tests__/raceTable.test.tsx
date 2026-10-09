import { renderToStaticMarkup as html } from "react-dom/server";
import { RaceTable } from "@/components/RaceTable";
import type { RowModel } from "@/lib/raceView";
import type { Race, Starter } from "@/lib/raceTypes";

const starter = { start_number: 2, horse_id: "h2", trainer: "T", post_position: 2, life_records: [], horse_starts_history: [], finish_position: null, finish_time: null } as unknown as Starter;
const row: RowModel = {
  starter, raceNumber: 3, n: 2, name: "Hail Ruler", driver: "Ella Lindqvist", chansPct: 18.6, chansRank: 2, streckPct: 12.1, odds: 5.1,
  valueDelta: 6.5, isValue: true, grundPct: 15.3, grundRank: 2, cs: 68, csRank: 2, disagree: false, badge: "signal",
  edgeScore: 2, isEdge: true, form: ["2"], scratched: false, numberState: "idle", selectable: true,
};
const race = { id: "r", race_number: 3, distance: 2140, start_method: "auto", start_time: null, race_name: null, starters: [starter] } as unknown as Race;

describe("RaceTable", () => {
  it("sju standardkolumner med förklarbara rubriker", () => {
    const out = html(<RaceTable races={[race]} rows={[row]} trackConfig={null} canSelect onToggle={() => {}} onOpen={() => {}} />);
    for (const h of ["Häst", "Chans", "Streck", "Odds", "Värde", "Grund", "Märke"]) expect(out).toContain(`>${h}<`);
    expect(out).not.toContain(">CS<");
    expect(out).toContain("ta-delta-hl");
    expect(out).toContain("Signal +2");
    expect(out).toContain("Visa alla kolumner");
  });

  it("i fliken Alla visar tabellen avdelningen och säger den i knappen", () => {
    const out = html(<RaceTable races={[race]} rows={[row]} trackConfig={null} canSelect onToggle={() => {}} onOpen={() => {}} showRace />);
    expect(out).toContain(">Avd<");
    expect(out).toContain('aria-label="Lägg avd 3 nr 2 i systemet"');
  });
});
