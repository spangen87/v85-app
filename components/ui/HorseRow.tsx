"use client";

import type { KeyboardEvent, ReactNode } from "react";
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
  state = "idle", onToggleSystem, onOpen, noteCount = 0, dimmed = false,
}: {
  number: number; name: string; driver: string;
  chans: number | null; streck: number | null; odds: number | null; form: string[];
  badge?: RowBadge; signalScore?: number; valueDelta?: number | null; isValue?: boolean;
  state?: NumberState; onToggleSystem?: () => void; onOpen?: () => void; noteCount?: number; dimmed?: boolean;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
  };
  return (
    <div
      className={cx("ta-row", dimmed && "ta-row-scratched")}
      onClick={onOpen}
      onKeyDown={onKey}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Öppna ${name}` : undefined}
      data-start={number}
    >
      <StartNumber
        number={number}
        state={state}
        onClick={onToggleSystem ? (e) => { e.stopPropagation(); onToggleSystem(); } : undefined}
      />
      <div className="ta-row-main">
        <div className="ta-row-name">{name}</div>
        <div className="ta-row-driver">{driver}</div>
        <div className="ta-row-meta">
          <FormStrip results={form} />
          {badge === "skrall" && <Badge tone="skrall">Skräll</Badge>}
          {badge === "signal" && <Badge tone="signal">{`Signal +${signalScore}`}</Badge>}
          {badge === "scratched" && <Badge>Struken</Badge>}
          {noteCount > 0 && <span className="ta-row-notes">{noteCount} ant.</span>}
        </div>
      </div>
      <div className="ta-row-side">
        <div className="ta-row-chans">
          {isValue && valueDelta != null && <ValueDelta delta={valueDelta} highlight />}
          <span className="ta-row-chans-val">{fmtPct(chans)}</span>
        </div>
        <div className="ta-row-sub">
          {streck != null && <span>Streck {fmtPct(streck)}</span>}
          {odds != null && <span>Odds {fmtNum(odds)}</span>}
        </div>
      </div>
    </div>
  );
}
