
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  tweet_id: string;
  parent_comment_id?: string | null;
  created_at: string;
  likes_count: number;
  author: {
    username: string;
    display_name: string;
    avatar_url?: string;
    avatar_nft_id?: string;
    avatar_nft_chain?: string;
  };
}
