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
  
  // For retweets, we need to check if it's actually a retweet and has an original_tweet_id
  if (tweet.is_retweet !== true) return false;
  
  // Allow retweets that are still being processed (might not have original_author yet)
  if (typeof tweet.original_tweet_id !== 'string' || tweet.original_tweet_id === null) {
    return false;
  }
  
  // If we're in the profile view, we might not have all the original author data yet
  // This is a more permissive check for profile pages where we might have partial data
  return true;
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
    // For profile views, we might get tweets without complete author objects
    // So we'll use the profile_* fields as fallback
    if (
      typeof tweet.profile_username === 'string' &&
      typeof tweet.profile_display_name === 'string'
    ) {
      // Dynamically construct author object from profile fields
      tweet.author = {
        id: tweet.author_id,
        username: tweet.profile_username,
        display_name: tweet.profile_display_name,
        avatar_url: tweet.profile_avatar_url || '',
        avatar_nft_id: tweet.profile_avatar_nft_id,
        avatar_nft_chain: tweet.profile_avatar_nft_chain
      };
      return true;
    }
    return false;
  }
  
  // If it's a retweet, validate it as a retweet
  if (tweet.is_retweet === true) {
    // We'll be more lenient with retweets in profiles since they might be in-progress
    // Just make sure they have the minimum necessary properties
    return typeof tweet.original_tweet_id === 'string' && tweet.original_tweet_id !== null;
  }
  
  return true;
}

// New utility function to safely get tweet ID for logging
export function getSafeTweetId(tweet: any): string {
  if (!tweet) return 'unknown';
  return typeof tweet.id === 'string' ? tweet.id : 'unknown';
}

// Helper function to enhance tweet data that might be incomplete
export function enhanceTweetData(tweet: any): TweetWithAuthor | null {
  if (!tweet) return null;
  
  // Ensure the tweet has the minimum required properties
  if (
    typeof tweet.id !== 'string' ||
    typeof tweet.author_id !== 'string' ||
    typeof tweet.content !== 'string' ||
    typeof tweet.created_at !== 'string'
  ) {
    console.warn('Tweet missing required properties:', tweet);
    return null;
  }
  
  // Create a properly structured tweet object
  const enhancedTweet: TweetWithAuthor = {
    ...tweet,
    likes_count: tweet.likes_count || 0,
    retweets_count: tweet.retweets_count || 0,
    replies_count: tweet.replies_count || 0,
    is_retweet: !!tweet.is_retweet,
    
    // Ensure author object exists
    author: tweet.author || {
      id: tweet.author_id,
      username: tweet.profile_username || 'user',
      display_name: tweet.profile_display_name || 'User',
      avatar_url: tweet.profile_avatar_url || '',
      avatar_nft_id: tweet.profile_avatar_nft_id,
      avatar_nft_chain: tweet.profile_avatar_nft_chain
    }
  };
  
  // If it's a retweet, ensure it has the necessary fields
  if (enhancedTweet.is_retweet && enhancedTweet.original_tweet_id) {
    // If it already has original_author, keep it
    if (!enhancedTweet.original_author) {
      // Create a placeholder original_author if needed
      enhancedTweet.original_author = {
        id: 'placeholder',
        username: 'original',
        display_name: 'Original Author',
        avatar_url: ''
      };
    }
  }
  
  return enhancedTweet;
}
