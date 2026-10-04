"use client";

import { ThemeChoiceControl } from "@/components/ThemeToggle";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";
import { CreateGroupForm } from "./CreateGroupForm";
import { JoinGroupForm } from "./JoinGroupForm";
import { NotificationToggle } from "@/components/NotificationToggle";
import type { Group, Profile } from "@/lib/types";

interface SallskapOverviewProps {
  profile: Profile | null;
  initialGroups: Group[];
  userEmail: string;
  /** Osedda händelser per sällskap — visas som märke i listan */
  unseenByGroup?: Record<string, number>;
}

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{ flex: "none", color: "var(--ink-muted)" }}><path d="m9 6 6 6-6 6" /></svg>
);

/**
 * Innehållet på /sallskap: dina sällskap, skapa eller gå med, och inställningar.
 * Inbjudan och "Lämna" finns inne i varje sällskap under fliken Sällskapet.
 */
export function SallskapOverview({ profile, initialGroups, userEmail, unseenByGroup = {} }: SallskapOverviewProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const router = useRouter();

  function handleCreated(group: Group) {
    setGroups((prev) => [...prev, group]);
  }
  function handleJoined(group: Group) {
    setGroups((prev) => (prev.find((g) => g.id === group.id) ? prev : [...prev, group]));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = profile?.display_name || userEmail.split("@")[0];

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <header className="ta-page-head sticky top-0 z-30 md:static">
        <span className="ta-avatar" style={{ width: 44, height: 44, fontSize: 15 }} aria-hidden="true">
          {displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="ta-page-title">{displayName}</h1>
          <p className="ta-page-sub truncate">{userEmail}</p>
        </div>
      </header>

      <div className="ta-page">
        <section className="ta-section">
          <h2 className="ta-section-title">Mina sällskap</h2>
          {groups.length === 0 ? (
            <p className="ta-text">
              I ett sällskap delar du anteckningar om hästarna med dina spelvänner, diskuterar omgången och jämför
              era system när resultaten är rättade. Skapa ett eller gå med via en inbjudningskod.
            </p>
          ) : (
            <nav aria-label="Mina sällskap" className="ta-card" style={{ overflow: "hidden" }}>
              {groups.map((g) => {
                const unseen = unseenByGroup[g.id] ?? 0;
                return (
                  <Link key={g.id} href={`/sallskap/${g.id}`} className="ta-linkrow">
                    <span className="flex-1 min-w-0 truncate" style={{ font: "500 15px/20px var(--font-sans)" }}>{g.name}</span>
                    {unseen > 0 && <Badge tone="accent">{`${unseen > 9 ? "9+" : unseen} nya`}</Badge>}
                    <Chevron />
                  </Link>
                );
              })}
            </nav>
          )}
        </section>

        <section className="ta-section">
          <h2 className="ta-section-title">Skapa eller gå med</h2>
          <div className="ta-card ta-card-pad flex flex-col gap-4">
            <CreateGroupForm onCreated={handleCreated} />
            <JoinGroupForm onJoined={handleJoined} />
          </div>
        </section>

        <section className="ta-section">
          <h2 className="ta-section-title">Inställningar</h2>
          <div className="ta-card ta-card-pad flex flex-col gap-5">
            <ProfileForm initialName={profile?.display_name ?? ""} />
            <div className="ta-stack" style={{ gap: 6 }}>
              <span className="ta-field-label">Utseende</span>
              <div><ThemeChoiceControl /></div>
              <p className="ta-text-sm">Som enheten följer telefonens eller datorns inställning.</p>
            </div>
            <NotificationToggle />
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <Link href="/manual" className="ta-link" style={{ fontSize: 15 }}>Manual</Link>
          <Button variant="quiet" onClick={handleSignOut}>Logga ut</Button>
        </div>
      </div>
    </main>
  );
}
