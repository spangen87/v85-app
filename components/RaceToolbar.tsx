"use client";

import { useState } from "react";
import { Button, SegmentedControl, Sheet } from "@/components/ui";
import { activeFilterCount, EMPTY_FILTERS, SORT_KEYS, SORT_LABELS, type Filters, type SortKey } from "@/lib/raceView";

export type RaceView = "lista" | "tabell";

const CHECKS: { key: Exclude<keyof Filters, "search">; label: string }[] = [
  { key: "value", label: "Bara värde" },
  { key: "skrall", label: "Bara skräll" },
  { key: "skrallbud", label: "Bara omgångens skrällbud" },
  { key: "signal", label: "Bara signal" },
  { key: "hideLongshots", label: "Dölj långskott (odds över 50)" },
];

export function RaceToolbar({ view, onView, sort, onSort, filters, onFilters }: {
  view: RaceView; onView: (v: RaceView) => void;
  sort: SortKey; onSort: (k: SortKey) => void;
  filters: Filters; onFilters: (f: Filters) => void;
}) {
  const [sheet, setSheet] = useState<"sort" | "filter" | null>(null);
  const count = activeFilterCount(filters);
  const close = () => setSheet(null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SegmentedControl label="Visning" value={view} onChange={onView}
        options={[{ value: "lista", label: "Lista" }, { value: "tabell", label: "Tabell" }]} />
      <button type="button" className="ta-chip" onClick={() => setSheet("sort")}>{`Sortera: ${SORT_LABELS[sort]}`}</button>
      <button type="button" className="ta-chip" aria-pressed={count > 0} onClick={() => setSheet("filter")}>
        {count > 0 ? `Filter (${count})` : "Filter"}
      </button>

      <Sheet open={sheet === "sort"} onClose={close} title="Sortera">
        <div role="radiogroup" aria-label="Sortera" className="flex flex-col">
          {SORT_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid var(--line)", font: "400 15px/22px var(--font-sans)" }}>
              <input type="radio" name="sort" checked={k === sort} onChange={() => { onSort(k); close(); }} />
              {SORT_LABELS[k]}
            </label>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "filter"} onClose={close} title="Filter"
        footer={<>
          <Button onClick={() => onFilters(EMPTY_FILTERS)}>Rensa filter</Button>
          <Button variant="primary" onClick={close}>Visa hästar</Button>
        </>}>
        <div className="flex flex-col">
          {CHECKS.map((c) => (
            <label key={c.key} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid var(--line)", font: "400 15px/22px var(--font-sans)" }}>
              <input type="checkbox" checked={filters[c.key]} onChange={(e) => onFilters({ ...filters, [c.key]: e.target.checked })} />
              {c.label}
            </label>
          ))}
          <label htmlFor="race-search" className="ta-field-label" style={{ marginTop: "var(--space-3)" }}>Sök häst, kusk eller tränare</label>
          <input id="race-search" className="ta-field" type="search" value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })} />
        </div>
      </Sheet>
    </div>
  );
}
