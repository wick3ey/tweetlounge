
export type Tweet = {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  is_retweet: boolean;
  original_tweet_id?: string | null;
  image_url?: string | null;
  bookmarks_count?: number;
};

export type TweetWithAuthor = Tweet & {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string | null;
    avatar_nft_chain?: string | null;
    replies_sort_order?: string | null;
  };
  // For retweets, store the original author information
  original_author?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    avatar_nft_id?: string | null;
    avatar_nft_chain?: string | null;
    replies_sort_order?: string | null;
  } | null;
  // Add profile_ prefixed properties to match the database function return
  profile_username?: string;
  profile_display_name?: string;
  profile_avatar_url?: string;
  profile_avatar_nft_id?: string | null;
  profile_avatar_nft_chain?: string | null;
  profile_replies_sort_order?: string | null;
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
    avatar_nft_id?: string | null;
    avatar_nft_chain?: string | null;
    replies_sort_order?: string | null;
  };
};

// Enhanced type guard function to validate a retweet with proper type checking
export function isValidRetweet(tweet: any): tweet is RetweetWithAuthor {
  if (!tweet) return false;
  
  return (
    tweet.is_retweet === true && 
    typeof tweet.original_tweet_id === 'string' && 
    tweet.original_tweet_id !== null &&
    tweet.original_author !== undefined &&
    tweet.original_author !== null
  );
}

// Enhanced function to validate any tweet with proper type checking
export function isValidTweet(tweet: any): tweet is TweetWithAuthor {
  if (!tweet) return false;
  
  // A tweet must have these basic properties
  if (
    typeof tweet.id !== 'string' ||
    typeof tweet.author_id !== 'string' ||
    typeof tweet.content !== 'string' ||
    typeof tweet.created_at !== 'string'
  ) {
    return false;
  }
  
  // Check if author object exists and has required properties
  if (
    !tweet.author ||
    typeof tweet.author.id !== 'string' ||
    typeof tweet.author.username !== 'string' ||
    typeof tweet.author.display_name !== 'string'
  ) {
    return false;
  }
  
  // If it's a retweet, it must have original_tweet_id and original_author
  if (tweet.is_retweet === true) {
    return isValidRetweet(tweet);
  }
  
  return true;
}

// New utility function to safely get tweet ID for logging
export function getSafeTweetId(tweet: any): string {
  if (!tweet) return 'unknown';
  return typeof tweet.id === 'string' ? tweet.id : 'unknown';
}
