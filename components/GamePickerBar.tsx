"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";
import { OPEN_GAME_PICKER_EVENT } from "@/lib/uiEvents";
import { Button, Sheet } from "@/components/ui";
import { fmtClock, fmtGameDate } from "@/lib/format";
import { ResultsButton } from "./ResultsButton";

interface SavedGame {
  id: string;
  date: string;
  track: string | null;
  game_type: string;
}

interface GamePickerBarProps {
  savedGames: SavedGame[];
  selectedId: string | null;
  /** Första avdelningens starttid — visas under omgångens namn */
  firstStartTime?: string | null;
}

function todayLocal(): string { return new Date().toLocaleDateString("sv-SE"); }
function tomorrowLocal(): string { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("sv-SE"); }
function minDate(): string { const d = new Date(); d.setDate(d.getDate() - 14); return d.toLocaleDateString("sv-SE"); }
function maxDate(): string { const d = new Date(); d.setDate(d.getDate() + 14); return d.toLocaleDateString("sv-SE"); }

export function GamePickerBar({ savedGames, selectedId, firstStartTime = null }: GamePickerBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const selectedGame = savedGames.find((g) => g.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingGames(true);
    setAvailableGames([]);
    setListError(null);
    fetch(`/api/games/available?date=${date}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setAvailableGames(data.games ?? []); })
      .catch(() => {
        if (!cancelled) {
          setAvailableGames([]);
          setListError("Kunde inte ladda spel — försök igen.");
        }
      })
      .finally(() => { if (!cancelled) setLoadingGames(false); });
    return () => { cancelled = true; };
  }, [date, open]);

  // Genväg från startsidans tomma läge: fäll ut listan med spel direkt
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GAME_PICKER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_PICKER_EVENT, onOpen);
  }, []);


  const handleFetch = useCallback(async (game: AvailableGame) => {
    setFetchingId(game.id);
    setMessage(null);
    try {
      const res = await fetch("/api/games/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: game.type, gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fel");
      setOpen(false);
      router.push(`/?game=${encodeURIComponent(data.game_id)}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Okänt fel");
    } finally {
      setFetchingId(null);
    }
  }, [router]);

  const currentIndex = savedGames.findIndex((g) => g.id === selectedId);
  const prevGame = currentIndex > 0 ? savedGames[currentIndex - 1] : null;
  const nextGame = currentIndex < savedGames.length - 1 ? savedGames[currentIndex + 1] : null;


  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Byt omgång"
        className="flex flex-col items-start min-w-0 text-left" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)" }}>
        <span className="flex items-center gap-1.5" style={{ font: "600 17px/22px var(--font-sans)" }}>
          {selectedGame ? `${selectedGame.game_type} · ${selectedGame.track ?? ""}` : "Välj omgång"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </span>
        {selectedGame && (
          <span style={{ font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
            {fmtGameDate(selectedGame.date)}{firstStartTime ? ` · första start ${fmtClock(firstStartTime)}` : ""}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Omgång">
        {selectedGame && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button size="sm" disabled={!prevGame} onClick={() => prevGame && router.push(`/?game=${prevGame.id}`)}>Föregående</Button>
            <ResultsButton gameId={selectedId} />
            <Button size="sm" disabled={!nextGame} onClick={() => nextGame && router.push(`/?game=${nextGame.id}`)}>Nästa</Button>
          </div>
        )}

        <h3 className="ta-sheet-sub">Hämta nytt spel</h3>
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" aria-label="Föregående dag" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); const s = d.toLocaleDateString("sv-SE"); if (s >= minDate()) setDate(s); }}>‹</Button>
          <input type="date" className="ta-field" style={{ height: 36 }} value={date} min={minDate()} max={maxDate()} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
          <Button size="sm" aria-label="Nästa dag" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); const s = d.toLocaleDateString("sv-SE"); if (s <= maxDate()) setDate(s); }}>›</Button>
        </div>

        {loadingGames ? (
          <p className="ta-sheet-text" style={{ color: "var(--ink-muted)" }}>Letar spel …</p>
        ) : listError ? (
          <p className="ta-error">{listError}</p>
        ) : availableGames.length === 0 ? (
          <p className="ta-sheet-text" style={{ color: "var(--ink-muted)" }}>
            Inga spel {date === todayLocal() ? "i dag" : date === tomorrowLocal() ? "i morgon" : date}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {availableGames.map((game) => (
              <Button key={game.id} variant="secondary" onClick={() => handleFetch(game)} disabled={fetchingId !== null}
                style={{ justifyContent: "space-between", width: "100%" }}>
                <span>{game.label}</span>
                <span style={{ color: "var(--ink-muted)" }}>{fetchingId === game.id ? "Hämtar …" : "Hämta"}</span>
              </Button>
            ))}
          </div>
        )}
        {message && <p className="ta-error" style={{ marginTop: "var(--space-2)" }}>{message}</p>}

        {savedGames.length > 0 && (
          <>
            <h3 className="ta-sheet-sub">Sparade omgångar</h3>
            <div className="flex flex-col" style={{ maxHeight: 240, overflowY: "auto" }}>
              {savedGames.map((g) => (
                <button key={g.id} type="button" onClick={() => { setOpen(false); router.push(`/?game=${encodeURIComponent(g.id)}`); }}
                  aria-current={g.id === selectedId ? "true" : undefined}
                  className="text-left py-2" style={{ background: "none", border: 0, borderTop: "1px solid var(--line)", cursor: "pointer",
                    font: "400 15px/22px var(--font-sans)", color: g.id === selectedId ? "var(--accent)" : "var(--ink)" }}>
                  {`${g.game_type} · ${g.track ?? ""} · ${fmtGameDate(g.date)}`}
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
