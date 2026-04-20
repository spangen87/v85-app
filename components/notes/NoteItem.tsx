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
    <div
      className={isReply ? "ml-4 pl-3" : ""}
      style={isReply ? { borderLeft: "2px solid var(--tn-border)" } : {}}
    >
      <div
        className="rounded-lg p-3 space-y-1.5"
        style={{ background: "var(--tn-bg-chip)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <NoteLabelDot label={note.label} />
          <span className="text-xs font-medium" style={{ color: "var(--tn-text)" }}>
            {note.author_display_name}
          </span>
          <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>·</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: "var(--tn-bg-card)", color: "var(--tn-text-dim)" }}
          >
            {note.group_name ?? "Personlig"}
          </span>
          <span className="text-xs ml-auto" style={{ color: "var(--tn-text-faint)" }}>
            {relativeTime(note.created_at)}
          </span>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tn-text)" }}>
          {note.content}
        </p>

        <div className="flex items-center gap-3 pt-0.5">
          {!isReply && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="text-xs transition"
              style={{ color: "var(--tn-accent)", background: "none", border: "none", cursor: "pointer" }}
            >
              {showReplyForm ? "Avbryt" : "Svara"}
            </button>
          )}
          {note.author_id === currentUserId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs transition disabled:opacity-50"
              style={{ color: "var(--tn-value-low)", background: "none", border: "none", cursor: "pointer" }}
            >
              {deleting ? "Tar bort…" : "Ta bort"}
            </button>
          )}
        </div>
      </div>

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
