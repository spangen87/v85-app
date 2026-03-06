import { NextRequest, NextResponse } from "next/server";

const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

function formatTime(timeObj: Record<string, number> | null | undefined): string {
  if (!timeObj) return "–";
  const m = timeObj["minutes"] ?? 0;
  const s = timeObj["seconds"] ?? 0;
  const t = timeObj["tenths"] ?? 0;
  return `${m}:${String(s).padStart(2, "0")},${t}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { horseId: string } }
) {
  const { horseId } = params;

  if (!horseId) {
    return NextResponse.json({ error: "horseId saknas" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ATG_BASE}/horses/${horseId}`, {
      headers: HEADERS,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`ATG API svarade ${res.status}`);
    }

    const raw = await res.json();

    // ATG returnerar starts som en lista under horse.starts eller direkt
    const startsRaw = (raw["starts"] as Record<string, unknown>[]) ?? [];

    const starts = startsRaw.slice(0, 5).map((s) => {
      const race = (s["race"] as Record<string, unknown>) ?? {};
      const track = (race["track"] as Record<string, unknown>) ?? {};
      const startDate = String(race["date"] ?? s["date"] ?? "");
      const trackName = String(track["name"] ?? race["name"] ?? "");
      const place = String(s["place"] ?? "–");
      const timeRaw = s["time"] as Record<string, number> | null | undefined;

      return {
        date: startDate,
        track: trackName,
        place,
        time: formatTime(timeRaw),
      };
    });

    return NextResponse.json({ starts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
