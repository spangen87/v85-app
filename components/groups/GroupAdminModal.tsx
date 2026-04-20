"use client";

import { useState } from "react";
import { ProfileForm } from "./ProfileForm";
import { GroupList } from "./GroupList";
import { CreateGroupForm } from "./CreateGroupForm";
import { JoinGroupForm } from "./JoinGroupForm";
import type { Group, Profile } from "@/lib/types";

interface GroupAdminModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  initialGroups: Group[];
}

export function GroupAdminModal({ open, onClose, profile, initialGroups }: GroupAdminModalProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);

  function handleCreated(group: Group) { setGroups((prev) => [...prev, group]); }
  function handleJoined(group: Group) { setGroups((prev) => (prev.find((g) => g.id === group.id) ? prev : [...prev, group])); }
  function handleLeft(groupId: string) { setGroups((prev) => prev.filter((g) => g.id !== groupId)); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--tn-border)" }}
        >
          <h2 className="font-semibold text-lg" style={{ color: "var(--tn-text)" }}>Mina sällskap</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none transition"
            style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          <section>
            <h3 className="tn-eyebrow mb-2">Visningsnamn</h3>
            <ProfileForm initialName={profile?.display_name ?? ""} />
          </section>

          <section>
            <h3 className="tn-eyebrow mb-2">Mina sällskap</h3>
            <GroupList groups={groups} onLeft={handleLeft} />
          </section>

          <section>
            <h3 className="tn-eyebrow mb-2">Skapa nytt sällskap</h3>
            <CreateGroupForm onCreated={handleCreated} />
          </section>

          <section>
            <h3 className="tn-eyebrow mb-2">Gå med via inbjudningskod</h3>
            <JoinGroupForm onJoined={handleJoined} />
          </section>
        </div>
      </div>
    </div>
  );
}
