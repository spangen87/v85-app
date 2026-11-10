jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
jest.mock("@/lib/actions/games", () => ({ deleteGame: jest.fn() }));
import { renderToStaticMarkup as html } from "react-dom/server";
import { EvaluationPanel } from "@/components/EvaluationPanel";

const overall = {
  games_evaluated: 12, races_evaluated: 94, top_pick_win_rate: 31.2, top_3_coverage_rate: 63.8,
  fundamental_races_evaluated: 90, fundamental_top_pick_win_rate: 24.4, fundamental_top_3_coverage_rate: 55.1,
};
const games = [{
  game_id: "G1", date: "2026-10-10", game_type: "V85", track: "Solvalla", races_evaluated: 2, top_pick_win_rate: 50, top_3_coverage_rate: 100,
  races: [
    { race_number: 1, winner_name: "R.K.Kiara", top_pick_name: "R.K.Kiara", top_pick_won: true, top_3_covered_winner: true },
    { race_number: 2, winner_name: "Andiamo", top_pick_name: "Readly Brodde", top_pick_won: false, top_3_covered_winner: true },
  ],
}];
const allGames = [
  { game_id: "G1", date: "2026-10-10", game_type: "V85", track: "Solvalla", has_results: true },
  { game_id: "G2", date: "2026-10-11", game_type: "V86", track: "Åby", has_results: false },
];

describe("EvaluationPanel", () => {
  const badges = { races: 94, stats: [
    { key: "overplayed" as const, label: "Överspelad", term: "overspelad" as const, n: 229, streckPct: 36.5, expectedPct: 25.8, winPct: 22.3 },
    { key: "skrall" as const, label: "Skräll", term: "skrall" as const, n: 93, streckPct: 7.4, expectedPct: 12.9, winPct: 16.1 },
    { key: "value" as const, label: "Värde", term: "varde" as const, n: 0, streckPct: 0, expectedPct: 0, winPct: 0 },
  ] };
  const out = html(<EvaluationPanel badges={badges} overall={overall} games={games} allGames={allGames} isAdmin={false} />);
  it("jämför CS och Grund i en tabell med förklarbara rubriker", () => {
    expect(out).toContain("Toppval");
    expect(out).toMatch(/ta-term[^>]*>CS</);
    expect(out).toMatch(/ta-term[^>]*>Grund</);
    expect(out).toContain("Toppval vinner");
    expect(out).toContain("31 %");
    expect(out).toContain("24 %");
    expect(out).toContain("Vinnaren bland topp 3");
    expect(out).toContain("12 omgångar · 94 avdelningar");
  });
  it("märkenas facit: streck, chans och utfall per märke, tomma märken dolda", () => {
    expect(out).toContain("Märkenas facit");
    expect(out).toMatch(/ta-term[^>]*>Överspelad</);
    expect(out).toContain("36,5\u00a0%");
    expect(out).toContain("22,3\u00a0%");
    expect(out).toContain("94 avgjorda avdelningar");
    // Skräll har under 100 hästar och får en asterisk med förklaring
    expect(out).toContain("Färre än 100 hästar");
    expect(out).not.toMatch(/ta-term[^>]*>Värde</);
  });
  it("omgångarna med träff i text", () => {
    expect(out).toContain("V85 · Solvalla · lör 10 okt");
    expect(out).toContain("Toppval vann 1 av 2");
  });
  it("väntande omgångar och knappen för resultat", () => {
    expect(out).toContain("1 omgång väntar på resultat");
    expect(out).toContain("Hämta saknade resultat");
  });
  it("inga gamla variabler eller trafikljusfärger", () => {
    expect(out).not.toContain("--tn-");
    expect(out).not.toContain("rgba(");
  });
});
