import { NextRequest, NextResponse } from "next/server";
import { fetchAndStoreGame } from "@/lib/gameFetch";

// Historikhämtningen (ett anrop per avdelning, med retry) kan ta längre tid
// än standardgränsen
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gameType: string = body.gameType ?? "V85";
  const gameId: string = body.gameId;

  if (!gameId) {
    return NextResponse.json({ error: "gameId krävs" }, { status: 400 });
  }

  try {
    const stored = await fetchAndStoreGame(gameType, gameId);
    return NextResponse.json({ success: true, ...stored });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
