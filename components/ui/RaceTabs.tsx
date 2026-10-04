"use client";

import { useEffect, useRef } from "react";
import { cx } from "./cx";

/** Avdelningsflikar. Siffran under = antal valda hästar, guldstreck = resultat klart. */
export function RaceTabs({ races, active, onSelect }: {
  races: { n: number; done?: boolean; picks?: number }[];
  active: number;
  onSelect: (n: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left) });
  }, [active]);
  return (
    <div ref={scroller} className="ta-tabs" role="tablist" aria-label="Avdelningar">
      {races.map((r) => (
        <button
          key={r.n}
          type="button"
          role="tab"
          aria-selected={r.n === active}
          aria-label={`Avdelning ${r.n}${r.done ? ", resultat klart" : ""}${r.picks ? `, ${r.picks} valda` : ""}`}
          className={cx("ta-tab", r.done && "ta-tab-done")}
          onClick={() => onSelect(r.n)}
        >
          <span className="ta-tab-n">{r.n}</span>
          <span className="ta-tab-picks">{r.picks ? r.picks : " "}</span>
        </button>
      ))}
    </div>
  );
}
