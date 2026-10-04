/** @jest-environment jsdom */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RaceTabs, Sheet } from "@/components/ui";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); document.body.style.overflow = ""; });

const tab = (shiftKey = false) =>
  act(() => { document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true })); });

describe("fokusfälla i blad", () => {
  function Page() {
    return (
      <>
        <button id="outside">Utanför</button>
        <Sheet open onClose={() => {}} title="Filter" footer={<button id="last">Klar</button>}>
          <button id="first">Första</button>
          <input id="mid" />
        </Sheet>
      </>
    );
  }

  it("Tab från sista går till första", () => {
    act(() => root.render(<Page />));
    act(() => document.getElementById("last")!.focus());
    tab();
    expect(document.activeElement!.id).toBe("first");
  });

  it("Skift+Tab från första går till sista", () => {
    act(() => root.render(<Page />));
    act(() => document.getElementById("first")!.focus());
    tab(true);
    expect(document.activeElement!.id).toBe("last");
  });

  it("Skift+Tab från själva bladet går till sista", () => {
    act(() => root.render(<Page />));
    expect(document.activeElement!.getAttribute("role")).toBe("dialog");
    tab(true);
    expect(document.activeElement!.id).toBe("last");
  });

  it("Tab mitt i bladet lämnas åt webbläsaren", () => {
    act(() => root.render(<Page />));
    act(() => document.getElementById("first")!.focus());
    const e = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => { document.activeElement!.dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(false);
  });
});

describe("avdelningsflikar med tangentbordet", () => {
  function Tabs() {
    const [active, setActive] = useState(1);
    return <RaceTabs active={active} onSelect={setActive} races={[{ n: 1 }, { n: 2 }, { n: 3 }]} />;
  }
  const key = (k: string) =>
    act(() => { document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });
  const activeTab = () => host.querySelector('[aria-selected="true"]')!.getAttribute("data-n");

  it("pilar byter avdelning och flyttar fokus, runt kanterna", () => {
    act(() => root.render(<Tabs />));
    act(() => (host.querySelector('[data-n="1"]') as HTMLElement).focus());
    key("ArrowRight");
    expect(activeTab()).toBe("2");
    expect(document.activeElement!.getAttribute("data-n")).toBe("2");
    key("End");
    expect(activeTab()).toBe("3");
    key("ArrowRight");
    expect(activeTab()).toBe("1");
    key("ArrowLeft");
    expect(activeTab()).toBe("3");
    key("Home");
    expect(activeTab()).toBe("1");
  });
});

describe("ConfirmDialog", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ConfirmDialog } = require("@/components/ConfirmDialog") as typeof import("@/components/ConfirmDialog");
  it("Esc avbryter, men inte medan åtgärden pågår", () => {
    const cancel = jest.fn();
    act(() => root.render(<ConfirmDialog open title="Ta bort?" description="Går inte att ångra." onConfirm={() => {}} onCancel={cancel} />));
    expect(document.body.textContent).toContain("Går inte att ångra.");
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(cancel).toHaveBeenCalledTimes(1);
    act(() => root.render(<ConfirmDialog open busy title="Ta bort?" onConfirm={() => {}} onCancel={cancel} />));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
