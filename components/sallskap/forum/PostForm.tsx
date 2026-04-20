"use client";

import { useState } from "react";
import { addPost } from "@/lib/actions/posts";
import type { GroupPost } from "@/lib/types";

interface PostFormProps {
  groupId: string;
  gameId: string;
  parentId?: string;
  onAdded: (post: GroupPost) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function PostForm({ groupId, gameId, parentId, onAdded, onCancel, compact = false }: PostFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = !!parentId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await addPost(groupId, gameId, content, parentId);
    setLoading(false);
    if (error) { setError(error); }
    else if (data) { setContent(""); onAdded(data); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "Skriv ett svar…" : "Dela din analys om omgången…"}
        rows={compact ? 2 : 3}
        className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
        style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
      />
      <div className="flex gap-2 justify-end">
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
          {loading ? "Skickar…" : isReply ? "Svara" : "Publicera"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </form>
  );
}
