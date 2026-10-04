jest.mock("@/lib/actions/systems", () => ({ deleteSystem: jest.fn() }));
jest.mock("@/lib/actions/bets", () => ({ addBetFromSystem: jest.fn() }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
import { renderToStaticMarkup as html } from "react-dom/server";
import { SystemCard } from "@/components/sallskap/spel/SystemCard";
import type { GameSystem } from "@/lib/types";

const h = (id: string, n: number) => ({ horse_id: id, start_number: n, horse_name: id });
const base: GameSystem = {
  id: "s1", user_id: "u1", group_id: "g1", game_id: "G1", name: "V85 Solvalla",
  selections: [{ race_number: 2, horses: [h("b", 5)] }, { race_number: 1, horses: [h("a", 8), h("c", 7)] }],
  total_rows: 2, score: 1, is_graded: true, is_draft: false, group_name: "Lunchgänget", created_at: "2026-10-03T10:00:00Z",
  author_display_name: "Ludde",
};

describe("SystemCard", () => {
  it("rättat system: resultat, vinnare i guld och övriga utgångna", () => {
    const out = html(<SystemCard system={base} currentUserId="u1" winnersByRace={{ 1: "a", 2: "x" }} gameType="V85" gameId="G1" />);
    expect(out).toContain("1 av 2 rätt");
    expect(out).toMatch(/class="ta-sn ta-sn-p1"[^>]*>8</);
    expect(out).toMatch(/class="ta-sn ta-sn-finished"[^>]*>7</);
    expect(out).toMatch(/class="ta-sn ta-sn-finished"[^>]*>5</);
    expect(out).toContain("Lunchgänget");
    expect(out).toContain("Ludde · 2 rader");
  });
  it("avdelningarna i nummerordning", () => {
    const out = html(<SystemCard system={base} currentUserId="u1" gameType="V85" />);
    expect(out.indexOf("Avd 1")).toBeLessThan(out.indexOf("Avd 2"));
  });
  it("ej rättat system visar Pågår och neutrala nummer", () => {
    const out = html(<SystemCard system={{ ...base, is_graded: false, score: null }} currentUserId="u1" gameType="V85" />);
    expect(out).toContain("Pågår");
    expect(out).not.toContain("ta-sn-p1");
  });
  it("utkast: märke och länk till loppvyn utan systemMode", () => {
    const out = html(<SystemCard system={{ ...base, is_draft: true, is_graded: false, score: null }} currentUserId="u1" gameType="V85" gameId="G1" />);
    expect(out).toContain(">Utkast<");
    expect(out).toContain('href="/?game=G1"');
    expect(out).toContain("Fortsätt bygga");
    expect(out).not.toContain("systemMode");
  });
  it("privat system", () => {
    expect(html(<SystemCard system={{ ...base, group_id: null, group_name: null }} currentUserId="u1" gameType="V85" />)).toContain(">Privat<");
  });
  it("inga emojis eller bocktecken", () => {
    const out = html(<SystemCard system={base} currentUserId="u1" gameType="V85" alreadyLogged />);
    expect(out).not.toMatch(/[✓🎯👑]/u);
    expect(out).toContain("Spelat");
  });
});
