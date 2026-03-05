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
  parentGroupId?: string | null; // For replies, inherit group from parent
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
  // Default: inherit parent's group, or first group, or personal
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
    const { data, error } = await addNote(
      horseId,
      resolvedGroupId,
      content,
      label,
      parentId
    );
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
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
      />

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <NoteLabelPicker value={label} onChange={setLabel} />

          {/* Group selector — only for top-level notes */}
          {!isReply && (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value={PERSONAL}>Personlig</option>
            </select>
          )}

          {/* For replies: show inherited group name */}
          {isReply && (
            <span className="text-xs text-gray-500">
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
              className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
            >
              Avbryt
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            {loading ? "Sparar…" : isReply ? "Svara" : "Lägg till"}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  );
}
