import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAndStoreResults } from "@/lib/results";

// Flera omgångar kan behöva rättas i samma körning
export const maxDuration = 60;

/** Antal dagar bakåt som omgångar utan resultat plockas upp (fångar missade körningar) */
const LOOKBACK_DAYS = 7;

function stockholmDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  // sv-SE ger ISO-format YYYY-MM-DD
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
}

/**
 * Schemalagd resultathämtning (Vercel Cron, se vercel.json).
 * Hämtar resultat för sparade omgångar de senaste LOOKBACK_DAYS dagarna som
 * ännu saknar facit, rättar system och skickar resultatnotiser.
 *
 * Skyddas med CRON_SECRET — Vercel skickar "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET saknas i miljön" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: games, error } = await supabase
    .from("games")
    .select("id, date")
    .gte("date", stockholmDate(-LOOKBACK_DAYS))
    .lte("date", stockholmDate())
    .order("date");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const report: { game_id: string; status: string; updated?: number }[] = [];
  for (const game of games ?? []) {
    // Hoppa över omgångar som redan har facit
    const { count } = await supabase
      .from("starters")
      .select("id, races!inner(game_id)", { count: "exact", head: true })
      .eq("races.game_id", game.id)
      .not("finish_position", "is", null);
    if ((count ?? 0) > 0) continue;

    try {
      const outcome = await fetchAndStoreResults(supabase, game.id);
      report.push({
        game_id: game.id,
        status: outcome.status,
        updated: outcome.status === "ok" ? outcome.updated : undefined,
      });
    } catch (err) {
      report.push({ game_id: game.id, status: `error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  console.log("[cron/results]", JSON.stringify(report));
  return NextResponse.json({ checked: games?.length ?? 0, results: report });
}
