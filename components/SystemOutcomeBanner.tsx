"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { GradedOutcome } from "@/lib/actions/outcome";

const DISMISS_KEY_PREFIX = "outcome-dismissed-";

/**
 * "Resultaten är klara"-banner på startsidan: visar hur användarens och
 * sällskapets system gick i den senaste rättade omgången. Avfärdas per
 * omgång (localStorage) och återkommer först vid nästa rättade omgång.
 */
export function SystemOutcomeBanner({ outcome }: { outcome: GradedOutcome | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!outcome) return;
    try {
      setVisible(localStorage.getItem(DISMISS_KEY_PREFIX + outcome.game.id) == null);
    } catch {
      setVisible(true);
    }
  }, [outcome]);

  if (!outcome || !visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + outcome!.game.id, "1");
    } catch {
      // localStorage otillgänglig — bannern döljs ändå för sessionen
    }
    setVisible(false);
  }

  const { game, systems, bestScore } = outcome;
  const shown = systems.slice(0, 5);

  return (
    <section
      className="mb-6 rounded-xl overflow-hidden"
      style={{
        border: "1px solid color-mix(in oklab, var(--tn-p1) 35%, var(--tn-border))",
        background: "linear-gradient(180deg, color-mix(in oklab, var(--tn-p1) 7%, var(--tn-bg-card)), var(--tn-bg-card) 70%)",
      }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span aria-hidden="true">🏆</span>
        <h2 className="tn-eyebrow flex-1">
          Resultaten är rättade — {game.game_type} {game.date}
          {game.track ? ` · ${game.track}` : ""}
        </h2>
        <button
          onClick={dismiss}
          className="text-sm leading-none"
          style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
          aria-label="Dölj resultatbannern"
        >
          ✕
        </button>
      </div>
      <ul>
        {shown.map((s) => (
          <li key={s.id}>
            <Link
              href={s.group_id ? `/sallskap/${s.group_id}` : "/system"}
              className="flex items-center gap-2 px-4 py-2 text-sm transition hover:underline"
              style={{ borderTop: "1px solid var(--tn-border)" }}
            >
              <span
                className="tn-mono text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
                style={
                  s.score === bestScore
                    ? { background: "var(--tn-p1)", color: "#0a0e14" }
                    : { background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }
                }
              >
                {s.score}/8
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ color: "var(--tn-text)" }}>
                {s.name}
                <span style={{ color: "var(--tn-text-dim)" }}>
                  {" — "}
                  {s.is_own ? "ditt system" : s.author_name}
                </span>
              </span>
              {s.group_name && (
                <span className="shrink-0 tn-mono text-[10px]" style={{ color: "var(--tn-text-faint)" }}>
                  {s.group_name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {systems.length > shown.length && (
        <p className="px-4 py-2 text-xs" style={{ color: "var(--tn-text-faint)", borderTop: "1px solid var(--tn-border)" }}>
          + {systems.length - shown.length} system till — se Spel-fliken i sällskapet.
        </p>
      )}
    </section>
  );
}
