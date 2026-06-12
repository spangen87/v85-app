import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { SallskapOverview } from "@/components/groups/SallskapOverview";

/**
 * Översikt över användarens sällskap + profil. Mobilens ingång till det
 * sociala (Profil-fliken i BottomNav pekar hit).
 */
export default async function SallskapOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, groups] = await Promise.all([getProfile(), getMyGroups()]);

  return (
    <SallskapOverview
      profile={profile}
      initialGroups={groups}
      userEmail={user.email ?? ""}
    />
  );
}
