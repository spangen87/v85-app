import { renderToStaticMarkup as html } from "react-dom/server";
import { Badge, Button, FormStrip, Metric, SegmentedControl, StartNumber, ValueDelta } from "@/components/ui";

describe("StartNumber", () => {
  it("är en knapp med aria-pressed när den går att trycka på", () => {
    const out = html(<StartNumber number={7} state="selected" onClick={() => {}} />);
    expect(out).toContain("<button");
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain("Ta bort nr 7 från systemet");
    expect(out).toContain("ta-num-selected");
  });
  it("är ett span utan onClick", () => {
    const out = html(<StartNumber number={3} state="p1" label="Nr 3, vann" />);
    expect(out).not.toContain("<button");
    expect(out).toContain("ta-num-p1");
    expect(out).toContain('aria-label="Nr 3, vann"');
  });
});

describe("ValueDelta", () => {
  it("grön bara med highlight", () => {
    expect(html(<ValueDelta delta={4.18} highlight />)).toContain("ta-delta-hl");
    expect(html(<ValueDelta delta={4.18} />)).toContain("ta-delta-plain");
    expect(html(<ValueDelta delta={-1.3} />)).toContain("−1,3");
  });
});

describe("FormStrip", () => {
  it("klassar placeringar och läser upp dem", () => {
    const out = html(<FormStrip results={["1", "2", "3", "5g", "d"]} />);
    expect(out).toContain("ta-form-p1");
    expect(out).toContain("ta-form-p2");
    expect(out).toContain("ta-form-p3");
    expect(out).toContain("ta-form-dq");
    expect(out).toContain("Senaste placeringar: 1, 2, 3, 5 galopp, diskad");
  });
  it("visar högst fem och tomt läge", () => {
    expect(html(<FormStrip results={["1", "2", "3", "4", "5", "6"]} />).match(/ta-form-cell/g)).toHaveLength(5);
    expect(html(<FormStrip results={[]} />)).toContain("Inga starter");
  });
});

describe("Badge, Button, Metric, SegmentedControl", () => {
  it("renderar rätt klasser", () => {
    expect(html(<Badge tone="skrall">Skräll</Badge>)).toContain("ta-badge-skrall");
    expect(html(<Button variant="primary">Spara system</Button>)).toContain("ta-btn-primary");
    expect(html(<Button>Spara</Button>)).toContain('type="button"');
    expect(html(<Metric label="Chans" value="24,1 %" size="lg" />)).toContain("ta-metric-lg");
  });
  it("SegmentedControl markerar valt alternativ", () => {
    const out = html(
      <SegmentedControl label="Visning" value="tabell" onChange={() => {}}
        options={[{ value: "lista", label: "Lista" }, { value: "tabell", label: "Tabell" }]} />
    );
    expect(out).toContain('aria-label="Visning"');
    expect(out).toMatch(/aria-pressed="true"[^>]*>Tabell/);
    expect(out).toMatch(/aria-pressed="false"[^>]*>Lista/);
  });
});
