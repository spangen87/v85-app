import Link from "next/link";
import type { ActivityItem } from "@/lib/types";

const LABEL_COLORS: Record<string, string> = {
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days > 1 ? "ar" : ""} sedan`;
}

interface Props {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-10">
        Ingen aktivitet ännu. Börja diskutera i Forum- eller Anteckningar-fliken!
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-start gap-3">
            {/* Ikon */}
            <div
              className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                item.kind === "post"
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              }`}
            >
              {item.kind === "post" ? "💬" : "📝"}
            </div>

            <div className="flex-1 min-w-0">
              {/* Kontext-rad */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.author}
                </span>
                {item.kind === "post" ? (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      i forum
                    </span>
                    {item.game_date && (
                      <Link
                        href={`/?game=${item.game_id}`}
                        className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:underline"
                      >
                        {item.game_type} {item.game_date}
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      noterade
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.horse_name}
                    </span>
                    {item.label && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${LABEL_COLORS[item.label] ?? ""}`}
                      >
                        {item.label}
                      </span>
                    )}
                  </>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
                  {relativeTime(item.created_at)}
                </span>
              </div>

              {/* Innehåll */}
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {item.content}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
