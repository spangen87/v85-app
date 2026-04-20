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
        <h2 className="tn-eyebrow">Senaste aktivitet</h2>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="text-xs transition disabled:opacity-50"
          style={{ color: "var(--tn-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          {isPending ? "Uppdaterar..." : "Uppdatera"}
        </button>
      </div>
      <ActivityFeed items={items} />
    </div>
  );
}
