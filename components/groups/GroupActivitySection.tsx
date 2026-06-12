import Link from "next/link";
import type { GroupActivitySummary, GroupActivityItem } from "@/lib/actions/activity";

const TYPE_LABEL: Record<GroupActivityItem["type"], string> = {
  post: "skrev i forumet",
  note: "antecknade om",
  system: "sparade systemet",
};

const TYPE_ICON: Record<GroupActivityItem["type"], string> = {
  post: "💬",
  note: "📝",
  system: "🎯",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days > 1 ? "ar" : ""} sedan`;
}

/**
 * "Nytt i dina sällskap" på startsidan — det andra sett osedda inlägg,
 * anteckningar och system sedan ditt senaste besök. Visas inte när allt är sett.
 */
export function GroupActivitySection({ activity }: { activity: GroupActivitySummary }) {
  if (activity.unseenTotal === 0) return null;

  return (
    <section
      className="mb-6 rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--tn-border)", background: "var(--tn-bg-card)" }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h2 className="tn-eyebrow">Nytt i dina sällskap</h2>
        <span
          className="min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--tn-accent)", color: "#fff" }}
        >
          {activity.unseenTotal > 9 ? "9+" : activity.unseenTotal}
        </span>
      </div>
      <ul>
        {activity.recent.map((item, i) => (
          <li key={`${item.type}-${item.created_at}-${i}`}>
            <Link
              href={`/sallskap/${item.group_id}`}
              className="flex items-baseline gap-2 px-4 py-2 text-sm transition hover:underline"
              style={{ borderTop: "1px solid var(--tn-border)" }}
            >
              <span aria-hidden="true" className="text-xs shrink-0">{TYPE_ICON[item.type]}</span>
              <span className="min-w-0 flex-1 truncate" style={{ color: "var(--tn-text)" }}>
                <span className="font-medium">{item.author_name}</span>{" "}
                <span style={{ color: "var(--tn-text-dim)" }}>
                  {TYPE_LABEL[item.type]}{" "}
                  {item.type === "note" && item.horse_name ? (
                    <span style={{ color: "var(--tn-text)" }}>{item.horse_name}</span>
                  ) : (
                    <span style={{ color: "var(--tn-text)" }}>
                      {item.text.length > 60 ? `${item.text.slice(0, 60)}…` : item.text}
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 tn-mono text-[10px]" style={{ color: "var(--tn-text-faint)" }}>
                {item.group_name} · {relativeTime(item.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
