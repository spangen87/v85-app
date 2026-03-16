"use client";

import { useState, useTransition } from "react";
import { ActivityFeed } from "./ActivityFeed";
import { getRecentGroupActivity } from "@/lib/actions/sallskap";
import type { ActivityItem } from "@/lib/types";

interface ActivityTabProps {
  groupId: string;
  initialActivity: ActivityItem[];
}

export function ActivityTab({ groupId, initialActivity }: ActivityTabProps) {
  const [items, setItems] = useState(initialActivity);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const data = await getRecentGroupActivity(groupId);
      setItems(data);
    });
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Senaste aktivitet</h2>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50 transition"
        >
          {isPending ? "Uppdaterar..." : "Uppdatera"}
        </button>
      </div>
      <ActivityFeed items={items} />
    </div>
  );
}
