"use client";

import { useId, useState } from "react";
import { addPost } from "@/lib/actions/posts";
import { Button } from "@/components/ui";
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
  const id = useId();
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
    <form onSubmit={handleSubmit} className="ta-stack">
      <label htmlFor={id} className={isReply ? "sr-only" : "ta-field-label"}>
        {isReply ? "Ditt svar" : "Dela din analys om omgången"}
      </label>
      <textarea
        id={id}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "Skriv ett svar …" : "Spikar, skrällbud, spårtips …"}
        rows={compact ? 2 : 3}
        className="ta-field"
        style={{ resize: "vertical", padding: "10px 12px" }}
      />
      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && <Button size="sm" variant="quiet" onClick={onCancel}>Avbryt</Button>}
        <Button size="sm" type="submit" variant={isReply ? "secondary" : "primary"} disabled={loading || !content.trim()}>
          {loading ? "Skickar …" : isReply ? "Svara" : "Publicera"}
        </Button>
      </div>
    </form>
  );
}
