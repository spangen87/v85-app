"use client";

import { useState } from "react";
import { deletePost } from "@/lib/actions/posts";
import { PostForm } from "./PostForm";
import type { GroupPost } from "@/lib/types";

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

interface PostItemProps {
  post: GroupPost;
  groupId: string;
  gameId: string;
  currentUserId: string;
  onDeleted: (postId: string) => void;
  onReplied: (reply: GroupPost, parentId: string) => void;
  isReply?: boolean;
}

export function PostItem({ post, groupId, gameId, currentUserId, onDeleted, onReplied, isReply = false }: PostItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deletePost(post.id);
    onDeleted(post.id);
  }

  function handleReplied(reply: GroupPost) {
    setShowReplyForm(false);
    onReplied(reply, post.id);
  }

  return (
    <div
      className={isReply ? "ml-4 pl-3" : ""}
      style={isReply ? { borderLeft: "2px solid var(--tn-border)" } : {}}
    >
      <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--tn-bg-chip)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--tn-accent)", color: "#fff" }}
          >
            {post.author_display_name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--tn-text)" }}>{post.author_display_name}</span>
          <span className="text-xs ml-auto" style={{ color: "var(--tn-text-faint)" }}>{relativeTime(post.created_at)}</span>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tn-text)" }}>{post.content}</p>

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
          {post.author_id === currentUserId && (
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
          <PostForm groupId={groupId} gameId={gameId} parentId={post.id} onAdded={handleReplied} onCancel={() => setShowReplyForm(false)} compact />
        </div>
      )}

      {post.replies && post.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {post.replies.map((reply) => (
            <PostItem key={reply.id} post={reply} groupId={groupId} gameId={gameId} currentUserId={currentUserId} onDeleted={onDeleted} onReplied={onReplied} isReply />
          ))}
        </div>
      )}
    </div>
  );
}
