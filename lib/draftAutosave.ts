import { planDraftSync } from "@/lib/systemSummary";
import type { SystemSelection } from "@/lib/types";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export interface DraftOps {
  create: (selections: SystemSelection[], name: string) => Promise<string>;
  update: (id: string, selections: SystemSelection[], name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Autosparning av kupongen som utkast. Sparningar körs en i taget i ordning,
 * och en generation skyddar mot att ett svar som kommer efter "Rensa" eller
 * ett byte av utkast väcker liv i ett gammalt utkast.
 */
export function createDraftAutosave(
  ops: DraftOps,
  cb: { onDraftId: (id: string | null) => void; onStatus: (s: DraftStatus) => void },
  initialId: string | null,
  delayMs = 3000,
) {
  let id = initialId;
  let gen = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { selections: SystemSelection[]; name: string } | null = null;
  let chain: Promise<void> = Promise.resolve();

  const setId = (next: string | null) => { id = next; cb.onDraftId(next); };

  function enqueue(job: () => Promise<void>): Promise<void> {
    chain = chain.then(job, job);
    return chain;
  }

  function run(selections: SystemSelection[], name: string): Promise<void> {
    const g = gen;
    return enqueue(async () => {
      if (g !== gen) return;
      const action = planDraftSync(selections, id);
      if (action === "none") return;
      cb.onStatus("saving");
      try {
        if (action === "create") {
          const created = await ops.create(selections, name);
          if (g !== gen) { await ops.remove(created).catch(() => {}); return; }
          setId(created);
        } else if (action === "update") {
          await ops.update(id!, selections, name);
        } else {
          await ops.remove(id!);
          setId(null);
        }
        if (g === gen) cb.onStatus(action === "delete" ? "idle" : "saved");
      } catch {
        if (g === gen) cb.onStatus("error");
      }
    });
  }

  function cancelPending() {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  }

  return {
    draftId: () => id,

    /** Sparar efter fördröjningen; en ny ändring skjuter upp sparningen. */
    schedule(selections: SystemSelection[], name: string) {
      pending = { selections, name };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const p = pending!;
        pending = null;
        void run(p.selections, p.name);
      }, delayMs);
    },

    /** Sparar det som väntar direkt (innan publicering, när sidan lämnas). */
    flush(): Promise<void> {
      if (!pending) return chain;
      const p = pending;
      cancelPending();
      return run(p.selections, p.name);
    },

    /** "Rensa": glöm väntande ändringar och ta bort utkastet. */
    discard(): Promise<void> {
      gen++;
      cancelPending();
      const old = id;
      setId(null);
      cb.onStatus("idle");
      return enqueue(async () => { if (old) await ops.remove(old).catch(() => {}); });
    },

    /** Ett annat utkast läses in: spara först det som väntar, byt sedan. */
    async adopt(next: string) {
      await this.flush();
      gen++;
      id = next;
    },

    /** Systemet är sparat på riktigt: släpp utkastet utan att ta bort det. */
    forget() {
      gen++;
      cancelPending();
      id = null;
      cb.onStatus("idle");
    },
  };
}

export type DraftAutosave = ReturnType<typeof createDraftAutosave>;
