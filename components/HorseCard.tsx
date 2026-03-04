interface LastResult {
  place: string;
  date: string;
  track: string;
  time: string;
}

interface Starter {
  id: string;
  start_number: number;
  post_position: number | null;
  horse_id: string;
  driver: string;
  driver_win_pct: number | null;
  trainer: string;
  trainer_win_pct: number | null;
  odds: number | null;
  // Skoinfo
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  sulky_type: string | null;
  // Häst
  horse_age: number | null;
  horse_sex: string | null;
  horse_color: string | null;
  pedigree_father: string | null;
  home_track: string | null;
  // Statistik
  starts_total: number | null;
  wins_total: number | null;
  places_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  best_time: string | null;
  last_5_results: LastResult[];
  formscore: number | null;
  horses: { name: string } | null;
}

const SEX_LABEL: Record<string, string> = {
  mare: "sto",
  gelding: "valack",
  stallion: "hingst",
  horse: "häst",
};

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

function ShoeBadge({
  hasShoe,
  changed,
  label,
}: {
  hasShoe: boolean | null;
  changed: boolean | null;
  label: string;
}) {
  if (hasShoe == null) return null;
  const shoe = hasShoe ? "🧲" : "–";
  return (
    <span className={`text-xs ${changed ? "text-amber-400 font-semibold" : "text-gray-400"}`}>
      {label}: {shoe}
      {changed ? " ändrat" : ""}
    </span>
  );
}

export function HorseCard({ starter }: { starter: Starter }) {
  const winRateYear = starter.starts_current_year
    ? Math.round(((starter.wins_current_year ?? 0) / starter.starts_current_year) * 100)
    : null;

  const sex = SEX_LABEL[starter.horse_sex ?? ""] ?? starter.horse_sex ?? "";

  const shoesChanged =
    starter.shoes_front_changed || starter.shoes_back_changed;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Huvud: nummer, namn, driver, odds, FS */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 text-sm shrink-0 w-5 text-center">
            {starter.start_number}
          </span>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">
              {starter.horses?.name ?? "–"}
            </p>
            <p className="text-gray-400 text-xs truncate">{starter.driver}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {starter.odds != null && (
            <span className="text-gray-300 text-sm">{starter.odds.toFixed(1)}x</span>
          )}
          <FormBadge score={starter.formscore} />
        </div>
      </div>

      {/* Häst-info: ålder, kön, färg, far, hemmaplan */}
      <div className="text-xs text-gray-400 space-y-0.5">
        {(starter.horse_age || sex || starter.horse_color) && (
          <p>
            {[
              starter.horse_age ? `${starter.horse_age} år` : null,
              sex || null,
              starter.horse_color || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {starter.pedigree_father && (
          <p>Far: <span className="text-gray-300">{starter.pedigree_father}</span></p>
        )}
        {starter.home_track && (
          <p>Hemmaplan: <span className="text-gray-300">{starter.home_track}</span></p>
        )}
      </div>

      {/* Skoinfo + sulky */}
      {starter.shoes_reported && (
        <div
          className={`rounded p-2 text-xs space-y-1 ${
            shoesChanged ? "bg-amber-900/30 border border-amber-700/50" : "bg-gray-700/50"
          }`}
        >
          <p className="text-gray-300 font-medium">
            Skor{shoesChanged ? " — ändring!" : ""}
          </p>
          <div className="flex gap-4">
            <ShoeBadge
              hasShoe={starter.shoes_front}
              changed={starter.shoes_front_changed}
              label="Fram"
            />
            <ShoeBadge
              hasShoe={starter.shoes_back}
              changed={starter.shoes_back_changed}
              label="Bak"
            />
          </div>
          {starter.sulky_type && (
            <p className="text-gray-400">Sulky: {starter.sulky_type}</p>
          )}
        </div>
      )}

      {/* Karriärstatistik */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Starter</p>
          <p className="text-white font-medium">{starter.starts_total ?? "–"}</p>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">1-2-3</p>
          <p className="text-white font-medium">
            {starter.wins_total ?? "–"}-{starter.places_total != null
              ? Math.round(starter.places_total / 2) // 2:or ungefär
              : "–"}-{starter.places_total != null
              ? starter.places_total - Math.round(starter.places_total / 2)
              : "–"}
          </p>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Bästa tid</p>
          <p className="text-white font-medium">{starter.best_time || "–"}</p>
        </div>
      </div>

      {/* Årets statistik */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Vinstprocent år</p>
          <p className="text-white font-medium">
            {winRateYear != null ? `${winRateYear}%` : "–"}
            {starter.starts_current_year
              ? ` (${starter.starts_current_year} st)`
              : ""}
          </p>
        </div>
        <div className="bg-gray-700 rounded p-2">
          <p className="text-gray-400">Kusk / Tränarens V%</p>
          <p className="text-white font-medium">
            {starter.driver_win_pct != null ? `${starter.driver_win_pct}%` : "–"}
            {" / "}
            {starter.trainer_win_pct != null ? `${starter.trainer_win_pct}%` : "–"}
          </p>
        </div>
      </div>

      {/* Senaste 5 (om data finns) */}
      {starter.last_5_results.length > 0 && (
        <div className="flex gap-1">
          {starter.last_5_results.map((r, i) => {
            const color =
              r.place === "1" ? "bg-yellow-500 text-black" :
              r.place === "2" ? "bg-gray-300 text-black" :
              r.place === "3" ? "bg-orange-600 text-white" :
              "bg-gray-700 text-gray-300";
            return (
              <span
                key={i}
                className={`${color} text-xs font-bold w-6 h-6 flex items-center justify-center rounded`}
              >
                {r.place || "–"}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
