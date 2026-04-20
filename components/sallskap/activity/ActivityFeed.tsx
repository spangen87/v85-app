"use client";

import Link from "next/link";
import type { ActivityItem } from "@/lib/types";
import { NoteLabelDot } from "@/components/notes/NoteLabel";
import type { NoteLabel } from "@/lib/types";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just nu";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min sedan`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} tim sedan`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "igår";
  if (diffDay < 7) return `${diffDay} dagar sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

const VALID_LABELS = new Set(["red", "orange", "yellow", "green", "blue", "purple"]);

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm italic text-center py-8" style={{ color: "var(--tn-text-faint)" }}>
        Ingen aktivitet ännu. Börja diskutera i Forum-fliken!
      </p>
    );
  }

  return (
    <div style={{ borderTop: "1px solid var(--tn-border)" }}>
      {items.map((item) => (
        <div key={item.id} className="px-4 py-3" style={{ borderBottom: "1px solid var(--tn-border)" }}>
          {item.kind === "post" ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: "var(--tn-accent)" }}>Forum</span>
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>&middot;</span>
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{relativeTime(item.created_at)}</span>
              </div>
              <p className="text-sm line-clamp-2" style={{ color: "var(--tn-text)" }}>{item.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{item.author}</span>
                {item.game_date && (
                  <Link
                    href={`/?game=${encodeURIComponent(item.game_id)}`}
                    className="text-xs hover:underline"
                    style={{ color: "var(--tn-accent)" }}
                  >
                    {item.game_type} {item.game_date}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                {VALID_LABELS.has(item.label) && <NoteLabelDot label={item.label as NoteLabel} />}
                <span className="text-xs font-medium" style={{ color: "var(--tn-text-dim)" }}>Anteckning</span>
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>&middot;</span>
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{relativeTime(item.created_at)}</span>
              </div>
              <p className="text-sm line-clamp-2" style={{ color: "var(--tn-text)" }}>{item.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{item.author}</span>
                <span className="text-xs font-medium" style={{ color: "var(--tn-text-dim)" }}>{item.horse_name}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
