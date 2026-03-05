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

  function handleCreated(group: Group) {
    setGroups((prev) => [...prev, group]);
  }

  function handleJoined(group: Group) {
    setGroups((prev) => (prev.find((g) => g.id === group.id) ? prev : [...prev, group]));
  }

  function handleLeft(groupId: string) {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">Mina sällskap</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Visningsnamn */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Visningsnamn
            </h3>
            <ProfileForm initialName={profile?.display_name ?? ""} />
          </section>

          {/* Mina sällskap */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Mina sällskap
            </h3>
            <GroupList groups={groups} onLeft={handleLeft} />
          </section>

          {/* Skapa nytt sällskap */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Skapa nytt sällskap
            </h3>
            <CreateGroupForm onCreated={handleCreated} />
          </section>

          {/* Gå med via inbjudningskod */}
          <section>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Gå med via inbjudningskod
            </h3>
            <JoinGroupForm onJoined={handleJoined} />
          </section>
        </div>
      </div>
    </div>
  );
}
