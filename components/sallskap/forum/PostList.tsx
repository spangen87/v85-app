import { EmptyState } from "@/components/ui";
import { PostItem } from "./PostItem";
import type { GroupPost } from "@/lib/types";

interface PostListProps {
  posts: GroupPost[];
  groupId: string;
  gameId: string;
  currentUserId: string;
  onDeleted: (postId: string) => void;
  onReplied: (reply: GroupPost, parentId: string) => void;
}

export function PostList({ posts, groupId, gameId, currentUserId, onDeleted, onReplied }: PostListProps) {
  if (posts.length === 0) {
    return (
      <EmptyState title="Inga inlägg ännu" text="Dela dina spikar och skrällbud för omgången, så kan de andra svara." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          groupId={groupId}
          gameId={gameId}
          currentUserId={currentUserId}
          onDeleted={onDeleted}
          onReplied={onReplied}
        />
      ))}
    </div>
  );
}
