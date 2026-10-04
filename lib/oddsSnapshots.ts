/**
 * Ögonblicksbilder av odds och streck (issue #98, avsnitt 3.3). En rad per
 * start sparas varje gång en omgång hämtas, så att det går att mäta hur
 * odds/streck ändras under dagen och hur tidigt systemförslagen blir
 * pålitliga. Tabellen odds_snapshots skapas i supabase/migration_v15.
 *
 * Sparandet får aldrig stoppa hämtningen: fel (t.ex. att tabellen inte finns
 * ännu) loggas och ignoreras.
 */

export interface OddsSnapshotRow {
  game_id: string;
  race_id: string;
  race_number: number;
  start_number: number;
  horse_id: string | null;
  /** Vinnarodds (decimal), null innan vinnarpoolen öppnat */
  odds: number | null;
  /** Streck i procent */
  bet_distribution: number | null;
  captured_at: string;
}

export interface SnapshotStarter {
  start_number: number;
  horse_id: string | null;
  odds: number | null;
  bet_distribution: number | null;
}

export function buildOddsSnapshots(
  gameId: string,
  raceId: string,
  raceNumber: number,
  starters: SnapshotStarter[],
  capturedAt: string
): OddsSnapshotRow[] {
  return starters.map((s) => ({
    game_id: gameId,
    race_id: raceId,
    race_number: raceNumber,
    start_number: s.start_number,
    horse_id: s.horse_id || null,
    odds: s.odds,
    bet_distribution: s.bet_distribution,
    captured_at: capturedAt,
  }));
}

/** Det enda som behövs av Supabase-klienten — gör funktionen testbar */
export interface SnapshotClient {
  from(table: string): {
    insert(rows: OddsSnapshotRow[]): PromiseLike<{ error: { message: string; code?: string } | null }>;
  };
}

/** Sparar ögonblicksbilderna. Returnerar false (och loggar) vid fel — kastar aldrig. */
export async function saveOddsSnapshots(client: SnapshotClient, rows: OddsSnapshotRow[]): Promise<boolean> {
  if (rows.length === 0) return true;
  try {
    const { error } = await client.from("odds_snapshots").insert(rows);
    if (error) {
      console.warn(`[fetch] odds_snapshots sparades inte (${error.code ?? "fel"}): ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[fetch] odds_snapshots sparades inte:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
