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

    // Validate open_stretch_lanes when toggle is ON
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

  return (
    <section className="space-y-3 border-b border-gray-200 dark:border-gray-800 pb-6 last:border-0">
      {/* Track name header */}
      <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {initialConfig.track_name}
      </h2>

      {/* Open stretch toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={openStretch}
            onClick={() => setOpenStretch((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
              openStretch
                ? "bg-indigo-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                openStretch ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Open stretch</span>
        </label>
      </div>

      {/* Gynnade spår (open_stretch_lanes) — visible only when open_stretch is on */}
      <div className={`space-y-1 ${openStretch ? "" : "opacity-50 pointer-events-none"}`}>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          Gynnade spår
        </label>
        <input
          type="text"
          value={lanesInput}
          onChange={(e) => setLanesInput(e.target.value)}
          disabled={!openStretch || isLoading}
          placeholder="t.ex. 7,8,9,10"
          className="w-full text-sm px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 disabled:cursor-not-allowed"
        />
        {lanesError && (
          <p className="text-xs text-red-500 dark:text-red-400">{lanesError}</p>
        )}
      </div>

      {/* Distansgräns (short_race_threshold) */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
          Distansgräns
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={9999}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            disabled={isLoading}
            placeholder="0 = inaktiv"
            className="w-28 text-sm px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">m</span>
        </div>
      </div>

      {/* Save button + feedback */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className={`text-sm font-medium px-3 py-1.5 rounded transition disabled:cursor-not-allowed ${
            isSuccess
              ? "bg-green-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
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
        <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>
      )}
    </section>
  );
}
