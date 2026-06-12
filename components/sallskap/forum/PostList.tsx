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
      <p className="text-sm py-4 text-center leading-relaxed" style={{ color: "var(--tn-text-faint)" }}>
        Inga inlägg ännu för den här omgången.
        <br />
        Dela dina spikar och skrällbud — vem öppnar diskussionen inför lördagen?
      </p>
    );
  }

  return (
    <div className="space-y-3">
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
