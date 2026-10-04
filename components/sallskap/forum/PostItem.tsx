"use client";

import { useState } from "react";
import { deletePost } from "@/lib/actions/posts";
import { relativeTime } from "@/lib/relativeTime";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PostForm } from "./PostForm";
import type { GroupPost } from "@/lib/types";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setConfirmDelete(false);
    setDeleting(true);
    await deletePost(post.id);
    onDeleted(post.id);
  }

  function handleReplied(reply: GroupPost) {
    setShowReplyForm(false);
    onReplied(reply, post.id);
  }

  const head = (
    <div className="flex items-center gap-2">
      <span className="ta-avatar" style={isReply ? { width: 24, height: 24, fontSize: 11 } : undefined} aria-hidden="true">
        {post.author_display_name.slice(0, 2).toUpperCase()}
      </span>
      <span style={{ font: "500 15px/20px var(--font-sans)", color: "var(--ink)" }}>{post.author_display_name}</span>
      <span className="ta-text-sm" style={{ marginLeft: "auto", fontSize: 12 }}>{relativeTime(post.created_at)}</span>
    </div>
  );

  const body = (
    <>
      {head}
      <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{post.content}</p>
      <div className="flex items-center gap-2">
        {!isReply && (
          <Button size="sm" variant="quiet" aria-expanded={showReplyForm} onClick={() => setShowReplyForm((v) => !v)}>
            {showReplyForm ? "Avbryt svar" : "Svara"}
          </Button>
        )}
        {post.author_id === currentUserId && (
          <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            {deleting ? "Tar bort …" : "Ta bort"}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={isReply ? "Ta bort svaret?" : "Ta bort inlägget?"}
        description={isReply ? "Svaret tas bort för alla i sällskapet." : "Inlägget och dess svar tas bort för alla i sällskapet."}
        confirmLabel="Ta bort"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );

  if (isReply) {
    return <div className="flex flex-col gap-2" style={{ marginLeft: 16, paddingLeft: 12, borderLeft: "2px solid var(--line)" }}>{body}</div>;
  }

  return (
    <article className="ta-card ta-card-pad flex flex-col gap-2">
      {body}
      {showReplyForm && (
        <PostForm groupId={groupId} gameId={gameId} parentId={post.id} onAdded={handleReplied} onCancel={() => setShowReplyForm(false)} compact />
      )}
      {post.replies && post.replies.length > 0 && (
        <div className="flex flex-col gap-3" style={{ marginTop: 4 }}>
          {post.replies.map((reply) => (
            <PostItem key={reply.id} post={reply} groupId={groupId} gameId={gameId} currentUserId={currentUserId} onDeleted={onDeleted} onReplied={onReplied} isReply />
          ))}
        </div>
      )}
    </article>
  );
}
