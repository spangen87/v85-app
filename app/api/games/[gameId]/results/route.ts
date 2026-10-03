import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAndStoreResults } from "@/lib/results";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ error: "gameId saknas" }, { status: 400 });
  }

  try {
    const outcome = await fetchAndStoreResults(createServiceClient(), gameId);

    if (outcome.status === "not_ready") {
      return NextResponse.json(
        { error: "Inga resultat tillgängliga ännu för detta spel" },
        { status: 422 }
      );
    }
    if (outcome.status === "not_found") {
      return NextResponse.json({ error: outcome.error }, { status: 404 });
    }

    return NextResponse.json({ updated: outcome.updated, races: outcome.races });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
