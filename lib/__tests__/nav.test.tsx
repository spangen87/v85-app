jest.mock("next/navigation", () => ({ usePathname: () => "/evaluation" }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { renderToStaticMarkup as html } from "react-dom/server";
import { BottomNav } from "@/components/BottomNav";
import { NAV_ITEMS, isActivePath } from "../nav";

describe("NAV_ITEMS", () => {
  it("har fyra flikar med samma namn som i specen", () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.href])).toEqual([
      ["Lopp", "/"], ["System", "/system"], ["Utvärdering", "/evaluation"], ["Sällskap", "/sallskap"],
    ]);
  });
});

describe("isActivePath", () => {
  it("startsidan bara exakt, övriga med prefix", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/system", "/")).toBe(false);
    expect(isActivePath("/sallskap/abc", "/sallskap")).toBe(true);
  });
});

describe("BottomNav", () => {
  it("markerar aktiv sida och visar räknare", () => {
    const out = html(<BottomNav sallskapBadge={3} />);
    expect(out).toMatch(/aria-current="page"[^>]*>[\s\S]*Utvärdering/);
    expect(out).toContain("3 nya händelser i dina sällskap");
    expect(out).not.toContain("Admin");
  });
  it("visar Admin för administratörer", () => {
    expect(html(<BottomNav isAdmin />)).toContain("Admin");
  });
});
