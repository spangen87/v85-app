import { Badge } from "@/components/ui";
import type { GroupMember } from "@/lib/types";

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "idag";
  if (days === 1) return "igår";
  if (days < 30) return `för ${days} dagar sedan`;
  if (days < 365) { const m = Math.floor(days / 30); return `för ${m} ${m === 1 ? "månad" : "månader"} sedan`; }
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

export function MemberList({ members, creatorId }: { members: GroupMember[]; creatorId: string }) {
  return (
    <ul className="ta-card ta-divided" style={{ listStyle: "none", margin: 0, padding: 0, overflow: "hidden" }}>
      {members.map((m) => (
        <li key={m.user_id} className="ta-linkrow">
          <span className="ta-avatar" aria-hidden="true">{m.display_name.slice(0, 2).toUpperCase()}</span>
          <span className="flex-1 min-w-0 truncate" style={{ font: "500 15px/20px var(--font-sans)" }}>{m.display_name}</span>
          {m.user_id === creatorId && <Badge>Skapare</Badge>}
          <span className="ta-text-sm shrink-0">{`Gick med ${relativeDate(m.joined_at)}`}</span>
        </li>
      ))}
    </ul>
  );
}
