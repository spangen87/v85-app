"use client";

import { useState, useCallback, useEffect } from "react";
import { getHorseNotes } from "@/lib/actions/notes";
import { NoteItem } from "./NoteItem";
import { NoteForm } from "./NoteForm";
import type { Group, HorseNote } from "@/lib/types";

interface HorseNotesProps {
  horseId: string;
  userGroups: Group[];
  currentUserId: string;
}

export function HorseNotes({ horseId, userGroups, currentUserId }: HorseNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<HorseNote[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getHorseNotes(horseId).then((data) => {
      setNotes(data);
      setLoaded(true);
    });
  }, [horseId]);

  const handleAdded = useCallback((note: HorseNote) => {
    setNotes((prev) => [...prev, { ...note, replies: [] }]);
  }, []);

  const handleDeleted = useCallback((noteId: string) => {
    setNotes((prev) =>
      prev
        .filter((n) => n.id !== noteId)
        .map((n) => ({ ...n, replies: n.replies.filter((r) => r.id !== noteId) }))
    );
  }, []);

  const handleReplied = useCallback((reply: HorseNote, parentId: string) => {
    setNotes((prev) =>
      prev.map((n) => n.id === parentId ? { ...n, replies: [...n.replies, reply] } : n)
    );
  }, []);

  const noteCount = notes.length + notes.reduce((sum, n) => sum + n.replies.length, 0);

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--tn-border)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs transition w-full text-left"
        style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span>
          Anteckningar
          {noteCount > 0 && (
            <span
              className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--tn-accent-faint)", color: "var(--tn-accent)" }}
            >
              {noteCount}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loaded && notes.length === 0 && (
            <p className="text-xs italic" style={{ color: "var(--tn-text-faint)" }}>
              Inga anteckningar ännu.
            </p>
          )}

          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              horseId={horseId}
              currentUserId={currentUserId}
              userGroups={userGroups}
              onDeleted={handleDeleted}
              onReplied={handleReplied}
            />
          ))}

          <div className="pt-1">
            <NoteForm horseId={horseId} userGroups={userGroups} onAdded={handleAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
