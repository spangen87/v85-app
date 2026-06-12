"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProfileForm } from "./ProfileForm";
import { GroupList } from "./GroupList";
import { CreateGroupForm } from "./CreateGroupForm";
import { JoinGroupForm } from "./JoinGroupForm";
import type { Group, Profile } from "@/lib/types";

interface SallskapOverviewProps {
  profile: Profile | null;
  initialGroups: Group[];
  userEmail: string;
  /** Osedda händelser per sällskap — visas som badge i listan */
  unseenByGroup?: Record<string, number>;
}

/**
 * Innehållet på /sallskap — mobilens ingång till sällskapen (Profil-fliken i
 * BottomNav) och profilinställningar. Desktop når samma funktioner via
 * profilmenyn, men sidan fungerar på alla skärmstorlekar.
 */
export function SallskapOverview({ profile, initialGroups, userEmail, unseenByGroup }: SallskapOverviewProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const router = useRouter();

  function handleCreated(group: Group) {
    setGroups((prev) => [...prev, group]);
  }
  function handleJoined(group: Group) {
    setGroups((prev) => (prev.find((g) => g.id === group.id) ? prev : [...prev, group]));
  }
  function handleLeft(groupId: string) {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = profile?.display_name || userEmail.split("@")[0];

  return (
    <div className="px-4 py-5 space-y-7 max-w-2xl mx-auto">
      {/* Profil */}
      <header className="flex items-center gap-3">
        <span
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: "var(--tn-accent)", color: "#fff" }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: "var(--tn-text)" }}>
            {displayName}
          </h1>
          <p className="text-xs truncate" style={{ color: "var(--tn-text-faint)" }}>{userEmail}</p>
        </div>
      </header>

      {/* Sällskap */}
      <section>
        <h2 className="tn-eyebrow mb-2">Mina sällskap</h2>
        {groups.length === 0 && (
          <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--tn-text-dim)" }}>
            Sällskap är platsen där du och dina spelvänner delar anteckningar om hästarna,
            diskuterar omgången och jämför era system när resultaten rättats. Skapa ett
            sällskap nedan eller gå med i ett befintligt via en inbjudningskod.
          </p>
        )}
        <GroupList groups={groups} onLeft={handleLeft} unseenByGroup={unseenByGroup} />
      </section>

      <section>
        <h2 className="tn-eyebrow mb-2">Skapa nytt sällskap</h2>
        <CreateGroupForm onCreated={handleCreated} />
      </section>

      <section>
        <h2 className="tn-eyebrow mb-2">Gå med via inbjudningskod</h2>
        <JoinGroupForm onJoined={handleJoined} />
      </section>

      {/* Inställningar */}
      <section>
        <h2 className="tn-eyebrow mb-2">Visningsnamn</h2>
        <p className="text-xs mb-2" style={{ color: "var(--tn-text-faint)" }}>
          Syns för övriga medlemmar i dina sällskap.
        </p>
        <ProfileForm initialName={profile?.display_name ?? ""} />
      </section>

      <section className="pt-1 space-y-2">
        <Link
          href="/manual"
          className="block text-sm"
          style={{ color: "var(--tn-accent)" }}
        >
          Användarmanual
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm transition"
          style={{ color: "var(--tn-value-low)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Logga ut
        </button>
      </section>
    </div>
  );
}
