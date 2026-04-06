import { NextRequest, NextResponse } from "next/server";

const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

function formatKmTime(timeObj: Record<string, number> | null | undefined): string {
  if (!timeObj) return "–";
  const m = timeObj["minutes"] ?? 0;
  const s = timeObj["seconds"] ?? 0;
  const t = timeObj["tenths"] ?? 0;
  return `${m}:${String(s).padStart(2, "0")},${t}`;
}

/**
 * Derive the ATG race ID from our internal race ID.
 * Our format:  "{gameType}_{date}_{trackId}_{firstRaceNum}_{ourRaceNum}"
 * e.g.         "V85_2026-04-05_23_5_1"
 * ATG format:  "{date}_{trackId}_{firstRaceNum + ourRaceNum - 1}"
 * e.g.         "2026-04-05_23_5"
 */
function deriveAtgRaceId(internalRaceId: string): string | null {
  // Split on _ — date segment contains hyphens so splitting by _ is safe
  const parts = internalRaceId.split("_");
  // Expected: [gameType, date, trackId, firstRaceNum, ourRaceNum]
  if (parts.length < 5) return null;
  const date = parts[1];          // "2026-04-05"
  const trackId = parts[2];       // "23"
  const firstRaceNum = parseInt(parts[3], 10); // 5
  const ourRaceNum = parseInt(parts[4], 10);   // 1, 2, 3 …
  if (isNaN(firstRaceNum) || isNaN(ourRaceNum)) return null;
  const atgRaceNum = firstRaceNum + ourRaceNum - 1;
  return `${date}_${trackId}_${atgRaceNum}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ horseId: string }> }
) {
  const { horseId } = await params;

  if (!horseId) {
    return NextResponse.json({ error: "horseId saknas" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const internalRaceId = searchParams.get("raceId");
  const startNumber = searchParams.get("startNumber");

  if (!internalRaceId || !startNumber) {
    return NextResponse.json({ starts: [] });
  }

  const atgRaceId = deriveAtgRaceId(internalRaceId);
  if (!atgRaceId) {
    return NextResponse.json({ error: "Ogiltigt raceId-format" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${ATG_BASE}/races/${atgRaceId}/start/${startNumber}`,
      { headers: HEADERS, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      throw new Error(`ATG API svarade ${res.status}`);
    }

    const raw = await res.json();

    // API returns either a single object or an array — normalise to array
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
    if (items.length === 0) return NextResponse.json({ starts: [] });

    const horseData = (items[0]["horse"] as Record<string, unknown>) ?? {};
    const results = (horseData["results"] as Record<string, unknown>) ?? {};
    const records = (results["records"] as Record<string, unknown>[]) ?? [];

    const starts = records.slice(0, 10).map((r) => {
      const track = (r["track"] as Record<string, unknown>) ?? {};
      const kmTime = r["kmTime"] as Record<string, number> | null | undefined;
      const start = (r["start"] as Record<string, unknown>) ?? {};

      const driverRaw = start["driver"];
      let driverName = "";
      if (typeof driverRaw === "string") {
        driverName = driverRaw;
      } else if (typeof driverRaw === "object" && driverRaw !== null) {
        const d = driverRaw as Record<string, unknown>;
        driverName = `${d["firstName"] ?? ""} ${d["lastName"] ?? ""}`.trim();
      }

      const postPos = start["postPosition"] != null ? Number(start["postPosition"]) : null;

      return {
        date: String(r["date"] ?? ""),
        track: String(track["name"] ?? ""),
        place: String(r["place"] ?? "–"),
        time: formatKmTime(kmTime),
        driver: driverName || null,
        post_position: postPos,
      };
    });

    return NextResponse.json({ starts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
