"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup } from "@/lib/actions/groups";
import { GroupNameForm } from "./GroupNameForm";
import { MemberList } from "./MemberList";
import { InviteLinkSection } from "./InviteLinkSection";
import { AtgTeamUrlForm } from "./AtgTeamUrlForm";
import type { Group, GroupMember } from "@/lib/types";

interface AdminTabProps {
  group: Group;
  members: GroupMember[];
  currentUserId: string;
}

export function AdminTab({ group, members, currentUserId }: AdminTabProps) {
  const router = useRouter();
  const isCreator = group.created_by === currentUserId;
  const [groupName, setGroupName] = useState(group.name);
  const [atgUrl, setAtgUrl] = useState(group.atg_team_url ?? null);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!confirm("Vill du lämna sällskapet?")) return;
    setLeaving(true);
    await leaveGroup(group.id);
    router.push("/");
  }

  return (
    <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto">
      <section className="space-y-2">
        <h2 className="tn-eyebrow">Sällskapets namn</h2>
        {isCreator ? (
          <GroupNameForm groupId={group.id} initialName={groupName} onUpdated={setGroupName} />
        ) : (
          <p className="font-medium" style={{ color: "var(--tn-text)" }}>{groupName}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="tn-eyebrow">ATG-lag</h2>
        <AtgTeamUrlForm groupId={group.id} initialUrl={atgUrl} isCreator={isCreator} onUpdated={setAtgUrl} />
      </section>

      <section className="space-y-2">
        <h2 className="tn-eyebrow">Inbjudning</h2>
        <InviteLinkSection inviteCode={group.invite_code} />
      </section>

      <section className="space-y-2">
        <h2 className="tn-eyebrow">Medlemmar ({members.length})</h2>
        <MemberList members={members} creatorId={group.created_by} />
      </section>

      <section className="pt-2" style={{ borderTop: "1px solid var(--tn-border)" }}>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="text-sm transition disabled:opacity-50"
          style={{ color: "var(--tn-value-low)", background: "none", border: "none", cursor: "pointer" }}
        >
          {leaving ? "Lämnar…" : "Lämna sällskap"}
        </button>
        {isCreator && (
          <p className="text-xs mt-1" style={{ color: "var(--tn-text-faint)" }}>
            Du är skaparen — sällskapet kvarstår för övriga medlemmar.
          </p>
        )}
      </section>
    </div>
  );
}
