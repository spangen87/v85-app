"use client";

import { useEffect } from "react";
import { ActivityFeed } from "./ActivityFeed";
import type { ActivityItem } from "@/lib/types";

interface Props {
  items: ActivityItem[];
  groupId: string;
}

export function ActivityTab({ items, groupId }: Props) {
  // Markera aktiviteten som sedd när fliken öppnas
  useEffect(() => {
    localStorage.setItem(`sallskap_seen_${groupId}`, new Date().toISOString());
    // Notifiera BottomNav om uppdatering
    window.dispatchEvent(new StorageEvent("storage", { key: `sallskap_seen_${groupId}` }));
  }, [groupId]);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Senaste aktivitet
      </h2>
      <ActivityFeed items={items} />
    </div>
  );
}
