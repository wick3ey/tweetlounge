
export type NotificationType = 
  | 'like' 
  | 'reply' 
  | 'follow' 
  | 'retweet' 
  | 'mention'
  | 'comment'
  | 'system'; // Added system as a valid notification type

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  created_at: string;
  read: boolean;
  userId?: string;
  actorId?: string;
  tweetId?: string;
  commentId?: string;
  actor?: {
    id?: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  tweet?: {
    id: string;
    content: string;
    createdAt?: string;
  };
  referencedTweet?: {
    id: string;
    content: string;
  };
}
