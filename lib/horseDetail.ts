import { fmtOrdinal } from "./format";
import type { TrackConfig } from "./types";

export function chansNote(rank: number | null): string | null {
  if (rank == null) return null;
  return rank === 1 ? "Störst chans i loppet." : `${fmtOrdinal(rank)} störst chans i loppet.`;
}

export function rankNote(rank: number | null, what: string): string | null {
  return rank == null ? null : `${fmtOrdinal(rank)} ${what}.`;
}

const OENSE = "Grund och streck är oense. Då har strecket oftast haft rätt.";

export function grundNote(reasons: string[], disagree: boolean): string | null {
  const parts = [reasons.length ? `Varför: ${reasons.join(" · ")}.` : null, disagree ? OENSE : null].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/** Samma villkor som computeTrackFactor använder för banjusteringen. */
export function trackNote(post: number | null, cfg: TrackConfig | null, distance: number): string | null {
  if (post == null || !cfg) return null;
  if (cfg.open_stretch && cfg.open_stretch_lanes.includes(post)) return `Open stretch på ${cfg.track_name}: spåret räknas som bättre.`;
  if (cfg.short_race_threshold > 0 && distance <= cfg.short_race_threshold && post >= 5) return "Kort lopp: ytterspår räknas som sämre.";
  return null;
}

export function placementLine(starts: number | null, wins: number | null, p2: number | null, p3: number | null): string {
  if (!starts) return "–";
  return `${starts} starter · ${wins ?? 0}-${p2 ?? 0}-${p3 ?? 0}`;
}

export function distanceCategory(m: number): "short" | "medium" | "long" {
  return m <= 1800 ? "short" : m <= 2400 ? "medium" : "long";
}
