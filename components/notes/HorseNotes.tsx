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

  // Hämta anteckningar automatiskt när komponenten mountas (avdelningen öppnas)
  useEffect(() => {
    getHorseNotes(horseId).then((data) => {
      setNotes(data);
      setLoaded(true);
    });
  }, [horseId]);

  function handleExpand() {
    setExpanded((v) => !v);
  }

  const handleAdded = useCallback((note: HorseNote) => {
    setNotes((prev) => [...prev, { ...note, replies: [] }]);
  }, []);

  const handleDeleted = useCallback((noteId: string) => {
    setNotes((prev) =>
      prev
        .filter((n) => n.id !== noteId)
        .map((n) => ({
          ...n,
          replies: n.replies.filter((r) => r.id !== noteId),
        }))
    );
  }, []);

  const handleReplied = useCallback((reply: HorseNote, parentId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === parentId
          ? { ...n, replies: [...n.replies, reply] }
          : n
      )
    );
  }, []);

  const noteCount = notes.length + notes.reduce((sum, n) => sum + n.replies.length, 0);

  return (
    <div className="border-t border-gray-700 mt-3 pt-3">
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition w-full text-left"
      >
        <span>{expanded ? "▲" : "▼"}</span>
        <span>
          Anteckningar
          {noteCount > 0 && (
            <span className="ml-1.5 bg-indigo-700 text-white text-xs px-1.5 py-0.5 rounded-full">
              {noteCount}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loaded && notes.length === 0 && (
            <p className="text-gray-500 text-xs italic">
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

          {/* New note form */}
          <div className="pt-1">
            <NoteForm
              horseId={horseId}
              userGroups={userGroups}
              onAdded={handleAdded}
            />
          </div>
        </div>
      )}
    </div>
  );
}
