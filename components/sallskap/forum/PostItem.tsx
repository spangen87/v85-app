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

export function PostItem({
  post,
  groupId,
  gameId,
  currentUserId,
  onDeleted,
  onReplied,
  isReply = false,
}: PostItemProps) {
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
    <div className={`${isReply ? "ml-4 pl-3 border-l-2 border-gray-300 dark:border-gray-700" : ""}`}>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {post.author_display_name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-gray-900 dark:text-white text-xs font-medium">{post.author_display_name}</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">{relativeTime(post.created_at)}</span>
        </div>

        {/* Content */}
        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

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
          {post.author_id === currentUserId && (
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
          <PostForm
            groupId={groupId}
            gameId={gameId}
            parentId={post.id}
            onAdded={handleReplied}
            onCancel={() => setShowReplyForm(false)}
            compact
          />
        </div>
      )}

      {/* Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {post.replies.map((reply) => (
            <PostItem
              key={reply.id}
              post={reply}
              groupId={groupId}
              gameId={gameId}
              currentUserId={currentUserId}
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
