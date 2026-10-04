import type { MouseEvent } from "react";

export type NumberState = "idle" | "selected" | "p1" | "p2" | "p3" | "finished";

/** Startnumret som block. Med onClick är det knappen som lägger hästen i systemet. */
export function StartNumber({ number, state = "idle", onClick, label }: {
  number: number;
  state?: NumberState;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  label?: string;
}) {
  const cls = `ta-num ta-num-${state}`;
  if (onClick) {
    const aria = label ?? (state === "selected" ? `Ta bort nr ${number} från systemet` : `Lägg nr ${number} i systemet`);
    return (
      <button type="button" className={cls} onClick={onClick} aria-pressed={state === "selected"} aria-label={aria}>
        {number}
      </button>
    );
  }
  return <span className={cls} aria-label={label}>{number}</span>;
}
