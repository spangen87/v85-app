"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GroupNameForm } from "./GroupNameForm";
import { MemberList } from "./MemberList";
import { InviteLinkSection } from "./InviteLinkSection";
import { AtgTeamUrlForm } from "./AtgTeamUrlForm";
import type { Group, GroupMember } from "@/lib/types";

interface AdminTabProps {
  group: Group;
  members: GroupMember[];
  currentUserId: string;
  /** Nytt namn sparat, så att sidhuvudet kan följa med */
  onRenamed?: (name: string) => void;
}

export function AdminTab({ group, members, currentUserId, onRenamed }: AdminTabProps) {
  const router = useRouter();
  const isCreator = group.created_by === currentUserId;
  const [groupName, setGroupName] = useState(group.name);
  const [atgUrl, setAtgUrl] = useState(group.atg_team_url ?? null);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setLeaving(true);
    setError(null);
    const { error } = await leaveGroup(group.id);
    if (error) {
      setLeaving(false);
      setConfirmLeave(false);
      setError("Kunde inte lämna sällskapet. Försök igen.");
      return;
    }
    router.push("/sallskap");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="ta-section">
        <h2 className="ta-section-title">Namn</h2>
        <div className="ta-card ta-card-pad">
          {isCreator ? (
            <GroupNameForm groupId={group.id} initialName={groupName} onUpdated={(n) => { setGroupName(n); onRenamed?.(n); }} />
          ) : (
            <p style={{ margin: 0, font: "500 15px/20px var(--font-sans)", color: "var(--ink)" }}>{groupName}</p>
          )}
        </div>
      </section>

      <section className="ta-section">
        <div>
          <h2 className="ta-section-title">ATG-lag</h2>
          <p className="ta-text-sm" style={{ marginTop: 2 }}>Länk till sällskapets andelslag hos ATG.</p>
        </div>
        <div className="ta-card ta-card-pad">
          <AtgTeamUrlForm groupId={group.id} initialUrl={atgUrl} isCreator={isCreator} onUpdated={setAtgUrl} />
        </div>
      </section>

      <section className="ta-section">
        <h2 className="ta-section-title">Bjud in</h2>
        <InviteLinkSection inviteCode={group.invite_code} />
      </section>

      <section className="ta-section">
        <h2 className="ta-section-title">{`Medlemmar (${members.length})`}</h2>
        <MemberList members={members} creatorId={group.created_by} />
      </section>

      <section className="ta-section">
        {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
        <div>
          <Button variant="quiet" onClick={() => setConfirmLeave(true)} disabled={leaving}>Lämna sällskapet</Button>
        </div>
        {isCreator && <p className="ta-text-sm">Du har skapat sällskapet. Det finns kvar för de andra om du lämnar.</p>}
      </section>

      <ConfirmDialog
        open={confirmLeave}
        title={`Lämna ${groupName}?`}
        description="Du förlorar åtkomst till sällskapets forum, anteckningar och system. För att komma tillbaka behöver du en ny inbjudningskod."
        confirmLabel="Lämna sällskapet"
        danger
        busy={leaving}
        onConfirm={handleLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}
