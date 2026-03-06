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
    if (error) {
      setError(error);
    } else if (data) {
      setContent("");
      onAdded(data);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "Skriv ett svar…" : "Dela din analys om omgången…"}
        rows={compact ? 2 : 3}
        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
      />
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            Avbryt
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition"
        >
          {loading ? "Skickar…" : isReply ? "Svara" : "Publicera"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  );
}
