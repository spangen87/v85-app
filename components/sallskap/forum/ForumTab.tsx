"use client";

import { useState, useCallback, useEffect } from "react";
import { getGroupPosts } from "@/lib/actions/posts";
import { PostList } from "./PostList";
import { PostForm } from "./PostForm";
import type { GroupPost } from "@/lib/types";

interface ForumTabProps {
  groupId: string;
  gameId: string;
  /** Inlägg som redan är hämtade (sidans standardomgång); null = hämta */
  initialPosts: GroupPost[] | null;
  currentUserId: string;
}

export function ForumTab({ groupId, gameId, initialPosts, currentUserId }: ForumTabProps) {
  const [posts, setPosts] = useState<GroupPost[] | null>(initialPosts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (posts !== null) return;
    let cancelled = false;
    getGroupPosts(groupId, gameId)
      .then((data) => { if (!cancelled) setPosts(data); })
      .catch(() => { if (!cancelled) { setPosts([]); setError("Kunde inte hämta inläggen. Försök igen."); } });
    return () => { cancelled = true; };
  }, [groupId, gameId, posts]);

  const handleAdded = useCallback((post: GroupPost) => {
    setPosts((prev) => [...(prev ?? []), { ...post, replies: [] }]);
  }, []);

  const handleDeleted = useCallback((postId: string) => {
    setPosts((prev) =>
      (prev ?? []).filter((p) => p.id !== postId).map((p) => ({ ...p, replies: p.replies.filter((r) => r.id !== postId) }))
    );
  }, []);

  const handleReplied = useCallback((reply: GroupPost, parentId: string) => {
    setPosts((prev) => (prev ?? []).map((p) => p.id === parentId ? { ...p, replies: [...p.replies, reply] } : p));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Formuläret visas när inläggen är hämtade, så att ett nytt inlägg inte ersätter listan */}
      {posts !== null && (
        <div className="ta-card ta-card-pad">
          <PostForm groupId={groupId} gameId={gameId} onAdded={handleAdded} />
        </div>
      )}
      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
      {posts === null ? (
        <p className="ta-text" role="status">Laddar inlägg …</p>
      ) : (
        <PostList posts={posts} groupId={groupId} gameId={gameId} currentUserId={currentUserId} onDeleted={handleDeleted} onReplied={handleReplied} />
      )}
    </div>
  );
}
