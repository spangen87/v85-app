"use client";

import { useEffect, useState } from "react";

interface Props {
  startTime: string | null | undefined;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Pågår";
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `Startar om ${hours} tim ${minutes} min`;
  if (minutes > 0) return `Startar om ${minutes} min`;
  return "Startar snart";
}

export function StartCountdown({ startTime }: Props) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!startTime) return;

    function update() {
      const diff = new Date(startTime!).getTime() - Date.now();
      // Mer än 4h sedan start → troligen avgjort
      if (diff < -4 * 60 * 60 * 1000) {
        setText("Avgjort");
      } else {
        setText(formatCountdown(diff));
      }
    }

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!text) return null;

  const isFinished = text === "Avgjort";
  const isOngoing = text === "Pågår";

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        isFinished
          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          : isOngoing
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
      }`}
    >
      {text}
    </span>
  );
}
