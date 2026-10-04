/** @jest-environment jsdom */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Sheet } from "@/components/ui";
import { SystemDrawer } from "@/components/SystemDrawer";
import { summarizeSystem } from "@/lib/systemSummary";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); document.body.style.overflow = ""; });

function SearchSheet() {
  const [q, setQ] = useState("");
  return (
    <Sheet open onClose={() => {}} title="Filter">
      <input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
    </Sheet>
  );
}

describe("C2: fokus stannar i fältet när föräldern ritas om", () => {
  it("skriva i ett fält i bladet tappar inte fokus", () => {
    act(() => root.render(<SearchSheet />));
    const input = document.getElementById("q") as HTMLInputElement;
    act(() => input.focus());
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => { setter.call(input, "h"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(document.activeElement).toBe(input);
  });
});

describe("I2: två lager", () => {
  it("Esc stänger bara det översta, och sidan är låst tills båda är stängda", () => {
    const outer = jest.fn();
    const inner = jest.fn();
    function Two({ innerOpen }: { innerOpen: boolean }) {
      return (
        <>
          <Sheet open onClose={outer} title="Yttre"><p>a</p></Sheet>
          <Sheet open={innerOpen} onClose={inner} title="Inre"><p>b</p></Sheet>
        </>
      );
    }
    act(() => root.render(<Two innerOpen />));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    act(() => root.render(<Two innerOpen={false} />));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => root.render(<></>));
    expect(document.body.style.overflow).toBe("");
  });
});

describe("I6: kupongen", () => {
  it("strukna nummer går inte att lägga till, men valda går att ta bort", () => {
    const races = [{ id: "r1", race_number: 1, distance: 2140, start_method: "auto",
      starters: [
        { horse_id: "a", start_number: 1, odds: 3, finish_position: null, horses: { name: "A" } },
        { horse_id: "b", start_number: 2, odds: 0, finish_position: null, horses: { name: "B" } },
        { horse_id: "c", start_number: 3, odds: 0, finish_position: null, horses: { name: "C" } },
      ] }];
    const selections = [{ race_number: 1, horses: [{ horse_id: "b", start_number: 2, horse_name: "B" }] }];
    act(() => root.render(
      <SystemDrawer open onClose={() => {}} races={races} selections={selections} onToggleHorse={() => {}} onSave={() => {}}
        onClear={() => {}} summary={summarizeSystem(selections, 1, "V85")} draftName="Utkast" onDraftNameChange={() => {}}
        draftStatus="idle" savedDrafts={[]} onLoadDraft={() => {}} />
    ));
    const nums = Array.from(document.querySelectorAll(".ta-num")).map((el) => [el.textContent, el.tagName]);
    expect(nums).toEqual([["1", "BUTTON"], ["2", "BUTTON"], ["3", "SPAN"]]);
  });
});
