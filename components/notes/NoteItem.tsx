"use client";

import { useState } from "react";
import { deleteNote } from "@/lib/actions/notes";
import { NoteLabelDot } from "./NoteLabel";
import { NoteForm } from "./NoteForm";
import type { Group, HorseNote } from "@/lib/types";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dag${days > 1 ? "ar" : ""} sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

interface NoteItemProps {
  note: HorseNote;
  horseId: string;
  currentUserId: string;
  userGroups: Group[];
  onDeleted: (noteId: string) => void;
  onReplied: (reply: HorseNote, parentId: string) => void;
  isReply?: boolean;
}

export function NoteItem({
  note,
  horseId,
  currentUserId,
  userGroups,
  onDeleted,
  onReplied,
  isReply = false,
}: NoteItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteNote(note.id);
    onDeleted(note.id);
  }

  function handleReplied(reply: HorseNote) {
    setShowReplyForm(false);
    onReplied(reply, note.id);
  }

  return (
    <div className={`${isReply ? "ml-4 pl-3 border-l-2 border-gray-300 dark:border-gray-700" : ""}`}>
      <div className="bg-gray-100 dark:bg-[rgb(40,44,52)] rounded-lg p-3 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <NoteLabelDot label={note.label} />
          <span className="text-gray-900 dark:text-white text-xs font-medium">{note.author_display_name}</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">·</span>
          <span className="text-gray-600 bg-gray-200 dark:text-gray-400 dark:bg-gray-700 text-xs px-1.5 py-0.5 rounded">
            {note.group_name ?? "Personlig"}
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">{relativeTime(note.created_at)}</span>
        </div>

        {/* Content */}
        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-0.5">
          {!isReply && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 transition"
            >
              {showReplyForm ? "Avbryt" : "Svara"}
            </button>
          )}
          {note.author_id === currentUserId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition"
            >
              {deleting ? "Tar bort…" : "Ta bort"}
            </button>
          )}
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && !isReply && (
        <div className="mt-2 ml-4">
          <NoteForm
            horseId={horseId}
            userGroups={userGroups}
            parentId={note.id}
            parentGroupId={note.group_id}
            onAdded={handleReplied}
            onCancel={() => setShowReplyForm(false)}
            compact
          />
        </div>
      )}

      {/* Replies */}
      {note.replies && note.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {note.replies.map((reply) => (
            <NoteItem
              key={reply.id}
              note={reply}
              horseId={horseId}
              currentUserId={currentUserId}
              userGroups={userGroups}
              onDeleted={onDeleted}
              onReplied={onReplied}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
