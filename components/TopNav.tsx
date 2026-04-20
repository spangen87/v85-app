import { NavActiveLink } from "@/components/NavActiveLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/groups/UserMenu";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { createClient } from "@/lib/supabase/server";

const tabs = [
  { label: "Lopp", href: "/" },
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
    <nav
      className="hidden md:flex items-center sticky top-0 z-50 px-6 gap-1"
      style={{
        background: "color-mix(in oklab, var(--tn-bg) 88%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--tn-border)",
      }}
    >
      {/* Brand */}
      <div className="flex items-baseline gap-2 mr-6 py-3">
        <span className="tn-brand-mark text-xl">Travappen</span>
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--tn-accent)", transform: "translateY(-3px)" }}
        />
      </div>

      {/* Nav tabs */}
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
