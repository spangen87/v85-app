/**
 * Märkenas facit: hur ofta hästar med ett visst märke har vunnit, jämfört med
 * vad Chans och strecket sa. Räknas på alla avgjorda lopp i databasen med
 * samma regler som loppvyn (lib/raceView.ts), så siffrorna följer med när
 * reglerna ändras eller fler omgångar rättas.
 */
import { computeWinProbabilities } from "./probability";
import { computeSkrallSignals } from "./skrall";
import { computeEdgeSignals, type EdgeInput } from "./edge";
import { isOverplayed } from "./overplayed";
import { skrallbudKeys, rowKey } from "./raceView";
import type { TermId } from "./glossary";

export interface BadgeStarterRow extends EdgeInput {
  race_id: string;
  odds: number | null;
  bet_distribution: number | null;
  formscore: number | null;
  finish_position: number | null;
  earnings_total: number | null;
  starts_total: number | null;
  races: { race_number: number; game_id: string } | null;
}

export type BadgeKey = "favorit" | "overplayed" | "shoes" | "skrall" | "skrallbud" | "signal" | "value";

export interface BadgeStat {
  key: BadgeKey;
  label: string;
  /** Ordlistans term, om märket har en */
  term: TermId | null;
  /** Antal hästar med märket */
  n: number;
  /** Snittstreck, procent */
  streckPct: number;
  /** Vad Chans sa i snitt, procent */
  expectedPct: number;
  /** Hur ofta de vann, procent */
  winPct: number;
}

const GROUPS: { key: BadgeKey; label: string; term: TermId | null }[] = [
  { key: "favorit", label: "Favoriten (högst streck)", term: null },
  { key: "overplayed", label: "Överspelad", term: "overspelad" },
  { key: "shoes", label: "Skor på", term: "skorpa" },
  { key: "skrall", label: "Skräll", term: "skrall" },
  { key: "skrallbud", label: "Skrällbud", term: "skrallbud" },
  { key: "signal", label: "Signal", term: "signal" },
  { key: "value", label: "Värde", term: "varde" },
];

/** Under så här många hästar är siffrorna för osäkra att dra slutsatser av */
export const SMALL_SAMPLE = 100;

interface Horse {
  raceNumber: number;
  n: number;
  scratched: boolean;
  chansPct: number | null;
  streckPct: number | null;
  classRank: number | null;
  won: boolean;
  tags: Set<BadgeKey>;
}

export function computeBadgeStats(rows: BadgeStarterRow[]): { races: number; stats: BadgeStat[] } {
  const byGame = new Map<string, Map<string, BadgeStarterRow[]>>();
  for (const row of rows) {
    if (!row.races) continue;
    const game = byGame.get(row.races.game_id) ?? new Map<string, BadgeStarterRow[]>();
    byGame.set(row.races.game_id, game);
    game.set(row.race_id, [...(game.get(row.race_id) ?? []), row]);
  }

  const acc = new Map<BadgeKey, { n: number; streck: number; expected: number; wins: number }>(
    GROUPS.map((g) => [g.key, { n: 0, streck: 0, expected: 0, wins: 0 }]),
  );
  let races = 0;

  for (const game of byGame.values()) {
    const horses: Horse[] = [];
    for (const starters of game.values()) {
      // Bara avgjorda lopp med exakt en vinnare, och en marknad att jämföra med
      if (starters.filter((s) => s.finish_position === 1).length !== 1) continue;
      // Struken = saknar odds när loppet har odds (som scratchedMask i lib/fundamental)
      const oddsOpen = starters.some((s) => (s.odds ?? 0) > 0);
      const mask = starters.map((s) => oddsOpen && !((s.odds ?? 0) > 0));
      const active = starters.filter((_, i) => !mask[i]);
      const probs = computeWinProbabilities(active);
      if (active.length < 2 || probs.some((p) => p.source === "uniform")) continue;
      if (!active.some((s) => s.finish_position === 1)) continue;
      races++;

      const skrall = computeSkrallSignals(starters);
      const edge = computeEdgeSignals(starters);
      const probByNumber = new Map(active.map((s, i) => [s.start_number, probs[i].p * 100]));
      const topStreck = Math.max(...active.map((s) => s.bet_distribution ?? 0));
      let favoriteTaken = false;

      starters.forEach((s, i) => {
        if (mask[i]) return;
        const chansPct = probByNumber.get(s.start_number) ?? null;
        const streckPct = s.bet_distribution != null && s.bet_distribution > 0 ? s.bet_distribution : null;
        const tags = new Set<BadgeKey>();
        if (!favoriteTaken && streckPct != null && streckPct === topStreck) { tags.add("favorit"); favoriteTaken = true; }
        if (isOverplayed(chansPct, streckPct)) tags.add("overplayed");
        if (edge[i].shoesOn) tags.add("shoes");
        if (skrall[i].isCandidate) tags.add("skrall");
        if (edge[i].isEdge) tags.add("signal");
        if ((s.formscore ?? 0) > 55 && chansPct != null && streckPct != null && chansPct > streckPct) tags.add("value");
        horses.push({
          raceNumber: s.races!.race_number, n: s.start_number, scratched: false,
          chansPct, streckPct, classRank: skrall[i].classRank, won: s.finish_position === 1, tags,
        });
      });
    }

    // Skrällbuden väljs över hela omgången
    const bud = skrallbudKeys(horses);
    for (const h of horses) {
      if (bud.has(rowKey(h))) h.tags.add("skrallbud");
      for (const key of h.tags) {
        const a = acc.get(key)!;
        a.n++;
        a.streck += h.streckPct ?? 0;
        a.expected += h.chansPct ?? 0;
        a.wins += h.won ? 1 : 0;
      }
    }
  }

  return {
    races,
    stats: GROUPS.map((g) => {
      const a = acc.get(g.key)!;
      const div = Math.max(a.n, 1);
      return { ...g, n: a.n, streckPct: a.streck / div, expectedPct: a.expected / div, winPct: (a.wins / div) * 100 };
    }),
  };
}
