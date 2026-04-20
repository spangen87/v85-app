"use client";

import { useState } from "react";

interface StarterForRanking {
  start_number: number;
  horses: { name: string } | null;
  formscore: number | null;
  odds: number | null;
  bet_distribution: number | null;
  finish_position?: number | null;
  finish_time?: string | null;
}

interface RaceForRanking {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: StarterForRanking[];
}

interface RankedHorse {
  horseName: string;
  startNumber: number;
  raceNumber: number;
  compositeScore: number;
  odds: number | null;
  isValue: boolean;
  finish_position: number | null;
  finish_time: string | null;
}

interface TopFiveRankingProps {
  races: RaceForRanking[];
  onHorseClick?: (raceNumber: number, startNumber: number) => void;
}

export function TopFiveRanking({ races, onHorseClick }: TopFiveRankingProps) {
  const [collapsed, setCollapsed] = useState(false);

  const allHorses: RankedHorse[] = [];
  for (const race of races) {
    for (const s of race.starters) {
      const cs = s.formscore ?? 0;
      if (cs === 0) continue;
      const totalCS = race.starters.reduce((sum, st) => sum + (st.formscore ?? 0), 0);
      const calcPct = totalCS > 0 ? (cs / totalCS) * 100 : 0;
      const streckPct = s.bet_distribution ?? 0;
      const isValue = cs > 55 && streckPct > 0 && calcPct > streckPct;
      allHorses.push({
        horseName: s.horses?.name ?? `Nr ${s.start_number}`,
        startNumber: s.start_number,
        raceNumber: race.race_number,
        compositeScore: cs,
        odds: s.odds ?? null,
        isValue,
        finish_position: s.finish_position ?? null,
        finish_time: s.finish_time ?? null,
      });
    }
  }

  if (allHorses.length === 0) return null;

  allHorses.sort((a, b) => b.compositeScore - a.compositeScore);
  const top5 = allHorses.slice(0, 5);

  const rankColors = [
    { color: "var(--tn-p1)", bg: "rgba(251,191,36,0.15)", textColor: "#0a0e14" },
    { color: "var(--tn-p2)", bg: "rgba(148,163,184,0.15)", textColor: "#0a0e14" },
    { color: "var(--tn-p3)", bg: "rgba(180,83,9,0.15)", textColor: "#fff" },
    { color: "var(--tn-accent)", bg: "var(--tn-accent-faint)", textColor: "var(--tn-accent)" },
    { color: "var(--tn-accent)", bg: "var(--tn-accent-faint)", textColor: "var(--tn-accent)" },
  ];

  return (
    <div
      className="mb-4 rounded-xl overflow-hidden md:max-w-[45%]"
      style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--tn-border)" }}
      >
        <div>
          <p className="tn-eyebrow mb-0.5">Top 5 — Composite Score</p>
          {!collapsed && (
            <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
              Rankad efter CS — form, tid, odds, konsistens, distans och spår
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="tn-mono text-xs ml-3 shrink-0 transition-colors"
          style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
        >
          {collapsed ? "▼ VISA" : "▲ DÖLJ"}
        </button>
      </div>

      {!collapsed && (
        <div>
          {top5.map((horse, i) => {
            const rank = rankColors[i];
            const finishStyle: React.CSSProperties =
              horse.finish_position === 1 ? { background: "var(--tn-p1)", color: "#0a0e14" }
              : horse.finish_position === 2 ? { background: "var(--tn-p2)", color: "#0a0e14" }
              : horse.finish_position === 3 ? { background: "var(--tn-p3)", color: "#fff" }
              : horse.finish_position != null ? { background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }
              : {};

            return (
              <div
                key={`${horse.raceNumber}-${horse.startNumber}`}
                onClick={() => onHorseClick?.(horse.raceNumber, horse.startNumber)}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderBottom: i < top5.length - 1 ? "1px solid var(--tn-border)" : "none",
                  cursor: onHorseClick ? "pointer" : "default",
                  background: "transparent",
                }}
                onMouseEnter={(e) => { if (onHorseClick) e.currentTarget.style.background = "var(--tn-bg-card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Rank badge */}
                <span
                  className="tn-mono w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: rank.bg, color: rank.textColor === "#0a0e14" ? rank.color : rank.textColor }}
                >
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate" style={{ color: "var(--tn-text)" }}>
                      {horse.horseName}
                    </span>
                    {horse.isValue && (
                      <span
                        className="tn-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "var(--tn-value-high-bg)", color: "var(--tn-value-high)", letterSpacing: "0.08em" }}
                      >
                        VÄRDE
                      </span>
                    )}
                  </div>
                  <span className="tn-mono text-[11px]" style={{ color: "var(--tn-text-faint)" }}>
                    Avd {horse.raceNumber} · Nr {horse.startNumber}
                    {horse.odds ? ` · ${horse.odds}x` : ""}
                  </span>
                </div>

                {horse.finish_position != null && (
                  <span
                    className="tn-mono text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={finishStyle}
                  >
                    {horse.finish_position}:a{horse.finish_time ? ` ${horse.finish_time}` : ""}
                  </span>
                )}

                <div className="text-right shrink-0">
                  <div className="tn-mono text-sm font-bold" style={{ color: "var(--tn-accent)" }}>
                    {horse.compositeScore}
                  </div>
                  <div className="tn-eyebrow" style={{ fontSize: 9 }}>CS</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
