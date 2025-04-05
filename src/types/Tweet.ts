
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  avatar_nft_id?: string;
  avatar_nft_chain?: string;
}

export const createPartialProfile = (profile: Partial<Profile>): Profile => {
  return {
    id: profile.id || '',
    username: profile.username || 'unknown',
    display_name: profile.display_name || profile.username || 'unknown',
    avatar_url: profile.avatar_url || '',
    avatar_nft_id: profile.avatar_nft_id,
    avatar_nft_chain: profile.avatar_nft_chain
  };
};

export interface Tweet {
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
}

export const isValidTweet = (tweet: Tweet): boolean => {
  return !!tweet.id && !!tweet.content && !!tweet.author_id && !!tweet.created_at;
};

export const enhanceTweetData = (tweet: any): TweetWithAuthor => {
  return {
    ...tweet,
    likes_count: tweet.likes_count || 0,
    replies_count: tweet.replies_count || 0,
    retweets_count: tweet.retweets_count || 0,
    is_retweet: tweet.is_retweet || false
  };
};

export interface TweetWithAuthor {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  bookmarks_count?: number;
  is_retweet: boolean;
  original_tweet_id?: string;
  image_url?: string;
  bookmarked_at?: string;
  author?: Profile;
  original_author?: Profile; // Added original_author property
}
