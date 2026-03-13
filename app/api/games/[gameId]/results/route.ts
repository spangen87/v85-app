import { NextRequest, NextResponse } from "next/server";
import { fetchGameResults } from "@/lib/atg";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ error: "gameId saknas" }, { status: 400 });
  }

  try {
    const gameResults = await fetchGameResults(gameId);

    if (!gameResults.is_complete) {
      return NextResponse.json(
        { error: "Inga resultat tillgängliga ännu för detta spel" },
        { status: 422 }
      );
    }

    const supabase = createServiceClient();

    // Kontrollera att spelet finns i databasen
    const { data: game } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .single();

    if (!game) {
      return NextResponse.json(
        { error: "Spelet finns inte i databasen. Hämta det först." },
        { status: 404 }
      );
    }

    // Hämta avdelningar för att bygga race_id-mappning
    const { data: races } = await supabase
      .from("races")
      .select("id, race_number")
      .eq("game_id", gameId)
      .order("race_number");

    if (!races || races.length === 0) {
      return NextResponse.json({ error: "Inga avdelningar hittades" }, { status: 404 });
    }

    // race_number är 1-baserat, race_index från ATG är 0-baserat
    const raceIdByIndex: Record<number, string> = Object.fromEntries(
      races.map((r) => [r.race_number - 1, r.id])
    );

    let updatedCount = 0;
    const racesSeen = new Set<number>();

    for (const result of gameResults.results) {
      const raceId = raceIdByIndex[result.race_index];
      if (!raceId) continue;

      const { error } = await supabase
        .from("starters")
        .update({
          finish_position: result.finish_position,
          finish_time: result.finish_time,
        })
        .eq("race_id", raceId)
        .eq("start_number", result.start_number);

      if (!error && result.finish_position !== null) {
        updatedCount++;
        racesSeen.add(result.race_index);
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      races: racesSeen.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
