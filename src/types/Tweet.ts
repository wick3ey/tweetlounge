
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  avatar_nft_id?: string;
  avatar_nft_chain?: string;
  bio?: string | null;
  cover_url?: string | null;
  location?: string | null;
  website?: string | null;
  updated_at?: string | null;
  created_at?: string;
  ethereum_address?: string | null;
  solana_address?: string | null;
  followers_count?: number;
  following_count?: number;
  replies_sort_order?: string | null;
}

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
  original_author?: Profile;
}

export const createPartialProfile = (profile: Partial<Profile>): Profile => {
  return {
    id: profile.id || '',
    username: profile.username || 'unknown',
    display_name: profile.display_name || profile.username || 'unknown',
    avatar_url: profile.avatar_url || '',
    avatar_nft_id: profile.avatar_nft_id,
    avatar_nft_chain: profile.avatar_nft_chain,
    bio: profile.bio || null,
    cover_url: profile.cover_url || null,
    location: profile.location || null,
    website: profile.website || null,
    updated_at: profile.updated_at || null,
    created_at: profile.created_at || new Date().toISOString(),
    ethereum_address: profile.ethereum_address || null,
    solana_address: profile.solana_address || null,
    followers_count: profile.followers_count || 0,
    following_count: profile.following_count || 0,
    replies_sort_order: profile.replies_sort_order || null
  };
};

export const isValidTweet = (tweet: Tweet | TweetWithAuthor): boolean => {
  return !!tweet.id && !!tweet.content && !!tweet.author_id && !!tweet.created_at;
};

export const enhanceTweetData = (tweet: any): TweetWithAuthor => {
  return {
    ...tweet,
    likes_count: tweet.likes_count || 0,
    replies_count: tweet.replies_count || 0,
    retweets_count: tweet.retweets_count || 0,
    bookmarks_count: tweet.bookmarks_count || 0,
    is_retweet: tweet.is_retweet || false
  };
};
