import { NavActiveLink } from "@/components/NavActiveLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/groups/UserMenu";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { createClient } from "@/lib/supabase/server";

const tabs = [
  { label: "Analys", href: "/" },
  { label: "Utvärdering", href: "/evaluation" },
  { label: "System", href: "/system" },
  { label: "Manual", href: "/manual" },
];

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, groups] = user
    ? await Promise.all([getProfile(), getMyGroups()])
    : [null, []];

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = user != null && adminIds.includes(user.id);

  return (
    <nav className="hidden md:flex items-center sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 gap-6">
      {tabs.map((tab) => (
        <NavActiveLink key={tab.href} href={tab.href} label={tab.label} />
      ))}
      {isAdmin && <NavActiveLink href="/admin" label="Admin" />}
      <div className="flex-1" />
      <div className="flex items-center gap-2 py-2">
        <ThemeToggle />
        {user && profile !== null && (
          <UserMenu
            profile={profile}
            groups={groups}
            userEmail={user.email ?? ""}
          />
        )}
      </div>
    </nav>
  );
}
