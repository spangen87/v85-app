import { renderToStaticMarkup as html } from "react-dom/server";
import { Badge, EmptyState, GameSelect, PageHeader } from "@/components/ui";

describe("PageHeader", () => {
  it("rubrik, undertext och tillbakalänk", () => {
    const out = html(<PageHeader title="Lunchgänget" sub="5 medlemmar" backHref="/sallskap" backLabel="Tillbaka till Sällskap" />);
    expect(out).toMatch(/<h1[^>]*>Lunchgänget<\/h1>/);
    expect(out).toContain("5 medlemmar");
    expect(out).toContain('href="/sallskap"');
    expect(out).toContain('aria-label="Tillbaka till Sällskap"');
  });
  it("utan tillbakalänk finns ingen länk", () => {
    expect(html(<PageHeader title="Utvärdering" />)).not.toContain("<a");
  });
});

describe("GameSelect", () => {
  const games = [
    { id: "a", game_type: "V85", track: "Solvalla", date: "2026-10-10" },
    { id: "b", game_type: "V86", track: "Bergsåker", date: "2026-10-07" },
  ];
  it("etikett och omgångarnas namn", () => {
    const out = html(<GameSelect games={games} value="b" onChange={() => {}} />);
    expect(out).toMatch(/<label[^>]*for="([^"]+)"[^>]*>Omgång<\/label>[\s\S]*<select[^>]*id="\1"/);
    expect(out).toContain(">V85 · Solvalla · lör 10 okt</option>");
    expect(out).toMatch(/<option value="b" selected="">/);
  });
});

describe("EmptyState", () => {
  it("rubrik, text och handling", () => {
    const out = html(<EmptyState title="Inga system för omgången" text="Bygg ett i loppvyn." action={<button type="button">Bygg ett system</button>} />);
    expect(out).toContain("Inga system för omgången");
    expect(out).toContain("Bygg ett i loppvyn.");
    expect(out).toContain("Bygg ett system");
  });
});

describe("Badge", () => {
  it("placering och accent", () => {
    expect(html(<Badge tone="place">Vann</Badge>)).toContain("ta-badge-place");
    expect(html(<Badge tone="accent">2 nya</Badge>)).toContain("ta-badge-accent");
  });
});
