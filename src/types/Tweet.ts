
export type Tweet = {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  is_retweet: boolean;
  original_tweet_id?: string;
  image_url?: string;
};

export type TweetWithAuthor = Tweet & {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string | null;
    avatar_nft_chain?: string | null;
  };
};
