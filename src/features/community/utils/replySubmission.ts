import { CommunityService } from "@core/services/firestore";

const incrementReplyCount = async (postId: string, delta: number) => {
  try {
    const { ReplyCountStore } = await import("@shared/state/replyStore");
    ReplyCountStore.increment(postId, delta);
  } catch {
    /* ignore */
  }
};

const ensureRepliesVisible = (postId: string) => {
  try {
    const { ReplyVisibilityStore } = require("@shared/state/replyVisibilityStore");
    ReplyVisibilityStore.set(postId, true);
  } catch {
    /* ignore */
  }
};

type ReplyAuthorSnapshot = {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export const submitCommunityReply = async (
  postId: string,
  content: string,
  author?: ReplyAuthorSnapshot,
) => {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("empty_reply");
  }
  await CommunityService.addReply(postId, {
    content: trimmed,
    authorId: author?.id,
    authorName: author?.displayName,
    authorAvatar: author?.avatarUrl,
  });
  ensureRepliesVisible(postId);
  await incrementReplyCount(postId, 1);
};
