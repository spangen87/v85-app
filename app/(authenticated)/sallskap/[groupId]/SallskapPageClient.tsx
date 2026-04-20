"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TabBar, type SallskapTab } from "@/components/sallskap/TabBar";
import { ForumTab } from "@/components/sallskap/forum/ForumTab";
import { NotesTab } from "@/components/sallskap/notes/NotesTab";
import { AdminTab } from "@/components/sallskap/admin/AdminTab";
import type { Group, GroupMember, GroupPost, GameSystem } from "@/lib/types";
import type { RaceWithNotes } from "@/lib/actions/notes";
import { SpelTab } from "@/components/sallskap/spel/SpelTab";

type Game = { id: string; date: string; track: string | null; game_type?: string };

interface SallskapPageClientProps {
  group: Group;
  members: GroupMember[];
  games: Game[];
  initialPosts: GroupPost[];
  initialNotes: RaceWithNotes[];
  initialSystems: GameSystem[];
  defaultGameId: string | null;
  currentUserId: string;
}

export function SallskapPageClient({
  group,
  members,
  games,
  initialPosts,
  initialNotes,
  initialSystems,
  defaultGameId,
  currentUserId,
}: SallskapPageClientProps) {
  const [activeTab, setActiveTab] = useState<SallskapTab>("forum");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}>
      <header
        className="px-4 py-3 flex items-center gap-3 sticky top-0 z-30"
        style={{ background: "var(--tn-bg)", borderBottom: "1px solid var(--tn-border)" }}
      >
        <Link
          href="/"
          className="text-lg w-8 text-center shrink-0 transition"
          style={{ color: "var(--tn-text-faint)" }}
          aria-label="Tillbaka"
        >
          ←
        </Link>
        <h1 className="text-base font-bold flex-1 truncate">{group.name}</h1>
        <ThemeToggle />
      </header>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1">
        <div className={activeTab === "forum" ? undefined : "hidden"}>
          <ForumTab
            groupId={group.id}
            games={games}
            initialPosts={initialPosts}
            initialGameId={defaultGameId}
            currentUserId={currentUserId}
          />
        </div>
        <div className={activeTab === "anteckningar" ? undefined : "hidden"}>
          <NotesTab
            groupId={group.id}
            games={games}
            initialGameId={defaultGameId}
            initialNotes={initialNotes}
          />
        </div>
        <div className={activeTab === "spel" ? undefined : "hidden"}>
          <SpelTab
            groupId={group.id}
            games={games}
            initialGameId={defaultGameId}
            initialSystems={initialSystems}
            currentUserId={currentUserId}
          />
        </div>
        <div className={activeTab === "sallskap" ? undefined : "hidden"}>
          <AdminTab
            group={group}
            members={members}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
