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

  const db = createServiceClient();
  const { data: group } = await db
    .from("groups")
    .select("id, name, invite_code, created_by, created_at")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tn-bg)" }}>
        <div
          className="w-full max-w-sm rounded-xl p-8 text-center"
          style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
        >
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tn-text)" }}>
            Ogiltig inbjudningslänk
          </h1>
          <p className="text-sm" style={{ color: "var(--tn-text-faint)" }}>
            Länken fungerar inte. Be om en ny länk av den som bjöd in dig.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (setupName) {
      await updateProfile(decodeURIComponent(setupName));
    }
    await joinGroup(inviteCode);
    redirect("/");
  }

  return <JoinPage group={group as Group} inviteCode={inviteCode} />;
}
