jest.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
import { renderToStaticMarkup as html } from "react-dom/server";
import { GamePickerBar } from "@/components/GamePickerBar";

const games = [{ id: "V85_1", date: "2026-10-03", track: "Boden", game_type: "V85" }];

describe("GamePickerBar", () => {
  it("omgångens namn är sidans rubrik", () => {
    const out = html(<GamePickerBar savedGames={games} selectedId="V85_1" />);
    expect(out).toMatch(/<h1[^>]*>[\s\S]*V85 · Boden[\s\S]*<\/h1>/);
  });
  it("knappens namn börjar med den synliga texten", () => {
    const out = html(<GamePickerBar savedGames={games} selectedId="V85_1" />);
    const btn = out.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/)?.[0] ?? "";
    expect(btn).not.toContain("aria-label");
    expect(out).toContain('<span class="sr-only">, byt omgång</span>');
  });
});
