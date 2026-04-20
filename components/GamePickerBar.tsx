"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";

interface SavedGame {
  id: string;
  date: string;
  track: string | null;
  game_type: string;
}

interface GamePickerBarProps {
  savedGames: SavedGame[];
  selectedId: string | null;
}

function todayLocal(): string { return new Date().toLocaleDateString("sv-SE"); }
function tomorrowLocal(): string { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("sv-SE"); }
function minDate(): string { const d = new Date(); d.setDate(d.getDate() - 14); return d.toLocaleDateString("sv-SE"); }
function maxDate(): string { const d = new Date(); d.setDate(d.getDate() + 14); return d.toLocaleDateString("sv-SE"); }

export function GamePickerBar({ savedGames, selectedId }: GamePickerBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedGame = savedGames.find((g) => g.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingGames(true);
    setAvailableGames([]);
    fetch(`/api/games/available?date=${date}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setAvailableGames(data.games ?? []); })
      .catch(() => { if (!cancelled) setAvailableGames([]); })
      .finally(() => { if (!cancelled) setLoadingGames(false); });
    return () => { cancelled = true; };
  }, [date, open]);

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

  const iconBtn: React.CSSProperties = {
    padding: 6,
    borderRadius: 8,
    background: "none",
    border: "none",
    color: "var(--tn-text-faint)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => prevGame && router.push(`/?game=${prevGame.id}`)}
          disabled={!prevGame}
          aria-label="Föregående spel"
          style={{ ...iconBtn, opacity: prevGame ? 1 : 0.3 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Current game / open picker */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg text-sm transition-colors"
          style={{
            background: "var(--tn-bg-chip)",
            border: "1px solid var(--tn-border)",
            color: "var(--tn-text)",
            padding: "5px 10px",
            fontFamily: "var(--font-geist-sans)",
            minWidth: 0,
          }}
        >
          {selectedGame ? (
            <>
              <span className="tn-mono font-bold text-xs shrink-0" style={{ color: "var(--tn-accent)" }}>{selectedGame.game_type}</span>
              <span style={{ color: "var(--tn-border-strong)" }}>·</span>
              <span className="truncate max-w-[120px]" style={{ color: "var(--tn-text)" }}>{selectedGame.track ?? selectedGame.date}</span>
              <span className="tn-mono text-xs shrink-0" style={{ color: "var(--tn-text-faint)" }}>{selectedGame.date}</span>
            </>
          ) : (
            <span style={{ color: "var(--tn-text-faint)" }}>Välj spel</span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: "var(--tn-text-faint)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Next */}
        <button
          onClick={() => nextGame && router.push(`/?game=${nextGame.id}`)}
          disabled={!nextGame}
          aria-label="Nästa spel"
          style={{ ...iconBtn, opacity: nextGame ? 1 : 0.3 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 w-80 rounded-xl p-4 shadow-2xl"
            style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
          >
            <p className="tn-eyebrow mb-3">Hämta nytt spel</p>

            {/* Date picker */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); const s = d.toLocaleDateString("sv-SE"); if (s >= minDate()) setDate(s); }}
                style={iconBtn} aria-label="Föregående dag"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <input
                type="date" value={date} min={minDate()} max={maxDate()}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-lg text-sm outline-none"
                style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)", padding: "6px 10px" }}
              />
              <button
                onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); const s = d.toLocaleDateString("sv-SE"); if (s <= maxDate()) setDate(s); }}
                style={iconBtn} aria-label="Nästa dag"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Available games */}
            {loadingGames ? (
              <div className="text-sm text-center py-3" style={{ color: "var(--tn-text-faint)" }}>Letar spel...</div>
            ) : availableGames.length === 0 ? (
              <div className="text-sm text-center py-3" style={{ color: "var(--tn-text-faint)" }}>
                Inga spel {date === todayLocal() ? "idag" : date === tomorrowLocal() ? "imorgon" : date}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {availableGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleFetch(game)}
                    disabled={fetchingId !== null}
                    className="w-full flex items-center justify-between rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ padding: "10px 12px", background: "var(--tn-accent-faint)", border: "1px solid transparent", color: "var(--tn-accent)" }}
                  >
                    <span>{game.label}</span>
                    {fetchingId === game.id ? (
                      <span className="tn-mono text-xs" style={{ color: "var(--tn-accent)", opacity: 0.6 }}>Hämtar...</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {message && (
              <p className="text-xs mt-2" style={{ color: "var(--tn-value-low)" }}>{message}</p>
            )}

            {/* Saved games */}
            {savedGames.length > 0 && (
              <>
                <div className="my-3" style={{ borderTop: "1px solid var(--tn-border)" }} />
                <p className="tn-eyebrow mb-2">Sparade omgångar</p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {savedGames.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setOpen(false); router.push(`/?game=${encodeURIComponent(g.id)}`); }}
                      className="w-full text-left rounded-lg text-sm transition-colors"
                      style={{
                        padding: "8px 10px",
                        background: g.id === selectedId ? "var(--tn-accent-faint)" : "transparent",
                        color: g.id === selectedId ? "var(--tn-accent)" : "var(--tn-text-dim)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span className="font-semibold tn-mono text-xs" style={{ color: g.id === selectedId ? "var(--tn-accent)" : "var(--tn-text)" }}>{g.game_type}</span>
                      <span className="mx-1.5" style={{ color: "var(--tn-text-faint)" }}>·</span>
                      {g.track && <span>{g.track} · </span>}
                      <span style={{ color: "var(--tn-text-faint)" }}>{g.date}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
