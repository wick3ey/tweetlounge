export type NotificationType = 'like' | 'comment' | 'retweet' | 'follow' | 'mention';

export interface NotificationActor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
}

export interface NotificationTweet {
  id: string;
  content: string;
  createdAt: string;
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
  tweet?: NotificationTweet;
  referencedTweet?: NotificationTweet;
  // We won't add any deletion flag since we want to keep all notifications
}
