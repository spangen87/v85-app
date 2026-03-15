"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TabBar, type SallskapTab } from "@/components/sallskap/TabBar";
import { ForumTab } from "@/components/sallskap/forum/ForumTab";
import { NotesTab } from "@/components/sallskap/notes/NotesTab";
import { AdminTab } from "@/components/sallskap/admin/AdminTab";
import { ActivityTab } from "@/components/sallskap/activity/ActivityTab";
import type { ActivityItem, Group, GroupMember, GroupPost } from "@/lib/types";
import type { RaceWithNotes } from "@/lib/actions/notes";

type Game = { id: string; date: string; track: string | null };

interface SallskapPageClientProps {
  group: Group;
  members: GroupMember[];
  games: Game[];
  initialPosts: GroupPost[];
  initialNotes: RaceWithNotes[];
  initialActivity: ActivityItem[];
  defaultGameId: string | null;
  currentUserId: string;
  latestActivityAt: string | null;
}

export function SallskapPageClient({
  group,
  members,
  games,
  initialPosts,
  initialNotes,
  initialActivity,
  defaultGameId,
  currentUserId,
  latestActivityAt,
}: SallskapPageClientProps) {
  const [activeTab, setActiveTab] = useState<SallskapTab>("forum");
  const [hasNewActivity, setHasNewActivity] = useState(false);

  useEffect(() => {
    function check() {
      if (!latestActivityAt) return setHasNewActivity(false);
      const lastSeen = localStorage.getItem(`sallskap_seen_${group.id}`);
      setHasNewActivity(!lastSeen || lastSeen < latestActivityAt);
    }
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [group.id, latestActivityAt]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 bg-white dark:bg-gray-950">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition text-lg w-8 text-center shrink-0"
          aria-label="Tillbaka"
        >
          ←
        </Link>
        <h1 className="text-base font-bold flex-1 truncate">{group.name}</h1>
        <ThemeToggle />
      </header>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} onChange={setActiveTab} hasNewActivity={hasNewActivity} />

      {/* Tab content — alltid monterade för att bevara state vid fliktbyte */}
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
        <div className={activeTab === "aktivitet" ? undefined : "hidden"}>
          <ActivityTab items={initialActivity} groupId={group.id} />
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
