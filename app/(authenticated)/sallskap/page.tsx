import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { getGroupActivity } from "@/lib/actions/activity";
import { SallskapOverview } from "@/components/groups/SallskapOverview";

/**
 * Översikt över användarens sällskap + profil. Mobilens ingång till det
 * sociala (Profil-fliken i BottomNav pekar hit).
 */
export default async function SallskapOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, groups, activity] = await Promise.all([
    getProfile(),
    getMyGroups(),
    getGroupActivity(),
  ]);

  return (
    <SallskapOverview
      profile={profile}
      initialGroups={groups}
      userEmail={user.email ?? ""}
      unseenByGroup={activity.unseenByGroup}
    />
  );
}
