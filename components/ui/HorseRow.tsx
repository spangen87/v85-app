"use client";

import type { ReactNode } from "react";
import { fmtNum, fmtPct } from "@/lib/format";
import type { RowBadge } from "@/lib/raceView";
import { Badge } from "./Badge";
import { FormStrip } from "./FormStrip";
import { StartNumber, type NumberState } from "./StartNumber";
import { Term } from "./Term";
import { ValueDelta } from "./ValueDelta";
import { cx } from "./cx";

export function HorseList({ children, sortLabel = "Chans" }: { children: ReactNode; sortLabel?: string }) {
  return (
    <div className="ta-list">
      <div className="ta-list-head">
        <span>Häst</span>
        <span>
          <Term term="chans">{sortLabel === "Chans" ? "Chans" : `Chans (sorterat på ${sortLabel.toLowerCase()})`}</Term>
          {" · "}<Term term="streck">Streck</Term>{" · "}<Term term="odds">Odds</Term>
        </span>
      </div>
      {children}
    </div>
  );
}

export function HorseRow({
  number, name, driver, chans, streck, odds, form, badge = null, signalScore = 0, valueDelta = null, isValue = false,
  state = "idle", onToggleSystem, onOpen, noteCount = 0, dimmed = false, race,
}: {
  number: number; name: string; driver: string;
  chans: number | null; streck: number | null; odds: number | null; form: string[];
  badge?: RowBadge; signalScore?: number; valueDelta?: number | null; isValue?: boolean;
  state?: NumberState; onToggleSystem?: () => void; onOpen?: () => void; noteCount?: number; dimmed?: boolean;
  /** Avdelningen — visas när listan blandar avdelningar (fliken Alla) */
  race?: number;
}) {
  const content = (
    <>
      <span className="ta-row-main">
        <span className="ta-row-name">{name}</span>
        <span className="ta-row-driver">{race != null ? `Avd ${race} · ${driver}` : driver}</span>
        <span className="ta-row-meta">
          <FormStrip results={form} />
          {badge === "skrall" && <Badge tone="skrall">Skräll</Badge>}
          {badge === "signal" && <Badge tone="signal">{`Signal +${signalScore}`}</Badge>}
          {badge === "scratched" && <Badge>Struken</Badge>}
          {noteCount > 0 && <span className="ta-row-notes">{noteCount} ant.</span>}
        </span>
      </span>
      <span className="ta-row-side">
        <span className="ta-row-chans">
          {isValue && valueDelta != null && <ValueDelta delta={valueDelta} highlight />}
          <span className="ta-row-chans-val">{fmtPct(chans)}</span>
        </span>
        <span className="ta-row-sub">
          {streck != null && <span>Streck {fmtPct(streck)}</span>}
          {odds != null && <span>Odds {fmtNum(odds)}</span>}
        </span>
      </span>
    </>
  );
  // Startnumret och "öppna" är två syskonknappar — aldrig en knapp i en knapp
  return (
    <div className={cx("ta-row", dimmed && "ta-row-scratched")} data-start={number}>
      <StartNumber
        number={number}
        state={state}
        onClick={onToggleSystem ? () => onToggleSystem() : undefined}
        label={race != null && onToggleSystem
          ? (state === "selected" ? `Ta bort avd ${race} nr ${number} från systemet` : `Lägg avd ${race} nr ${number} i systemet`)
          : undefined}
      />
      {onOpen ? (
        <button type="button" className="ta-row-open" onClick={onOpen}>{content}</button>
      ) : (
        <span className="ta-row-open">{content}</span>
      )}
    </div>
  );
}
