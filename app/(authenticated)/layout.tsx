import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getGroupActivity } from "@/lib/actions/activity";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = user != null && adminIds.includes(user.id);

  const activity = user ? await getGroupActivity() : null;

  return (
    <div className="pb-16 md:pb-0">
      <TopNav />
      {children}
      <BottomNav isAdmin={isAdmin} sallskapBadge={activity?.unseenTotal ?? 0} />
      <InstallPrompt />
    </div>
  );
}
