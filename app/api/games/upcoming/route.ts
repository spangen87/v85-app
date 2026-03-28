import { NextResponse } from "next/server";
import { fetchAvailableGames } from "@/lib/atg";

// Prioritetsordning för speltyper vi vill auto-ladda
const PRIORITY_TYPES = ["V86", "V85", "V75", "V65", "V64"];

function todayLocal(): string {
  const d = new Date();
  return d.toLocaleDateString("sv-SE");
}

function tomorrowLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

/**
 * GET /api/games/upcoming
 * Returnerar det nästkommande V86/V85/V75-spelet från ATG-kalendern.
 * Kollar idag och imorgon.
 */
export async function GET() {
  const dates = [todayLocal(), tomorrowLocal()];

  for (const date of dates) {
    try {
      const games = await fetchAvailableGames(date);
      for (const type of PRIORITY_TYPES) {
        const match = games.find((g) => g.type === type);
        if (match) {
          return NextResponse.json({ game: match, date });
        }
      }
    } catch {
      // Hoppa över datum om ATG inte svarar
    }
  }

  return NextResponse.json({ game: null, date: null });
}
