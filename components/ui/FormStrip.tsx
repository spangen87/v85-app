function cellClass(r: string): string {
  if (r === "1") return "ta-form-p1";
  if (r === "2") return "ta-form-p2";
  if (r === "3") return "ta-form-p3";
  if (r === "d") return "ta-form-dq";
  return "";
}

function spoken(r: string): string {
  if (r === "d") return "diskad";
  if (r.endsWith("g")) return `${r.slice(0, -1)} galopp`;
  return r || "okänd";
}

/** De fem senaste placeringarna i ATG-notation, nyast till vänster. */
export function FormStrip({ results }: { results: string[] }) {
  const items = results.slice(0, 5);
  return (
    <span className="ta-form" role="img" aria-label={`Senaste placeringar: ${items.map(spoken).join(", ") || "inga starter"}`}>
      {items.length === 0 && <span className="ta-form-empty">Inga starter</span>}
      {items.map((r, i) => (
        <span key={i} className={`ta-form-cell ${cellClass(r)}`}>{r || "–"}</span>
      ))}
    </span>
  );
}
