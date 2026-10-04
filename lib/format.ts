/** Formatering enligt designsystemet: decimalkomma, hårt mellanslag före %, äkta minus. */
const NB = " ";
const MINUS = "−";

export function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? "–" : v.toFixed(d).replace(".", ",") + NB + "%";
}

export function fmtNum(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? "–" : v.toFixed(d).replace(".", ",");
}

/** Procentenheter: "+4,2", "−1,3", "±0". */
export function fmtDelta(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (Math.abs(r) < 0.05) return "±0";
  return (r > 0 ? "+" : MINUS) + Math.abs(r).toFixed(1).replace(".", ",");
}

/** "1:12,4" / "1.12,4" / "1:12.4" → "1.12,4" (som hos ATG). */
export function fmtKmTime(t: string | null | undefined): string {
  const s = (t ?? "").trim();
  if (!s) return "–";
  const m = s.match(/^(\d+)[:.](\d{2})[,.](\d)$/);
  return m ? `${m[1]}.${m[2]},${m[3]}` : s;
}

export function fmtKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const digits = String(Math.round(Math.abs(n)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  return (n < 0 ? MINUS : "") + grouped + NB + "kr";
}

/** 1 → "1:a", 3 → "3:e", 21 → "21:a", 11 → "11:e". */
export function fmtOrdinal(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const a = (last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12;
  return `${n}:${a ? "a" : "e"}`;
}

export function fmtStartMethod(m: string | null | undefined): string {
  if (m === "auto") return "Autostart";
  if (m === "volte") return "Voltstart";
  return "";
}

/** "2026-10-10" → "Lördag 10 oktober". */
export function fmtGameDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const s = d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ISO-tid → "16:20" i svensk tid. */
export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}
