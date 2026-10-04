"use client";

import { useState } from "react";
import { Button, Metric, Sheet, Term } from "@/components/ui";
import { fmtNum, fmtPct } from "@/lib/format";
import { APP_COVERAGE_CALIBRATION, proposeSystems, type OptimizerRace, type SystemMetrics, type SystemProposal } from "@/lib/optimizer";
import { defaultBudget, defaultSpikes, fmtOneIn, hitLabels, locksFromSelections, spikeTradeoffText } from "@/lib/optimizerView";
import type { SystemSelection } from "@/lib/types";

const fmtCost = (kr: number) => (kr % 1 === 0 ? `${kr} kr` : `${kr.toFixed(2).replace(".", ",")} kr`);

function horseName(races: OptimizerRace[], race: number, start: number) {
  return races.find((r) => r.race_number === race)?.horses.find((h) => h.start_number === start)?.horse_name ?? "";
}

function HitMetrics({ nRaces, p8, p7, valueIndex, pSpikes, spikes }: {
  nRaces: number; p8: number; p7: number; valueIndex: number; pSpikes: number; spikes: number;
}) {
  const labels = hitLabels(nRaces);
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      <Metric label={labels.all} value={fmtOneIn(p8)} />
      <Metric label={labels.allButOne} value={fmtPct(p7 * 100, 1)} />
      <Metric label={<Term term="vardeindex">Värdeindex</Term>} value={fmtNum(valueIndex, 2)} />
      {spikes > 0 && <Metric label="Spikarna håller" value={fmtPct(pSpikes * 100, 0)} />}
    </div>
  );
}

/**
 * Träffchans och värde för systemet man bygger (kalibrerad chans). Under
 * utvärdering: visas bara för administratörer, se backtestrapporten.
 */
