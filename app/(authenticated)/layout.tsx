import type React from "react";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getMyGroups } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

async function getLatestActivityAt(groupIds: string[]): Promise<string | null> {
  if (groupIds.length === 0) return null;
  const db = createServiceClient();

  const [{ data: latestPost }, { data: latestNote }] = await Promise.all([
    db
      .from("group_posts")
      .select("created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("horse_notes")
      .select("created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const dates = [latestPost?.created_at, latestNote?.created_at].filter(
    (d): d is string => Boolean(d)
  );
  return dates.length > 0 ? dates.sort().reverse()[0] : null;
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let groups: Group[] = [];
  let latestActivityAt: string | null = null;

  if (user) {
    groups = await getMyGroups();
    latestActivityAt = await getLatestActivityAt(groups.map((g) => g.id));
  }

  return (
    <div className="pb-16 md:pb-0">
      {children}
      <BottomNav groups={groups} latestActivityAt={latestActivityAt} />
      <InstallPrompt />
    </div>
  );
}
