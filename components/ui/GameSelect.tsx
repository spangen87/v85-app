"use client";

import { useId } from "react";
import { fmtGameLabel } from "@/lib/format";

export interface GameOption { id: string; date: string; track: string | null; game_type?: string | null }

/** Väljer omgång: "V85 · Solvalla · lör 10 okt". */
export function GameSelect({ games, value, onChange, label = "Omgång", disabled = false }: {
  games: GameOption[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="ta-stack" style={{ gap: 6 }}>
      <label className="ta-field-label" htmlFor={id}>{label}</label>
      <select id={id} className="ta-field" style={{ height: 44 }} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {games.map((g) => <option key={g.id} value={g.id}>{fmtGameLabel(g)}</option>)}
      </select>
    </div>
  );
}
