import { renderToStaticMarkup as html } from "react-dom/server";
import { RaceToolbar } from "@/components/RaceToolbar";
import { EMPTY_FILTERS } from "@/lib/raceView";

describe("RaceToolbar", () => {
  it("visar vy, sortering och antal aktiva filter", () => {
    const out = html(
      <RaceToolbar view="lista" onView={() => {}} sort="grund" onSort={() => {}}
        filters={{ ...EMPTY_FILTERS, value: true, search: "x" }} onFilters={() => {}} />
    );
    expect(out).toMatch(/aria-pressed="true"[^>]*>Lista/);
    expect(out).toContain("Sortera: Grund");
    expect(out).toContain("Filter (2)");
  });
  it("utan filter står bara Filter", () => {
    const out = html(<RaceToolbar view="tabell" onView={() => {}} sort="chans" onSort={() => {}} filters={EMPTY_FILTERS} onFilters={() => {}} />);
    expect(out).toContain(">Filter<");
  });
});
