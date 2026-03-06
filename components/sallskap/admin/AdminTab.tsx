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
      {/* Namn */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Sällskapets namn
        </h2>
        {isCreator ? (
          <GroupNameForm groupId={group.id} initialName={groupName} onUpdated={setGroupName} />
        ) : (
          <p className="text-gray-900 dark:text-white font-medium">{groupName}</p>
        )}
      </section>

      {/* ATG-lag */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          ATG-lag
        </h2>
        <AtgTeamUrlForm
          groupId={group.id}
          initialUrl={atgUrl}
          isCreator={isCreator}
          onUpdated={setAtgUrl}
        />
      </section>

      {/* Inbjudningslänk */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Inbjudning
        </h2>
        <InviteLinkSection inviteCode={group.invite_code} />
      </section>

      {/* Medlemmar */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Medlemmar ({members.length})
        </h2>
        <MemberList members={members} creatorId={group.created_by} />
      </section>

      {/* Lämna sällskap */}
      <section className="pt-2 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition"
        >
          {leaving ? "Lämnar…" : "Lämna sällskap"}
        </button>
        {isCreator && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Du är skaparen — sällskapet kvarstår för övriga medlemmar.
          </p>
        )}
      </section>
    </div>
  );
}