export function SystemInsights({ races, metrics }: { races: OptimizerRace[]; metrics: SystemMetrics }) {
  const spikes = metrics.coverage.filter((c) => c.spike).length;
  return (
    <section className="flex flex-col gap-3" aria-label="Träffchans och värde">
      <div>
        <h3 className="ta-sheet-sub" style={{ margin: 0 }}>Träffchans och värde</h3>
        <p className="ta-text-sm">Under utvärdering, syns bara för administratörer.</p>
      </div>
      {metrics.complete ? (
        <HitMetrics nRaces={races.length} p8={metrics.p8} p7={metrics.p7} valueIndex={metrics.valueIndex}
          pSpikes={metrics.pAllSpikesHold} spikes={spikes} />
      ) : (
        <p className="ta-text-sm">Visas när alla avdelningar har minst en häst.</p>
      )}
      {metrics.spikeTradeoffs.length > 0 && (
        <ul className="flex flex-col gap-2" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {metrics.spikeTradeoffs.map((t) => (
            <li key={t.race_number} className="ta-text-sm">{spikeTradeoffText(t, horseName(races, t.race_number, t.start_number))}</li>
          ))}
        </ul>
      )}
      {metrics.coverage.some((c) => c.horses > 0) && (
        <details>
          <summary className="ta-link" style={{ cursor: "pointer" }}>Täckning per avdelning</summary>
          <table className="ta-table" style={{ marginTop: 8 }}>
            <thead><tr><th className="ta-left">Avd</th><th>Hästar</th><th>Chans</th><th>Streck</th></tr></thead>
            <tbody>
              {metrics.coverage.filter((c) => c.horses > 0).map((c) => (
                <tr key={c.race_number}>
                  <td className="ta-left ta-muted">{c.race_number}</td>
                  <td className="ta-muted">{c.horses}</td>
                  <td className="ta-strong">{fmtPct(c.chans * 100, 0)}</td>
                  <td>{c.streck == null ? "–" : fmtPct(c.streck * 100, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

function ProposalCard({ p, nRaces, onApply }: { p: SystemProposal; nRaces: number; onApply: (s: SystemSelection[]) => void }) {
  return (
    <article className="ta-card ta-card-pad flex flex-col gap-3">
      <h3 style={{ margin: 0, font: "600 16px/22px var(--font-sans)", color: "var(--ink)" }}>{p.label}</h3>
      {p.system ? (
        <>
          <span className="ta-text-sm">{`${p.system.rows} ${p.system.rows === 1 ? "rad" : "rader"} · ${fmtCost(p.system.cost)} · ${p.system.spikes} ${p.system.spikes === 1 ? "spik" : "spikar"}`}</span>
          <HitMetrics nRaces={nRaces} p8={p.system.p8} p7={p.system.p7} valueIndex={p.system.valueIndex}
            pSpikes={p.system.pAllSpikesHold} spikes={p.system.spikes} />
          {p.system.notes.map((n) => <p key={n} className="ta-text-sm">{n}</p>)}
          <div><Button onClick={() => onApply(p.system!.selection)}>Använd förslaget</Button></div>
        </>
      ) : (
        <p className="ta-text-sm ta-proposal-reason">{p.reason}</p>
      )}
    </article>
  );
}

/** "Föreslå system": budget och spikar in, tre förslag ut. */
export function ProposeSheet({ open, onClose, races, gameType, rowPrice, selections, onApply }: {
  open: boolean;
  onClose: () => void;
  races: OptimizerRace[];
  gameType: string | null;
  rowPrice: number;
  selections: SystemSelection[];
  onApply: (selection: SystemSelection[]) => void;
}) {
  const [budget, setBudget] = useState(String(defaultBudget(gameType)));
  // Standard: optimeraren väljer antalet spikar (bäst i backtesten); annars ett fast antal
  const [spikes, setSpikes] = useState<"auto" | number>("auto");
  const maxSpikes = defaultSpikes(races.length) + 1;
  const [keepMine, setKeepMine] = useState(true);
  const [proposals, setProposals] = useState<SystemProposal[] | null>(null);
  const [showMore, setShowMore] = useState(false);

  function run() {
    const budgetKr = Number(budget.replace(",", "."));
    setProposals(proposeSystems({
      races,
      budgetKr: Number.isFinite(budgetKr) ? budgetKr : 0,
      rowPrice,
      spikes: spikes === "auto" ? { min: 0, max: maxSpikes } : spikes,
      locks: keepMine ? locksFromSelections(selections) : [],
      coverageCalibration: APP_COVERAGE_CALIBRATION,
    }));
    setShowMore(false);
  }

  // Max chans är huvudförslaget; värdevarianterna har inte gett högre avkastning i backtesten
  const main = proposals?.filter((p) => p.lambda === 0) ?? [];
  const more = proposals?.filter((p) => p.lambda !== 0) ?? [];
  const apply = (s: SystemSelection[]) => { onApply(s); onClose(); };

  return (
    <Sheet open={open} onClose={onClose} title="Föreslå system" wide
      footer={<p className="ta-text-sm" style={{ margin: 0 }}>
        Förslagen bygger på odds och streck just nu, och de ändras fram till start. Inget förslag lovar vinst.
      </p>}>
      <div className="flex flex-col gap-4">
        <p className="ta-text">Under utvärdering, syns bara för administratörer. Optimeraren väljer det system inom budgeten som har störst chans att gå in, räknat på kalibrerad chans.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label className="ta-stack" style={{ gap: 6 }} htmlFor="opt-budget">
            <span className="ta-field-label">Budget (kr)</span>
            <input id="opt-budget" className="ta-field" style={{ height: 44 }} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
          <label className="ta-stack" style={{ gap: 6 }} htmlFor="opt-spikes">
            <span className="ta-field-label">Spikar</span>
            <select id="opt-spikes" className="ta-field" style={{ height: 44 }} value={spikes}
              onChange={(e) => setSpikes(e.target.value === "auto" ? "auto" : Number(e.target.value))}>
              <option value="auto">Låt optimeraren välja</option>
              {Array.from({ length: maxSpikes + 1 }, (_, n) => <option key={n} value={n}>{`Exakt ${n}`}</option>)}
            </select>
          </label>
        </div>
        {selections.length > 0 && (
          <label className="flex items-center gap-2" style={{ font: "400 15px/22px var(--font-sans)", color: "var(--ink)" }}>
            <input type="checkbox" checked={keepMine} onChange={(e) => setKeepMine(e.target.checked)} />
            Behåll hästarna jag redan valt
          </label>
        )}
        <div><Button variant="primary" onClick={run}>Föreslå</Button></div>
        {proposals && (
          <div className="flex flex-col gap-3" aria-live="polite">
            {main.map((p) => <ProposalCard key={p.key} p={p} nRaces={races.length} onApply={apply} />)}
            {more.length > 0 && !showMore && (
              <div><Button size="sm" variant="quiet" onClick={() => setShowMore(true)}>Visa fler förslag</Button></div>
            )}
            {showMore && (
              <>
                <p className="ta-text-sm">
                  Balans och Värde väljer fler hästar som vinner oftare än strecket säger. I backtesten har de inte gett högre avkastning än Max chans.
                </p>
                {more.map((p) => <ProposalCard key={p.key} p={p} nRaces={races.length} onApply={apply} />)}
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
