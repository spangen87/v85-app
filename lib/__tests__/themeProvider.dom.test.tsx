/** @jest-environment jsdom */
import { act } from "react";
import { readFileSync } from "fs";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { ThemeChoiceControl } from "@/components/ThemeToggle";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let prefersDark = false;
const listeners = new Set<() => void>();
window.matchMedia = ((q: string) => ({
  get matches() { return prefersDark; },
  media: q,
  addEventListener: (_: string, f: () => void) => listeners.add(f),
  removeEventListener: (_: string, f: () => void) => listeners.delete(f),
})) as unknown as typeof window.matchMedia;
const flipSystem = (dark: boolean) => act(() => { prefersDark = dark; listeners.forEach((f) => f()); });

let root: Root;
let host: HTMLDivElement;
type Api = ReturnType<typeof useTheme>;
const seen: { api: Api | null } = { api: null };
function Probe({ onApi }: { onApi: (a: Api) => void }) { onApi(useTheme()); return null; }
const probe = <Probe onApi={(a) => { seen.api = a; }} />;

beforeEach(() => {
  localStorage.clear();
  prefersDark = false;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const theme = () => document.documentElement.getAttribute("data-theme");

describe("ThemeProvider", () => {
  it("följer systemet tills man väljer själv", () => {
    act(() => root.render(<ThemeProvider>{probe}</ThemeProvider>));
    expect(seen.api!.choice).toBe("system");
    expect(theme()).toBe("light");
    flipSystem(true);
    expect(theme()).toBe("dark");
  });

  it("eget val sparas och vinner över systemet", () => {
    act(() => root.render(<ThemeProvider>{probe}</ThemeProvider>));
    act(() => seen.api!.setChoice("light"));
    expect(localStorage.getItem("theme")).toBe("light");
    flipSystem(true);
    expect(theme()).toBe("light");
  });

  it("går att gå tillbaka till systemets tema", () => {
    localStorage.setItem("theme", "dark");
    act(() => root.render(<ThemeProvider>{probe}</ThemeProvider>));
    expect(seen.api!.choice).toBe("dark");
    act(() => seen.api!.setChoice("system"));
    expect(localStorage.getItem("theme")).toBeNull();
    expect(theme()).toBe("light");
    flipSystem(true);
    expect(theme()).toBe("dark");
  });

  it("valet i Utseende har tre lägen", () => {
    act(() => root.render(<ThemeProvider><ThemeChoiceControl /></ThemeProvider>));
    const labels = Array.from(host.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels).toEqual(["Som enheten", "Ljust", "Mörkt"]);
    expect(host.querySelector('[aria-pressed="true"]')!.textContent).toBe("Som enheten");
  });
});

describe("hörnradier", () => {
  it("rounded-xl är minst lika rund som rounded-lg", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const px = (name: string) => Number(css.match(new RegExp(`--radius-${name}:\\s*(\\d+)px`))?.[1] ?? NaN);
    expect(px("xl")).toBeGreaterThanOrEqual(px("lg"));
  });
});
