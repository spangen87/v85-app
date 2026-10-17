/** @jest-environment jsdom */
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: () => {} }) }));

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RefreshOddsButton } from "@/components/RefreshOddsButton";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = jest.fn();
beforeEach(() => {
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  refresh.mockReset(); fetchMock.mockReset();
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const button = () => host.querySelector("button") as HTMLButtonElement;

describe("RefreshOddsButton", () => {
  it("hämtar om samma omgång och uppdaterar sidan", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    act(() => root.render(<RefreshOddsButton gameId="V85_2026-10-18_5_6" gameType="V85" fetchedAt={null} />));
    expect(button().textContent).toBe("Uppdatera odds");
    await act(async () => { button().click(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/games/fetch", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ gameType: "V85", gameId: "V85_2026-10-18_5_6" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("visar felet och uppdaterar inte sidan om hämtningen misslyckas", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "ATG svarar inte" }) });
    act(() => root.render(<RefreshOddsButton gameId="V85_2026-10-18_5_6" gameType="V85" fetchedAt={null} />));
    await act(async () => { button().click(); });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("ATG svarar inte");
    expect(refresh).not.toHaveBeenCalled();
    expect(button().disabled).toBe(false);
  });

  it("visar när oddsen hämtades", () => {
    act(() => root.render(<RefreshOddsButton gameId="g" gameType="V85" fetchedAt="2026-10-17T19:30:00Z" />));
    expect(host.textContent).toContain("Odds och streck från");
    expect(host.textContent).toContain("21:30");
  });
});
