import { renderToStaticMarkup as html } from "react-dom/server";
import { SystemBar } from "@/components/SystemBar";
import { SystemSidebar } from "@/components/SystemSidebar";
import { summarizeSystem } from "@/lib/systemSummary";

const races = [1, 2].map((n) => ({ id: `r${n}`, race_number: n, distance: 2140, start_method: "auto",
  starters: [1, 2, 3].map((s) => ({ horse_id: `${n}-${s}`, start_number: s, horses: { name: `H${s}` } })) }));
const selections = [{ race_number: 1, horses: [{ horse_id: "1-2", start_number: 2, horse_name: "H2" }] }];

describe("SystemBar", () => {
  it("visar rubrik, ledtext och Visa", () => {
    const out = html(<SystemBar summary={summarizeSystem(selections, 2, "V85")} draftStatus="idle" onOpen={() => {}} />);
    expect(out).toContain("Ditt system · 1 av 2 avd");
    expect(out).toContain("Välj minst en häst i varje avdelning");
    expect(out).toContain(">Visa<");
  });
  it("visar fel när utkastet inte gick att spara", () => {
    expect(html(<SystemBar summary={summarizeSystem(selections, 2, "V85")} draftStatus="error" onOpen={() => {}} />))
      .toContain("Kunde inte spara utkastet");
  });
});

describe("SystemSidebar", () => {
  it("tomt läge och valda nummer", () => {
    expect(html(<SystemSidebar races={races} selections={[]} onSave={() => {}} onClear={() => {}} summary={summarizeSystem([], 2, "V85")} draftName="Utkast" draftStatus="idle" />))
      .toContain("Tryck på ett nummer för att lägga hästen i systemet");
    const out = html(<SystemSidebar races={races} selections={selections} onSave={() => {}} onClear={() => {}} summary={summarizeSystem(selections, 2, "V85")} draftName="Utkast" draftStatus="saved" />);
    expect(out).toContain("Avd 1");
    expect(out).toMatch(/Spara system<\/button>/);
    expect(out).toContain("disabled");
  });
});
