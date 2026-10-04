"use client";

import { useState, type ReactNode } from "react";
import { GLOSSARY, isTermId, manualHref, type TermId } from "@/lib/glossary";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

/** Förklaringsbladets innehåll — texten kommer alltid från ordlistan. */
export function ExplainBody({ term }: { term: TermId }) {
  const g = GLOSSARY[term];
  return (
    <>
      <p className="ta-sheet-text">{g.what}</p>
      {g.how && (
        <>
          <h3 className="ta-sheet-sub">Så räknas det</h3>
          <p className="ta-sheet-text">{g.how}</p>
        </>
      )}
      {g.note && <p className="ta-sheet-note">{g.note}</p>}
      <p style={{ margin: "var(--space-4) 0 0" }}>
        <a className="ta-link" href={manualHref(term)}>Läs mer i manualen</a>
      </p>
    </>
  );
}

export function ExplainSheet({ term, open, onClose }: { term: TermId; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={GLOSSARY[term].title}
      footer={<><span /><Button onClick={onClose}>Stäng</Button></>}>
      <ExplainBody term={term} />
    </Sheet>
  );
}

/** Ett ord som går att trycka på för att få förklaringen från ordlistan. */
export function Term({ term, children }: { term: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!isTermId(term)) {
    if (process.env.NODE_ENV !== "production") console.warn(`Okänd term: ${term}`);
    return <>{children ?? term}</>;
  }
  return (
    <>
      <button
        type="button"
        className="ta-term"
        aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {children ?? GLOSSARY[term].title}
      </button>
      <ExplainSheet term={term} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
