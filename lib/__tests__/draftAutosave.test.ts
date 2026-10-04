import { createDraftAutosave, type DraftOps } from "@/lib/draftAutosave";
import type { SystemSelection } from "@/lib/types";

const sel = (n: number): SystemSelection[] => [{ race_number: n, horses: [{ horse_id: `h${n}`, start_number: n, horse_name: `H${n}` }] }];

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

function setup(initialId: string | null = null) {
  const calls: string[] = [];
  const ops: DraftOps = {
    create: jest.fn(async (_s, name) => { calls.push(`create:${name}`); return "d1"; }),
    update: jest.fn(async (id, _s, name) => { calls.push(`update:${id}:${name}`); }),
    remove: jest.fn(async (id) => { calls.push(`remove:${id}`); }),
  };
  const ids: (string | null)[] = [];
  const statuses: string[] = [];
  const auto = createDraftAutosave(ops, { onDraftId: (id) => ids.push(id), onStatus: (s) => statuses.push(s) }, initialId, 3000);
  return { ops, calls, ids, statuses, auto };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("createDraftAutosave", () => {
  it("sparar först efter fördröjningen och bara senaste läget", async () => {
    const { auto, calls } = setup();
    auto.schedule(sel(1), "Utkast");
    auto.schedule(sel(2), "Utkast");
    expect(calls).toEqual([]);
    await jest.advanceTimersByTimeAsync(3000);
    expect(calls).toEqual(["create:Utkast"]);
  });

  it("flush sparar direkt det som väntar", async () => {
    const { auto, calls } = setup("d9");
    auto.schedule(sel(1), "Mitt");
    await auto.flush();
    expect(calls).toEqual(["update:d9:Mitt"]);
    await jest.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(1);
  });

  it("flush utan väntande ändring gör ingenting", async () => {
    const { auto, calls } = setup("d9");
    await auto.flush();
    expect(calls).toEqual([]);
  });

  it("discard under pågående skapande tar bort det nya utkastet", async () => {
    const { auto, ops, calls, ids } = setup();
    const created = deferred<string>();
    (ops.create as jest.Mock).mockImplementationOnce(() => { calls.push("create"); return created.promise; });
    auto.schedule(sel(1), "Utkast");
    await jest.advanceTimersByTimeAsync(3000);
    const done = auto.discard();
    created.resolve("late");
    await done;
    expect(calls).toEqual(["create", "remove:late"]);
    expect(ids).toEqual([null]);
    expect(auto.draftId()).toBeNull();
  });

  it("discard tar bort befintligt utkast och struntar i väntande ändring", async () => {
    const { auto, calls } = setup("d9");
    auto.schedule(sel(1), "Utkast");
    await auto.discard();
    await jest.advanceTimersByTimeAsync(5000);
    expect(calls).toEqual(["remove:d9"]);
  });

  it("tom kupong tar bort utkastet", async () => {
    const { auto, calls, ids } = setup("d9");
    auto.schedule([], "Utkast");
    await jest.advanceTimersByTimeAsync(3000);
    expect(calls).toEqual(["remove:d9"]);
    expect(ids).toEqual([null]);
  });

  it("fel ger status error", async () => {
    const { auto, ops, statuses } = setup("d9");
    (ops.update as jest.Mock).mockRejectedValueOnce(new Error("nät"));
    auto.schedule(sel(1), "Utkast");
    await jest.advanceTimersByTimeAsync(3000);
    expect(statuses).toEqual(["saving", "error"]);
  });

  it("adopt byter utkast utan att spara om det", async () => {
    const { auto, calls } = setup("d9");
    auto.schedule(sel(1), "Utkast");
    await auto.adopt("d2");
    expect(calls).toEqual(["update:d9:Utkast"]);
    expect(auto.draftId()).toBe("d2");
  });

  it("forget släpper utkastet utan att ta bort det", async () => {
    const { auto, calls } = setup("d9");
    auto.schedule(sel(1), "Utkast");
    auto.forget();
    await jest.advanceTimersByTimeAsync(5000);
    expect(calls).toEqual([]);
    expect(auto.draftId()).toBeNull();
  });
});
