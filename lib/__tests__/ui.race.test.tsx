import { renderToStaticMarkup as html } from "react-dom/server";
import { Assessment, HorseList, HorseRow, RaceTabs } from "@/components/ui";

const base = { number: 2, name: "Hail Ruler", driver: "Ella Lindqvist", chans: 18.6, streck: 12.1, odds: 5.1, form: ["2", "4"] };

describe("HorseRow", () => {
  it("visar chans, streck och odds", () => {
    const out = html(<HorseRow {...base} />);
    expect(out).toContain("18,6 %");
    expect(out).toContain("Streck 12,1 %");
    expect(out).toContain("Odds 5,1");
    expect(out).not.toContain("ta-delta");
  });
  it("grönt värde bara när hästen är värde", () => {
    expect(html(<HorseRow {...base} isValue valueDelta={6.5} />)).toContain("ta-delta-hl");
    expect(html(<HorseRow {...base} valueDelta={6.5} />)).not.toContain("ta-delta");
  });
  it("högst ett märke", () => {
    expect(html(<HorseRow {...base} badge="skrall" />).match(/class="ta-badge/g)).toHaveLength(1);
    expect(html(<HorseRow {...base} badge="signal" signalScore={3} />)).toContain("Signal +3");
    expect(html(<HorseRow {...base} badge="scratched" dimmed />)).toContain("Struken");
    expect(html(<HorseRow {...base} badge="scratched" dimmed />)).toContain("ta-row-scratched");
  });
  it("saknade värden blir tankstreck", () => {
    const out = html(<HorseRow {...base} chans={null} streck={null} odds={null} />);
    expect(out).toContain(">–<");
    expect(out).not.toContain("Streck ");
  });
  it("raden går att öppna med tangentbordet när onOpen finns", () => {
    const out = html(<HorseRow {...base} onOpen={() => {}} />);
    expect(out).toContain('role="button"');
    expect(out).toContain('tabindex="0"');
    expect(out).toContain('aria-label="Öppna Hail Ruler"');
  });
});

describe("HorseList", () => {
  it("har förklarbara kolumnrubriker", () => {
    const out = html(<HorseList><span /></HorseList>);
    expect(out.match(/ta-term/g)).toHaveLength(3);
  });
});

describe("RaceTabs", () => {
  it("valda och resultat klart", () => {
    const out = html(<RaceTabs active={2} onSelect={() => {}} races={[{ n: 1, done: true, picks: 3 }, { n: 2 }]} />);
    expect(out).toContain("Avdelning 1, resultat klart, 3 valda");
    expect(out).toMatch(/aria-selected="true"[^>]*aria-label="Avdelning 2"/);
  });
});

describe("Assessment", () => {
  it("rader med not", () => {
    const out = html(<Assessment rows={[{ key: "chans", label: "Chans", value: "18,6 %", note: "Näst störst chans." }]} />);
    expect(out).toContain("ta-assess-note");
    expect(out).toContain("<dl");
  });
});
