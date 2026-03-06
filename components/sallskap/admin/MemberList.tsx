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
        <li key={m.user_id} className="flex items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {m.display_name.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-sm text-gray-900 dark:text-white truncate">{m.display_name}</span>
            {m.user_id === creatorId && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded shrink-0">
                skapare
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {relativeDate(m.joined_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
