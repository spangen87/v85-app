"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { cx } from "./cx";

/**
 * Avdelningsflikar. Siffran under = antal valda hästar, guldstreck = resultat klart.
 * Tab når bara aktiv flik; pilar, Home och End byter avdelning.
 */
export function RaceTabs({ races, active, onSelect, panelId }: {
  races: { n: number; done?: boolean; picks?: number }[];
  active: number;
  onSelect: (n: number) => void;
  /** id på panelen som flikarna styr */
  panelId?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollLeft = Math.max(0, left);
  }, [active]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = races.findIndex((r) => r.n === active);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? races.length - 1 : null;
    if (next == null || races.length === 0) return;
    e.preventDefault();
    const target = races[(next + races.length) % races.length];
    onSelect(target.n);
    scroller.current?.querySelector<HTMLElement>(`[data-n="${target.n}"]`)?.focus();
  };
  return (
    <div ref={scroller} className="ta-tabs" role="tablist" aria-label="Avdelningar" onKeyDown={onKey}>
      {races.map((r) => (
        <button
          key={r.n}
          type="button"
          role="tab"
          id={panelId ? `${panelId}-tab-${r.n}` : undefined}
          data-n={r.n}
          aria-selected={r.n === active}
          aria-controls={panelId}
          tabIndex={r.n === active ? 0 : -1}
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
