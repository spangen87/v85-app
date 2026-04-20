import type { GroupMember } from "@/lib/types";

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "idag";
  if (days === 1) return "igår";
  if (days < 30) return `${days} dagar sedan`;
  if (days < 365) return `${Math.floor(days / 30)} månader sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

export function MemberList({ members, creatorId }: { members: GroupMember[]; creatorId: string }) {
  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li
          key={m.user_id}
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
          style={{ background: "var(--tn-bg-chip)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "var(--tn-accent)", color: "#fff" }}
            >
              {m.display_name.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-sm truncate" style={{ color: "var(--tn-text)" }}>{m.display_name}</span>
            {m.user_id === creatorId && (
              <span
                className="text-xs px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "var(--tn-bg-card)", color: "var(--tn-text-faint)" }}
              >
                skapare
              </span>
            )}
          </div>
          <span className="text-xs shrink-0" style={{ color: "var(--tn-text-faint)" }}>
            {relativeDate(m.joined_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
