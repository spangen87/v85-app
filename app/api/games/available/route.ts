import { NextRequest, NextResponse } from "next/server";
import { fetchAvailableGames } from "@/lib/atg";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  try {
    const games = await fetchAvailableGames(date);
    return NextResponse.json({ games });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
