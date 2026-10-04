/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { ProposeSheet, SystemInsights } from "@/components/OptimizerPanel";
import { systemMetrics, type OptimizerRace } from "@/lib/optimizer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Åtta avdelningar med en tydlig favorit och sju andra
const races: OptimizerRace[] = Array.from({ length: 8 }, (_, r) => ({
  race_number: r + 1,
  horses: Array.from({ length: 8 }, (_, i) => ({
    start_number: i + 1, horse_id: `h${r}-${i}`, horse_name: `Häst ${r + 1}-${i + 1}`,
    chance: i === 0 ? 0.44 : 0.08, streck: i === 0 ? 0.5 : 0.5 / 7 + 0.0, scratched: false,
  })),
}));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); document.body.style.overflow = ""; });

describe("SystemInsights", () => {
  it("träffchans, värdeindex och spikar för ett komplett system", () => {
    const sel = races.map((r) => ({ race_number: r.race_number, horses: r.horses.slice(0, r.race_number <= 3 ? 1 : 2).map((h) => ({ horse_id: h.horse_id, start_number: h.start_number, horse_name: h.horse_name })) }));
    const out = renderToStaticMarkup(<SystemInsights races={races} metrics={systemMetrics(races, sel)} />);
    expect(out).toContain("8 rätt");
    expect(out).toContain("7 rätt");
    expect(out).toMatch(/ta-term[^>]*>Värdeindex</);
    expect(out).toContain("Spikarna håller");
    expect(out).toContain("Spik på 1 Häst 1-1 i avd 1");
    expect(out).toContain("bara för administratörer");
  });
});

describe("ProposeSheet", () => {
  it("tre förslag; Använd förslaget lägger in systemet", () => {
    const onApply = jest.fn();
    act(() => root.render(<ProposeSheet open onClose={() => {}} races={races} gameType="V85" rowPrice={0.5} selections={[]} onApply={onApply} />));
    const propose = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Föreslå")!;
    act(() => propose.click());
    const use = Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === "Använd förslaget");
    expect(use).toHaveLength(3);
    expect(document.body.textContent).toContain("Max chans");
    expect(document.body.textContent).toContain("Balans");
    act(() => use[0].click());
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toHaveLength(8);
  });

  it("för låg budget ger en förklaring i stället för förslag", () => {
    act(() => root.render(<ProposeSheet open onClose={() => {}} races={races} gameType="V85" rowPrice={0.5} selections={[]} onApply={() => {}} />));
    const budget = document.getElementById("opt-budget") as HTMLInputElement;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(budget, "0");
      budget.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Föreslå")!.click());
    expect(Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === "Använd förslaget")).toHaveLength(0);
    expect(document.querySelectorAll(".ta-proposal-reason").length).toBe(3);
  });
});
