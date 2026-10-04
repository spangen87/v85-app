"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BulkResultsButton } from "@/components/BulkResultsButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge, Button, EmptyState, Term } from "@/components/ui";
import { deleteGame } from "@/lib/actions/games";
import { fmtGameLabel, fmtPct } from "@/lib/format";
import type { GameEval, Overall } from "@/lib/evaluation";

export interface GameSummary {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  has_results: boolean;
}

interface Props {
  overall: Overall;
  games: GameEval[];
  allGames: GameSummary[];
  isAdmin: boolean;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{ flex: "none", color: "var(--ink-muted)", transform: open ? "rotate(180deg)" : undefined }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Träffsäkerheten för CS och Grund sida vid sida. */
function AccuracyCard({ overall }: { overall: Overall }) {
  const hasGrund = overall.fundamental_races_evaluated > 0;
  const pct = (v: number) => fmtPct(v, 0);
  return (
    <section className="ta-card ta-card-pad flex flex-col gap-3">
      <h2 className="ta-section-title">Träffsäkerhet</h2>
      <table className="ta-table">
        <thead>
          <tr>
            <th className="ta-left" style={{ background: "transparent", paddingLeft: 0 }}><span className="sr-only">Mått</span></th>
            <th style={{ background: "transparent" }}><Term term="cs">CS</Term></th>
            {hasGrund && <th style={{ background: "transparent" }}><Term term="grund">Grund</Term></th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="ta-left" style={{ paddingLeft: 0 }}>Toppval vinner</td>
            <td className="ta-strong">{pct(overall.top_pick_win_rate)}</td>
            {hasGrund && <td className="ta-strong">{pct(overall.fundamental_top_pick_win_rate)}</td>}
          </tr>
          <tr>
            <td className="ta-left" style={{ paddingLeft: 0 }}>Vinnaren bland topp 3</td>
            <td className="ta-strong">{pct(overall.top_3_coverage_rate)}</td>
            {hasGrund && <td className="ta-strong">{pct(overall.fundamental_top_3_coverage_rate)}</td>}
          </tr>
        </tbody>
      </table>
      <p className="ta-text">
        {`Underlag: ${overall.games_evaluated} ${overall.games_evaluated === 1 ? "omgång" : "omgångar"} · ${overall.races_evaluated} avdelningar`}
        {hasGrund && overall.fundamental_races_evaluated !== overall.races_evaluated ? ` (Grund: ${overall.fundamental_races_evaluated})` : ""}
        {". "}
        Toppval är hästen med högst värde i avdelningen. Alla startande räknas, även hästar som galopperat.
      </p>
    </section>
  );
}

function GameRow({ game, first }: { game: GameEval; first: boolean }) {
  const [open, setOpen] = useState(false);
  const hits = game.races.filter((r) => r.top_pick_won).length;
  return (
    <div style={{ borderTop: first ? 0 : "1px solid var(--line)" }}>
      <button type="button" aria-expanded={open} aria-controls={`omg-${game.game_id}`} onClick={() => setOpen((v) => !v)} className="ta-linkrow w-full text-left"
        style={{ background: "none", border: 0, cursor: "pointer" }}>
        <span className="flex-1 min-w-0" style={{ font: "500 15px/20px var(--font-sans)" }}>{fmtGameLabel(game)}</span>
        <span className="ta-text-sm" style={{ whiteSpace: "nowrap" }}>{`Toppval vann ${hits} av ${game.races_evaluated}`}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div id={`omg-${game.game_id}`} className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)" }}>
          <table className="ta-table">
            <thead>
              <tr>
                <th className="ta-left">Avd</th>
                <th className="ta-left">Vinnare</th>
                <th className="ta-left">Toppval (<Term term="cs">CS</Term>)</th>
                <th>Utfall</th>
              </tr>
            </thead>
            <tbody>
              {game.races.map((race) => (
                <tr key={race.race_number}>
                  <td className="ta-left ta-muted">{race.race_number}</td>
                  <td className="ta-left">{race.winner_name || "–"}</td>
                  <td className="ta-left ta-muted">{race.top_pick_name || "–"}</td>
                  <td>
                    {race.top_pick_won ? <Badge tone="place">Vann</Badge>
                      : race.top_3_covered_winner ? <Badge>Topp 3</Badge>
                      : <span className="ta-muted">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EvaluationPanel({ overall, games, allGames, isAdmin }: Props) {
  const router = useRouter();
  const [showAllGames, setShowAllGames] = useState(false);
  // Följer serverns lista efter router.refresh(); borttagna döljs direkt
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const localGames = allGames.filter((g) => !removed.has(g.game_id));
  const [confirmDelete, setConfirmDelete] = useState<GameSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingGames = localGames.filter((g) => !g.has_results);

  async function handleDeleteGame(game: GameSummary) {
    setConfirmDelete(null);
    setError(null);
    setRemoved((prev) => new Set(prev).add(game.game_id));
    const result = await deleteGame(game.game_id);
    if (result.error) {
      setRemoved((prev) => { const next = new Set(prev); next.delete(game.game_id); return next; });
      setError(`Kunde inte ta bort omgången: ${result.error}`);
    } else {
      router.refresh();
    }
  }

  if (allGames.length === 0) {
    return <EmptyState title="Inga omgångar ännu" text="Hämta en omgång i loppvyn. När resultaten är klara syns träffsäkerheten här." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {overall.races_evaluated > 0 ? (
        <>
          <AccuracyCard overall={overall} />
          <section className="ta-section">
            <h2 className="ta-section-title">Per omgång</h2>
            <div className="ta-card" style={{ overflow: "hidden" }}>
              {games.map((game, i) => <GameRow key={game.game_id} game={game} first={i === 0} />)}
            </div>
          </section>
        </>
      ) : (
        <EmptyState title="Inga resultat ännu" text="Träffsäkerheten räknas när minst en omgång har resultat." />
      )}

      <section className="ta-section">
        <h2 className="ta-section-title">Omgångar</h2>
        <p className="ta-text">
          {pendingGames.length === 0 ? "Alla omgångar har resultat."
            : `${pendingGames.length} ${pendingGames.length === 1 ? "omgång väntar" : "omgångar väntar"} på resultat.`}
        </p>
        <BulkResultsButton pendingGames={pendingGames} />
        {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
        <div>
          <Button size="sm" variant="quiet" aria-expanded={showAllGames} onClick={() => setShowAllGames((v) => !v)}>
            {`${showAllGames ? "Dölj" : "Visa"} alla omgångar (${localGames.length})`}
          </Button>
        </div>
        {showAllGames && (
          <ul className="ta-card ta-divided" style={{ listStyle: "none", margin: 0, padding: 0, overflow: "hidden" }}>
            {localGames.map((g) => (
              <li key={g.game_id} className="ta-linkrow">
                <span className="flex-1 min-w-0" style={{ font: "400 15px/20px var(--font-sans)" }}>{fmtGameLabel(g)}</span>
                <span className="ta-text-sm">{g.has_results ? "Rättad" : "Väntar på resultat"}</span>
                {isAdmin && !g.has_results && (
                  <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(g)} aria-label={`Ta bort ${fmtGameLabel(g)}`}>Ta bort</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Ta bort omgången?"
        description={confirmDelete ? `${fmtGameLabel(confirmDelete)} tas bort för alla användare och går inte att ångra.` : undefined}
        confirmLabel="Ta bort"
        danger
        onConfirm={() => { if (confirmDelete) void handleDeleteGame(confirmDelete); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
