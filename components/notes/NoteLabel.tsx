import type { NoteLabel } from "@/lib/types";

const LABEL_HEX: Record<NoteLabel, string> = {
  red: "#f87171",
  orange: "#fb923c",
  yellow: "#fbbf24",
  green: "#34d399",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

const LABEL_NAMES: Record<NoteLabel, string> = {
  red: "Röd",
  orange: "Orange",
  yellow: "Gul",
  green: "Grön",
  blue: "Blå",
  purple: "Lila",
};

export const NOTE_LABELS: NoteLabel[] = ["red", "orange", "yellow", "green", "blue", "purple"];

export function NoteLabelDot({ label }: { label: NoteLabel | null }) {
  if (!label) return null;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ background: LABEL_HEX[label] }}
      title={LABEL_NAMES[label]}
    />
  );
}

export function NoteLabelPicker({
  value,
  onChange,
}: {
  value: NoteLabel | null;
  onChange: (label: NoteLabel | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Etikett:</span>
      {NOTE_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(value === label ? null : label)}
          className="w-5 h-5 rounded-full transition-transform"
          style={{
            background: LABEL_HEX[label],
            opacity: value === label ? 1 : 0.5,
            transform: value === label ? "scale(1.25)" : "scale(1)",
            outline: value === label ? "2px solid var(--tn-text)" : "none",
            outlineOffset: 1,
          }}
          title={LABEL_NAMES[label]}
        />
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs ml-1"
          style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
