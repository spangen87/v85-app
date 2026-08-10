"use client";

import { useEffect, useRef } from "react";
import { useRaceTab } from "@/components/RaceTabContext";

interface RaceTabBarProps {
  races: { race_number: number; start_time: string | null }[];
}

export function RaceTabBar({ races }: RaceTabBarProps) {
  const { activeRaceNumber, setActiveRaceNumber } = useRaceTab();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const hasScrolledOnce = useRef(false);

  // Med åtta avdelningar ryms inte alla flikar på en mobilskärm. Utan detta
  // kan den aktiva avdelningen ligga utanför synfältet — särskilt när den
  // byts utifrån (Top 5-listan, ?avd= i länken) och inte via ett klick här.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = tabRefs.current[activeRaceNumber];
    if (!scroller || !tab) return;

    // Centrera fliken i den vågräta listan — vi räknar själva i stället för
    // scrollIntoView() eftersom den även kan rulla hela sidan
    const target = tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2;
    const left = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    scroller.scrollTo({
      left,
      behavior: hasScrolledOnce.current && !prefersReducedMotion ? "smooth" : "auto",
    });
    hasScrolledOnce.current = true;
  }, [activeRaceNumber, races.length]);

  return (
    <div
      ref={scrollerRef}
      className="overflow-x-auto scrollbar-none"
      style={{ borderTop: "1px solid var(--tn-border)" }}
      role="tablist"
      aria-label="Avdelningar"
    >
      <div className="flex px-3 gap-1 py-2 min-w-max">
        {races.map((race) => {
          const isActive = race.race_number === activeRaceNumber;
          const timeStr = race.start_time
            ? new Date(race.start_time).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Stockholm",
              })
            : null;
          return (
            <button
              key={race.race_number}
              ref={(el) => { tabRefs.current[race.race_number] = el; }}
              onClick={() => setActiveRaceNumber(race.race_number)}
              role="tab"
              aria-selected={isActive}
              className="px-3 py-2 rounded-lg whitespace-nowrap transition-colors tn-mono text-xs"
              style={{
                background: isActive ? "var(--tn-accent-faint)" : "transparent",
                color: isActive ? "var(--tn-accent)" : "var(--tn-text-faint)",
                border: isActive ? "1px solid transparent" : "1px solid transparent",
                fontWeight: isActive ? "600" : "400",
              }}
            >
              AVD {race.race_number}
              {timeStr && (
                <span
                  className="ml-1.5"
                  style={{ opacity: 0.65, fontWeight: 400 }}
                >
                  {timeStr}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
