import type { NoteLabel } from "@/lib/types";

const LABEL_COLORS: Record<NoteLabel, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
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
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${LABEL_COLORS[label]}`}
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
      <span className="text-xs text-gray-500 dark:text-gray-400">Etikett:</span>
      {NOTE_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(value === label ? null : label)}
          className={`w-5 h-5 rounded-full transition-transform ${LABEL_COLORS[label]} ${
            value === label ? "ring-2 ring-white scale-125" : "opacity-60 hover:opacity-100"
          }`}
          title={LABEL_NAMES[label]}
        />
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
