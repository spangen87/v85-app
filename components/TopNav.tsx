import Link from "next/link";
import { NavActiveLink } from "@/components/NavActiveLink";
import { NAV_ITEMS } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TravaWordmark } from "@/components/ui";
import { UserMenu } from "@/components/groups/UserMenu";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { getGroupActivity } from "@/lib/actions/activity";
import { getAuthUser } from "@/lib/supabase/guards";


export async function TopNav() {
  const user = await getAuthUser();

  const [profile, groups, activity] = user
    ? await Promise.all([getProfile(), getMyGroups(), getGroupActivity()])
    : [null, [], null];

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = user != null && adminIds.includes(user.id);

  return (
    <nav
      className="hidden md:flex items-center gap-6 sticky top-0 z-50 px-8 py-3"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      aria-label="Huvudmeny"
    >
      <Link href="/" aria-label="Trava, till loppvyn" className="shrink-0"><TravaWordmark size={30} /></Link>

      <div className="flex gap-1">
        {NAV_ITEMS.map((tab) => (
          <NavActiveLink key={tab.href} href={tab.href} label={tab.label} />
        ))}
        {isAdmin && <NavActiveLink href="/admin" label="Admin" />}
      </div>

      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Link href="/manual" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9" /><path d="M12 17.2v.1" />
          </svg>
          Manual
        </Link>
        <ThemeToggle />
        {user && profile !== null && (
          <UserMenu
            profile={profile}
            groups={groups}
            userEmail={user.email ?? ""}
            unseenByGroup={activity?.unseenByGroup}
          />
        )}
      </div>
    </nav>
  );
}
