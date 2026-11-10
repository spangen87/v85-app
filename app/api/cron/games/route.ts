import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAvailableGames } from "@/lib/atg";
import { fetchAndStoreGame } from "@/lib/gameFetch";
import { AUTO_FETCH_LOOKAHEAD_DAYS, AUTO_FETCH_TYPES, refreshDue, stockholmDate } from "@/lib/autoFetch";

export const maxDuration = 60;

/** Efter så här lång tid påbörjas ingen ny hämtning i samma körning */
const BUDGET_MS = 35_000;

/**
 * Schemalagd hämtning av omgångar och odds.
 *  1. Nya omgångar: kommande spel i ATG:s kalender (i dag och
 *     AUTO_FETCH_LOOKAHEAD_DAYS dagar framåt) som inte finns sparade hämtas.
 *  2. Odds: sparade omgångar som inte startat hämtas om enligt refreshDue —
 *     tätare ju närmare start. Varje hämtning sparar en ögonblicksbild.
 *
 * Tål att köras hur ofta som helst: när inget är dags görs bara tre
 * kalenderanrop och ett par databasfrågor. Det som inte hinns med tas i
 * nästa körning. Skyddas med CRON_SECRET som /api/cron/results.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET saknas i miljön" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 });
  }

  const started = Date.now();
  const hasTime = () => Date.now() - started < BUDGET_MS;
  const supabase = createServiceClient();
  const report: { game_id: string; action: "new" | "refresh"; status: string }[] = [];
  let skipped = 0;

  const today = stockholmDate();
  const { data: saved, error } = await supabase
    .from("games")
    .select("id, game_type, date")
    .gte("date", today);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const savedGames = (saved ?? []) as { id: string; game_type: string; date: string }[];
  const savedIds = new Set(savedGames.map((g) => g.id));

  // 1. Odds för sparade omgångar — närmast start först, så att de aldrig trängs undan av nya omgångar
  const due: { id: string; game_type: string; toStart: number }[] = [];
  if (savedGames.length > 0) {
    const ids = savedGames.map((g) => g.id);
    const { data: raceRows } = await supabase.from("races").select("game_id, start_time").in("game_id", ids);
    const firstStart = new Map<string, number>();
    for (const r of (raceRows ?? []) as { game_id: string; start_time: string | null }[]) {
      if (!r.start_time) continue;
      const t = new Date(r.start_time).getTime();
      if (!Number.isNaN(t) && t < (firstStart.get(r.game_id) ?? Infinity)) firstStart.set(r.game_id, t);
    }
    for (const g of savedGames) {
      const { data: snap } = await supabase
        .from("odds_snapshots")
        .select("captured_at")
        .eq("game_id", g.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const start = firstStart.get(g.id) ?? null;
      const msToStart = start != null ? start - Date.now() : null;
      const msSinceFetch = snap?.captured_at ? Date.now() - new Date(snap.captured_at).getTime() : null;
      if (refreshDue(msToStart, msSinceFetch)) due.push({ id: g.id, game_type: g.game_type, toStart: msToStart ?? Infinity });
    }
    due.sort((a, b) => a.toStart - b.toStart);
  }
  for (const g of due) {
    if (!hasTime()) { skipped++; continue; }
    try {
      await fetchAndStoreGame(g.game_type, g.id, { reuseHistory: true });
      report.push({ game_id: g.id, action: "refresh", status: "ok" });
    } catch (err) {
      report.push({ game_id: g.id, action: "refresh", status: `error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // 2. Nya omgångar ur kalendern
  for (let offset = 0; offset <= AUTO_FETCH_LOOKAHEAD_DAYS; offset++) {
    let available: Awaited<ReturnType<typeof fetchAvailableGames>> = [];
    try {
      available = await fetchAvailableGames(stockholmDate(offset));
    } catch {
      continue; // ATG svarar inte för datumet — tas i nästa körning
    }
    for (const type of AUTO_FETCH_TYPES) {
      for (const game of available.filter((a) => a.type === type)) {
        if (savedIds.has(game.id)) continue;
        if (!hasTime()) { skipped++; continue; }
        try {
          const stored = await fetchAndStoreGame(game.type, game.id);
          savedIds.add(stored.game_id);
          report.push({ game_id: stored.game_id, action: "new", status: "ok" });
        } catch (err) {
          report.push({ game_id: game.id, action: "new", status: `error: ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    }
  }

  console.log("[cron/games]", JSON.stringify({ report, skipped }));
  return NextResponse.json({ done: report, skipped });
}
