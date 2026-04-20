"use client";

import { useState } from "react";
import { upsertTrackConfig } from "@/lib/actions/tracks";
import type { TrackConfig } from "@/lib/types";

type SaveStatus = "idle" | "loading" | "success";

export function TrackConfigRow({ initialConfig }: { initialConfig: TrackConfig }) {
  const [openStretch, setOpenStretch] = useState(initialConfig.open_stretch);
  const [lanesInput, setLanesInput] = useState(
    initialConfig.open_stretch_lanes.join(", ")
  );
  const [threshold, setThreshold] = useState(initialConfig.short_race_threshold);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lanesError, setLanesError] = useState<string | null>(null);

  async function handleSave() {
    setSaveError(null);
    setLanesError(null);

    const parsedLanes: number[] = [];
    if (openStretch) {
      const tokens = lanesInput.split(",").map((s) => s.trim()).filter(Boolean);
      for (const token of tokens) {
        const n = parseInt(token, 10);
        if (isNaN(n) || n < 1 || n > 20 || String(n) !== token) {
          setLanesError("Ogiltiga spår: ange heltal 1–20, kommaseparerade");
          return;
        }
        parsedLanes.push(n);
      }
    }

    setStatus("loading");
    const result = await upsertTrackConfig({
      track_name: initialConfig.track_name,
      open_stretch: openStretch,
      open_stretch_lanes: parsedLanes,
      short_race_threshold: threshold,
      active: initialConfig.active,
    });

    if (result.error) {
      setStatus("idle");
      setSaveError(result.error ?? "Kunde inte spara. Försök igen.");
    } else {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  const inputStyle = {
    background: "var(--tn-bg-chip)",
    border: "1px solid var(--tn-border)",
    color: "var(--tn-text)",
    borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <section
      className="space-y-3 pb-6 last:border-0"
      style={{ borderBottom: "1px solid var(--tn-border)" }}
    >
      <h2 className="tn-eyebrow" style={{ color: "var(--tn-text-dim)" }}>
        {initialConfig.track_name}
      </h2>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={openStretch}
              onClick={() => setOpenStretch((v) => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
              style={{
                background: openStretch ? "var(--tn-accent)" : "var(--tn-bg-chip)",
                border: "1px solid var(--tn-border)",
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                style={{ transform: openStretch ? "translateX(1rem)" : "translateX(0.125rem)" }}
              />
            </button>
            <span className="text-sm" style={{ color: "var(--tn-text)" }}>Open stretch</span>
          </label>
        </div>
        <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
          Hästar på gynnade spår får +0.12 CS. Aktiverar spårinställningen nedan.
        </p>
      </div>

      <div className={`space-y-1 ${openStretch ? "" : "opacity-50 pointer-events-none"}`}>
        <label className="block text-xs font-medium" style={{ color: "var(--tn-text-dim)" }}>
          Gynnade spår
        </label>
        <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
          Ange spårnummer 1–20, kommaseparerade. Gäller bara när Open stretch är på.
        </p>
        <input
          type="text"
          value={lanesInput}
          onChange={(e) => setLanesInput(e.target.value)}
          disabled={!openStretch || isLoading}
          placeholder="t.ex. 7,8,9,10"
          className="w-full disabled:cursor-not-allowed"
          style={inputStyle}
        />
        {lanesError && (
          <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{lanesError}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium" style={{ color: "var(--tn-text-dim)" }}>
          Distansgräns
        </label>
        <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
          Lopp kortare än detta värde sänker CS med 0.08. Sätt 0 för att inaktivera.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={9999}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            disabled={isLoading}
            placeholder="0 = inaktiv"
            className="w-28 disabled:cursor-not-allowed"
            style={inputStyle}
          />
          <span className="text-sm" style={{ color: "var(--tn-text-faint)" }}>m</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="text-sm font-medium px-3 py-1.5 rounded transition disabled:cursor-not-allowed"
          style={
            isSuccess
              ? { background: "var(--tn-value-high)", color: "#0a0e14" }
              : { background: "var(--tn-accent)", color: "#fff" }
          }
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sparar…
            </span>
          ) : isSuccess ? (
            "Sparad"
          ) : (
            "Spara"
          )}
        </button>
      </div>
      {saveError && (
        <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{saveError}</p>
      )}
    </section>
  );
}
