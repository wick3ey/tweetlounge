
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
  bookmarks_count?: number;
};

export type TweetWithAuthor = Tweet & {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string;
    avatar_nft_chain?: string;
    replies_sort_order?: string;
  };
  // For retweets, store the original author information
  original_author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string;
    avatar_nft_chain?: string;
    replies_sort_order?: string;
  };
  // Add profile_ prefixed properties to match the database function return
  profile_username?: string;
  profile_display_name?: string;
  profile_avatar_url?: string;
  profile_avatar_nft_id?: string;
  profile_avatar_nft_chain?: string;
  profile_replies_sort_order?: string;
  // Add bookmark-related field
  bookmarked_at?: string;
};

// Add a more specific retweet type
export type RetweetWithAuthor = TweetWithAuthor & {
  is_retweet: true;
  original_tweet_id: string; // Make this required for retweets
  original_author: {  // Make this required for retweets
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string;
    avatar_nft_chain?: string;
    replies_sort_order?: string;
  };
};
