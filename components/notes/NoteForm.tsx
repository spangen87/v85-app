"use client";

import { useState } from "react";
import { addNote } from "@/lib/actions/notes";
import { NoteLabelPicker } from "./NoteLabel";
import type { Group, HorseNote, NoteLabel } from "@/lib/types";

const PERSONAL = "__personal__";

interface NoteFormProps {
  horseId: string;
  userGroups: Group[];
  parentId?: string;
  parentGroupId?: string | null;
  onAdded: (note: HorseNote) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function NoteForm({
  horseId,
  userGroups,
  parentId,
  parentGroupId,
  onAdded,
  onCancel,
  compact = false,
}: NoteFormProps) {
  const [content, setContent] = useState("");
  const [label, setLabel] = useState<NoteLabel | null>(null);
  const defaultGroupId = parentGroupId ?? userGroups[0]?.id ?? PERSONAL;
  const [groupId, setGroupId] = useState<string>(defaultGroupId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = !!parentId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const resolvedGroupId = groupId === PERSONAL ? null : groupId;
    const { data, error } = await addNote(horseId, resolvedGroupId, content, label, parentId);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (data) {
      setContent("");
      setLabel(null);
      onAdded(data);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "Skriv ett svar…" : "Lägg till en anteckning…"}
        rows={compact ? 2 : 3}
        className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
        style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
      />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <NoteLabelPicker value={label} onChange={setLabel} />

          {!isReply && (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="text-xs rounded-lg px-2 py-1 outline-none"
              style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
            >
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              <option value={PERSONAL}>Personlig</option>
            </select>
          )}

          {isReply && (
            <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
              {parentGroupId
                ? userGroups.find((g) => g.id === parentGroupId)?.name ?? ""
                : "Personlig"}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs px-3 py-1.5 rounded-lg transition"
              style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
            >
              Avbryt
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {loading ? "Sparar…" : isReply ? "Svara" : "Lägg till"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </form>
  );
}
