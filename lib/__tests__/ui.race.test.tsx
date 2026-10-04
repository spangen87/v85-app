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
  it("raden öppnas med en egen knapp, inte nästlad med startnumret", () => {
    const out = html(<HorseRow {...base} onOpen={() => {}} onToggleSystem={() => {}} />);
    expect(out).not.toContain('role="button"');
    const open = out.match(/<button[^>]*class="ta-row-open"[^>]*>([\s\S]*?)<\/button>/);
    expect(open).not.toBeNull();
    expect(open![1]).not.toContain("<button");
    expect(open![1]).not.toContain("<div");
    expect(open![1]).toContain("Hail Ruler");
    expect(out.match(/<button/g)).toHaveLength(2);
  });
  it("utan onOpen finns ingen öppna-knapp", () => {
    const out = html(<HorseRow {...base} />);
    expect(out).not.toContain("<button");
    expect(out).toContain('class="ta-row-open"');
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
  it("bara aktiv flik nås med Tab och flikarna pekar på panelen", () => {
    const out = html(<RaceTabs active={2} onSelect={() => {}} panelId="p" races={[{ n: 1 }, { n: 2 }, { n: 3 }]} />);
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    expect(out.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(out).toMatch(/id="p-tab-2"[^>]*aria-selected="true"/);
    expect(out.match(/aria-controls="p"/g)).toHaveLength(3);
  });
});

describe("Assessment", () => {
  it("rader med not", () => {
    const out = html(<Assessment rows={[{ key: "chans", label: "Chans", value: "18,6 %", note: "Näst störst chans." }]} />);
    expect(out).toContain("ta-assess-note");
    expect(out).toContain("<dl");
  });
});
