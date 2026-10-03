import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseHistoryRecords, resolveAtgRaceId, splitInternalRaceId } from "@/lib/atg";

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

  if (!splitInternalRaceId(internalRaceId)) {
    return NextResponse.json({ error: "Ogiltigt raceId-format" }, { status: 400 });
  }
  // Lopp-id:t kan inte härledas ur vårt id (V86 m.fl. går på två banor) —
  // slå upp det via spelet hos ATG
  const atgRaceId = await resolveAtgRaceId(internalRaceId);
  if (!atgRaceId) {
    return NextResponse.json({ error: "Kunde inte hitta loppet hos ATG" }, { status: 502 });
  }
  const raceDate = atgRaceId.split("_")[0];

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
      const distance = start["distance"] != null ? Number(start["distance"]) : null;

      const race = (r["race"] as Record<string, unknown>) ?? {};
      const startMethod = String(race["startMethod"] ?? "") || null;

      const horseInStart = (start["horse"] as Record<string, unknown>) ?? {};
      const shoesInStart = (horseInStart["shoes"] as Record<string, unknown>) ?? {};
      const shoesFront = "front" in shoesInStart ? Boolean(shoesInStart["front"]) : null;
      const shoesBack = "back" in shoesInStart ? Boolean(shoesInStart["back"]) : null;

      return {
        date: String(r["date"] ?? ""),
        track: String(track["name"] ?? ""),
        place: String(r["place"] ?? "–"),
        time: formatKmTime(kmTime),
        driver: driverName || null,
        post_position: postPos,
        distance,
        start_method: startMethod,
        shoes_front: shoesFront,
        shoes_back: shoesBack,
      };
    });

    // Persistera historiken så att den förbättrar CS-beräkningen vid nästa
    // omhämtning av omgången — annars försvinner datat när vyn stängs.
    // Skriv bara om raden saknar historik (omgångshämtningen fyller den
    // normalt) och bara om ATG-svaret gäller rätt häst.
    // Bara starter före loppet — för avgjorda lopp ingår annars loppet
    // självt, vilket skulle läcka facit in i formberäkningen.
    const atgHorseId = horseData["id"] != null ? String(horseData["id"]) : null;
    const history = parseHistoryRecords(records, raceDate).slice(0, 10);
    if (history.length > 0 && atgHorseId === horseId) {
      try {
        const db = createServiceClient();
        const { data: existing } = await db
          .from("starters")
          .select("id, last_5_results")
          .eq("race_id", internalRaceId)
          .eq("horse_id", horseId)
          .maybeSingle();
        if (
          existing &&
          (!existing.last_5_results || existing.last_5_results.length === 0)
        ) {
          await db
            .from("starters")
            .update({
              last_5_results: history.slice(0, 5),
              horse_starts_history: history,
            })
            .eq("id", existing.id);
        }
      } catch (err) {
        console.warn(
          `[horse-starts] Kunde inte spara historik för häst ${horseId}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    return NextResponse.json({ starts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
