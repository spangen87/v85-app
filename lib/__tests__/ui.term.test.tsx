import { renderToStaticMarkup as html } from "react-dom/server";
import { ExplainBody, Sheet, Term } from "@/components/ui";

describe("Term", () => {
  it("är en knapp med prickad understrykning för känd term", () => {
    const out = html(<Term term="grund">Grund</Term>);
    expect(out).toContain('class="ta-term"');
    expect(out).toContain('aria-haspopup="dialog"');
    expect(out).toContain(">Grund<");
  });
  it("använder ordlistans titel utan children", () => {
    expect(html(<Term term="varde" />)).toContain(">Värde<");
  });
  it("okänd term blir bara text", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const out = html(<Term term="okänd">Okänd</Term>);
    expect(out).toBe("Okänd");
    warn.mockRestore();
  });
});

describe("ExplainBody", () => {
  it("visar vad, hur, not och manuallänk", () => {
    const out = html(<ExplainBody term="skrall" />);
    expect(out).toContain("Lågt streckad häst");
    expect(out).toContain("Så räknas det");
    expect(out).toContain("ta-sheet-note");
    expect(out).toContain('href="/manual#skräll"');
  });
});

describe("Sheet", () => {
  it("renderar inget när det är stängt", () => {
    expect(html(<Sheet open={false} onClose={() => {}} title="Filter"><p>x</p></Sheet>)).toBe("");
  });
});
