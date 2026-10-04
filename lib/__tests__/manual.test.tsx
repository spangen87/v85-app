import { renderToStaticMarkup as html } from "react-dom/server";
import { ManualContent } from "@/components/ManualContent";

describe("ManualContent", () => {
  it("ger rubriker id som ordlistans ankare och renderar tabeller", () => {
    const out = html(<ManualContent markdown={"## 10. Ordlista\n\n### Värde\n\nText.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n"} />);
    expect(out).toContain('id="värde"');
    expect(out).toContain('id="10-ordlista"');
    expect(out).toContain("<table>");
  });
});
