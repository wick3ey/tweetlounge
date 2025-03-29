
export type NotificationType = 'like' | 'comment' | 'retweet' | 'follow' | 'mention';

export interface NotificationActor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  tweetId?: string;
  commentId?: string;
  createdAt: string;
  read: boolean;
  actor: NotificationActor;
}
