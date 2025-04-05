
export type NotificationType = 
  | 'like' 
  | 'reply' 
  | 'follow' 
  | 'retweet' 
  | 'mention'
  | 'comment';

export interface Notification {
  id: string;
  type: NotificationType | 'system';
  content: string;
  created_at: string;
  read: boolean;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  tweet?: {
    id: string;
    content: string;
  };
}
