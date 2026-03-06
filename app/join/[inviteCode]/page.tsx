import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { joinGroup } from "@/lib/actions/groups";
import { updateProfile } from "@/lib/actions/groups";
import { JoinPage } from "./JoinPage";
import type { Group } from "@/lib/types";

interface Props {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ setupName?: string }>;
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { inviteCode } = await params;
  const { setupName } = await searchParams;

  // Hämta grupp-info med service client (ingen auth behövs för att visa info)
  const db = createServiceClient();
  const { data: group } = await db
    .from("groups")
    .select("id, name, invite_code, created_by, created_at")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-8 shadow-xl text-center">
          <p className="text-2xl mb-2">🔗</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Ogiltig inbjudningslänk
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Länken fungerar inte. Be om en ny länk av den som bjöd in dig.
          </p>
        </div>
      </div>
    );
  }

  // Kolla om användaren redan är inloggad
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Sätt visningsnamn om det skickades med (t.ex. efter nyregistrering)
    if (setupName) {
      await updateProfile(decodeURIComponent(setupName));
    }
    // Gå med i gruppen automatiskt (ignorera fel om redan med)
    await joinGroup(inviteCode);
    redirect("/");
  }

  // Visa registrerings-/login-sida
  return <JoinPage group={group as Group} inviteCode={inviteCode} />;
}
