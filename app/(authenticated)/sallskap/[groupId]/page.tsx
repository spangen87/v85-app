import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getGroupById } from "@/lib/actions/groups";
import { getGroupMembers } from "@/lib/actions/sallskap";
import { markGroupSeen } from "@/lib/actions/activity";
import { getGroupPosts } from "@/lib/actions/posts";
import { getGroupNotesForGame } from "@/lib/actions/notes";
import { getGroupSystems, getGroupLeague } from "@/lib/actions/systems";
import { SallskapPageClient } from "./SallskapPageClient";

interface Props {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ game?: string }>;
}

async function getAllGames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("games")
    .select("id, date, track, game_type")
    .order("date", { ascending: false });
  return data ?? [];
}

export default async function SallskapPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { game: gameParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifiera att användaren är medlem
  const db = createServiceClient();
  const { data: membership } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/");

  // Besöket nollställer aktivitetsbadgen för det här sällskapet
  await markGroupSeen(groupId);

  const [group, members, games] = await Promise.all([
    getGroupById(groupId),
    getGroupMembers(groupId),
    getAllGames(supabase),
  ]);

  if (!group) redirect("/");

  // Djuplänk från loppvyn (?game=) väljer rätt omgång, annars senaste
  const defaultGameId =
    (gameParam && games.find((g) => g.id === gameParam)?.id) ?? games[0]?.id ?? null;

  const [initialPosts, initialNotes, initialSystems, league] = await Promise.all([
    defaultGameId ? getGroupPosts(groupId, defaultGameId) : Promise.resolve([]),
    defaultGameId ? getGroupNotesForGame(groupId, defaultGameId) : Promise.resolve([]),
    defaultGameId ? getGroupSystems(groupId, defaultGameId) : Promise.resolve([]),
    getGroupLeague(groupId),
  ]);

  return (
    <SallskapPageClient
      group={group}
      members={members}
      games={games}
      initialPosts={initialPosts}
      initialNotes={initialNotes}
      initialSystems={initialSystems}
      league={league}
      defaultGameId={defaultGameId}
      currentUserId={user.id}
    />
  );
}
