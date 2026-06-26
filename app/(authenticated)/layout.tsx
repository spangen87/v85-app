import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getGroupActivity } from "@/lib/actions/activity";
import { getAuthUser } from "@/lib/supabase/guards";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = user != null && adminIds.includes(user.id);

  const activity = user ? await getGroupActivity() : null;

  return (
    <div className="pb-24 md:pb-0">
      <TopNav />
      {children}
      <BottomNav isAdmin={isAdmin} sallskapBadge={activity?.unseenTotal ?? 0} />
      <InstallPrompt />
    </div>
  );
}
