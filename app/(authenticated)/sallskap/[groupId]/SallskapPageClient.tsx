"use client";

import { useState } from "react";
import { GameSelect, PageHeader } from "@/components/ui";
import { TabBar, panelId, tabId, type SallskapTab } from "@/components/sallskap/TabBar";
import { ForumTab } from "@/components/sallskap/forum/ForumTab";
import { NotesTab } from "@/components/sallskap/notes/NotesTab";
import { AdminTab } from "@/components/sallskap/admin/AdminTab";
import { SpelTab } from "@/components/sallskap/spel/SpelTab";
import type { Group, GroupMember, GroupPost, GameSystem } from "@/lib/types";
import type { RaceWithNotes } from "@/lib/actions/notes";
import type { GroupLeague } from "@/lib/actions/systems";

type Game = { id: string; date: string; track: string | null; game_type?: string };

interface SallskapPageClientProps {
  group: Group;
  members: GroupMember[];
  games: Game[];
  initialPosts: GroupPost[];
  initialNotes: RaceWithNotes[];
  initialSystems: GameSystem[];
  league: GroupLeague;
  defaultGameId: string | null;
  currentUserId: string;
}

export function SallskapPageClient({
  group, members, games, initialPosts, initialNotes, initialSystems, league, defaultGameId, currentUserId,
}: SallskapPageClientProps) {
  const [activeTab, setActiveTab] = useState<SallskapTab>("forum");
  // Omgången är gemensam för Forum, Anteckningar och Spel
  const [gameId, setGameId] = useState<string | null>(defaultGameId);
  const isDefault = gameId === defaultGameId;
  const panel = (key: SallskapTab) => ({
    role: "tabpanel" as const, id: panelId(key), "aria-labelledby": tabId(key), hidden: activeTab !== key,
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PageHeader
        title={group.name}
        sub={`${members.length} ${members.length === 1 ? "medlem" : "medlemmar"}`}
        backHref="/sallskap"
        backLabel="Tillbaka till Sällskap"
      />

      <div className="ta-page" style={{ gap: "var(--space-4)" }}>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab !== "sallskap" && games.length > 0 && (
          <GameSelect games={games} value={gameId} onChange={setGameId} />
        )}
        {activeTab !== "sallskap" && games.length === 0 && (
          <p className="ta-text">Ingen omgång inladdad ännu. Hämta en omgång i loppvyn först.</p>
        )}

        <div {...panel("forum")}>
          {gameId && (
            <ForumTab key={gameId} groupId={group.id} gameId={gameId} initialPosts={isDefault ? initialPosts : null} currentUserId={currentUserId} />
          )}
        </div>
        <div {...panel("anteckningar")}>
          {gameId && <NotesTab key={gameId} groupId={group.id} gameId={gameId} initialNotes={isDefault ? initialNotes : null} />}
        </div>
        <div {...panel("spel")}>
          {gameId && (
            <SpelTab key={gameId} groupId={group.id} gameId={gameId} gameType={games.find((g) => g.id === gameId)?.game_type ?? ""}
              initialSystems={isDefault ? initialSystems : null} league={league} currentUserId={currentUserId} />
          )}
        </div>
        <div {...panel("sallskap")}>
          <AdminTab group={group} members={members} currentUserId={currentUserId} />
        </div>
      </div>
    </main>
  );
}
