"use client";

import { useState, useCallback } from "react";
import { getGroupPosts } from "@/lib/actions/posts";
import { PostList } from "./PostList";
import { PostForm } from "./PostForm";
import type { GroupPost } from "@/lib/types";

type Game = { id: string; date: string; track: string | null };

interface ForumTabProps {
  groupId: string;
  games: Game[];
  initialPosts: GroupPost[];
  initialGameId: string | null;
  currentUserId: string;
}

export function ForumTab({ groupId, games, initialPosts, initialGameId, currentUserId }: ForumTabProps) {
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const [posts, setPosts] = useState<GroupPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId);
    setLoading(true);
    const data = await getGroupPosts(groupId, gameId);
    setPosts(data);
    setLoading(false);
  }

  const handleAdded = useCallback((post: GroupPost) => {
    setPosts((prev) => [...prev, { ...post, replies: [] }]);
  }, []);

  const handleDeleted = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.filter((p) => p.id !== postId).map((p) => ({ ...p, replies: p.replies.filter((r) => r.id !== postId) }))
    );
  }, []);

  const handleReplied = useCallback((reply: GroupPost, parentId: string) => {
    setPosts((prev) => prev.map((p) => p.id === parentId ? { ...p, replies: [...p.replies, reply] } : p));
  }, []);

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
      {games.length > 0 && (
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => handleGameChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.date}{g.track ? ` – ${g.track}` : ""}</option>
          ))}
        </select>
      )}

      {games.length === 0 && (
        <p className="text-sm italic" style={{ color: "var(--tn-text-faint)" }}>
          Ingen omgång inladdad ännu. Hämta en V85-omgång på startsidan först.
        </p>
      )}

      {selectedGameId && (
        <>
          <PostForm groupId={groupId} gameId={selectedGameId} onAdded={handleAdded} />
          {loading ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--tn-text-faint)" }}>Laddar…</p>
          ) : (
            <PostList posts={posts} groupId={groupId} gameId={selectedGameId} currentUserId={currentUserId} onDeleted={handleDeleted} onReplied={handleReplied} />
          )}
        </>
      )}
    </div>
  );
}
