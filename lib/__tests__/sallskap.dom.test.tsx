/** @jest-environment jsdom */
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const getGroupPosts = jest.fn(async (_g: string, gameId: string) => [{ id: `p-${gameId}`, content: `färskt ${gameId}`, author_id: "u2", author_display_name: "Ludde", created_at: new Date().toISOString(), replies: [] }]);
jest.mock("@/lib/actions/posts", () => ({ getGroupPosts: (...a: [string, string]) => getGroupPosts(...a), addPost: jest.fn(), deletePost: jest.fn() }));
jest.mock("@/lib/actions/notes", () => ({ getGroupNotesForGame: jest.fn(async () => []) }));
jest.mock("@/lib/actions/systems", () => ({ getGroupSystems: jest.fn(async () => []), getWinnersForGame: jest.fn(async () => ({})), deleteSystem: jest.fn() }));
jest.mock("@/lib/actions/bets", () => ({
  getMyLoggedSystemIds: jest.fn(async () => []), addBetFromSystem: jest.fn(), getGroupBets: jest.fn(async () => []), getGroupBetStats: jest.fn(async () => []),
  addBet: jest.fn(), updateBetPayout: jest.fn(), deleteBet: jest.fn(),
}));
jest.mock("@/lib/actions/groups", () => ({ leaveGroup: jest.fn(), updateGroup: jest.fn() }));

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SallskapPageClient } from "@/app/(authenticated)/sallskap/[groupId]/SallskapPageClient";
import { SystemCard } from "@/components/sallskap/spel/SystemCard";
import type { GameSystem, Group } from "@/lib/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); getGroupPosts.mockClear(); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const group = { id: "g1", name: "Lunchgänget", invite_code: "AB12CD", created_by: "u1", atg_team_url: null } as unknown as Group;
const games = [{ id: "A", date: "2026-10-10", track: "Solvalla", game_type: "V85" }, { id: "B", date: "2026-10-03", track: "Boden", game_type: "V85" }];
const stalePost = { id: "old", content: "gammalt från servern", author_id: "u2", author_display_name: "Ludde", created_at: new Date().toISOString(), replies: [] };

async function selectGame(id: string) {
  const sel = host.querySelector("select") as HTMLSelectElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(sel, id);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("sällskapets gemensamma omgångsväljare", () => {
  it("serverdatan används bara första gången; tillbaka till standardomgången hämtas färskt", async () => {
    await act(async () => root.render(
      <SallskapPageClient group={group} members={[]} games={games} initialPosts={[stalePost] as never} initialNotes={[]} initialSystems={[]}
        league={{ rows: [], last_round_date: null }} defaultGameId="A" currentUserId="u1" />
    ));
    expect(host.textContent).toContain("gammalt från servern");
    await selectGame("B");
    expect(host.textContent).toContain("färskt B");
    await selectGame("A");
    expect(getGroupPosts).toHaveBeenCalledWith("g1", "A");
    expect(host.textContent).toContain("färskt A");
    expect(host.textContent).not.toContain("gammalt från servern");
  });
});

describe("SystemCard och spelade system", () => {
  const sys = { id: "s1", user_id: "u1", group_id: "g1", game_id: "A", name: "Mitt", selections: [], total_rows: 1, score: null,
    is_graded: false, is_draft: false, group_name: "Lunchgänget", created_at: "2026-10-03T10:00:00Z" } as GameSystem;
  it("blir Spelat när listan över spelade system kommer efter att kortet visats", () => {
    act(() => root.render(<SystemCard system={sys} currentUserId="u1" gameType="V85" alreadyLogged={false} />));
    expect(host.textContent).toContain("Jag spelade detta");
    act(() => root.render(<SystemCard system={sys} currentUserId="u1" gameType="V85" alreadyLogged />));
    expect(host.textContent).toContain("Spelat");
  });
});
