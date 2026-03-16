"use client";

import { useState, useEffect, useMemo } from "react";

interface StartCountdownProps {
  startTime: string | null;
}

function getTimeLabel(startTime: string): { label: string; status: "upcoming" | "soon" | "started" } {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { label: "Pågår", status: "started" };
  }

  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  if (hours > 0) {
    return {
      label: `Startar om ${hours} tim ${minutes} min`,
      status: "upcoming",
    };
  }

  return {
    label: `Startar om ${minutes} min`,
    status: minutes <= 15 ? "soon" : "upcoming",
  };
}

export function StartCountdown({ startTime }: StartCountdownProps) {
  const initial = useMemo(() => startTime ? getTimeLabel(startTime) : null, [startTime]);
  const [timeInfo, setTimeInfo] = useState(initial);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setTimeInfo(getTimeLabel(startTime));
    }, 60000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime || !timeInfo) return null;

  const colorClass =
    timeInfo.status === "started"
      ? "text-green-600 dark:text-green-400"
      : timeInfo.status === "soon"
      ? "text-orange-500 dark:text-orange-400"
      : "text-gray-500 dark:text-gray-400";

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {timeInfo.label}
    </span>
  );
}
