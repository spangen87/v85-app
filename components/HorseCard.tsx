interface LastResult {
  place: string;
  date: string;
  track: string;
  time: string;
}

interface Starter {
  id: string;
  start_number: number;
  horse_id: string;
  driver: string;
  trainer: string;
  odds: number | null;
  starts_total: number | null;
  wins_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  best_time: string | null;
  last_5_results: LastResult[];
  formscore: number | null;
  horses: { name: string } | null;
}

function FormBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color =
    score >= 70 ? "bg-green-600" : score >= 40 ? "bg-yellow-600" : "bg-gray-600";
  return (
    <span
      className={`${color} text-white text-xs font-bold px-2 py-1 rounded-full`}
      title="Formscore (0–100): viktat index baserat på vinstprocent (år), odds och bästa tid relativt fältet"
    >
      FS {score}
    </span>
  );
}

function PlaceBadge({ place }: { place: string }) {
  const color =
    place === "1" ? "bg-yellow-500 text-black" :
    place === "2" ? "bg-gray-300 text-black" :
    place === "3" ? "bg-orange-600 text-white" :
    "bg-gray-700 text-gray-300";
  return (
    <span className={`${color} text-xs font-bold w-6 h-6 flex items-center justify-center rounded`}>
      {place || "–"}
    </span>
  );
}

export function HorseCard({ starter }: { starter: Starter }) {
  const winRate = starter.starts_current_year
    ? Math.round(((starter.wins_current_year ?? 0) / starter.starts_current_year) * 100)
    : null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Huvud */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm w-5 text-center">{starter.start_number}</span>
          <div>
            <p className="text-white font-semibold">{starter.horses?.name ?? "–"}</p>
            <p className="text-gray-400 text-xs">{starter.driver}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {starter.odds && (
            <span className="text-gray-300 text-sm">{starter.odds.toFixed(1)}x</span>
          )}
          <FormBadge score={starter.formscore} />
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Starter/vinster</p>
          <p className="text-white font-medium">
            {starter.starts_total ?? "–"}/{starter.wins_total ?? "–"}
          </p>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Vinstprocent år</p>
          <p className="text-white font-medium">{winRate != null ? `${winRate}%` : "–"}</p>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Bästa tid</p>
          <p className="text-white font-medium">{starter.best_time ?? "–"}</p>
        </div>
      </div>

      {/* Senaste 5 */}
      {starter.last_5_results.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs mb-1">Senaste starter</p>
          <div className="flex gap-1">
            {starter.last_5_results.map((r, i) => (
              <PlaceBadge key={i} place={r.place} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
