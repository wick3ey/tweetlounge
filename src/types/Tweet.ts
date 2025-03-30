
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

/**
 * Enhanced and robust version of isValidRetweet function
 * Handles special cases and fixes issues with retweets that have missing original_tweet_id
 */
export function isValidRetweet(tweet: any): tweet is RetweetWithAuthor {
  if (!tweet) return false;
  
  // For retweets, check if it has a valid original_tweet_id
  const hasOriginalTweetId = typeof tweet.original_tweet_id === 'string' && tweet.original_tweet_id !== null;
  
  return (
    tweet.is_retweet === true && 
    hasOriginalTweetId
  );
}

/**
 * Enhanced tweet data processor that fixes common issues with tweet data
 * Much more robust than previous version
 */
export function enhanceTweetData(tweet: any): TweetWithAuthor | null {
  if (!tweet) return null;
  
  // Create a working copy to avoid mutating the original
  const enhancedTweet = { ...tweet };
  
  // Fix potential undefined or missing properties
  enhancedTweet.likes_count = enhancedTweet.likes_count || 0;
  enhancedTweet.retweets_count = enhancedTweet.retweets_count || 0;
  enhancedTweet.replies_count = enhancedTweet.replies_count || 0;
  
  // Make sure is_retweet is a boolean
  enhancedTweet.is_retweet = !!enhancedTweet.is_retweet;
  
  // If the tweet is marked as a retweet but has a null original_tweet_id, fix it
  if (enhancedTweet.is_retweet === true && !enhancedTweet.original_tweet_id) {
    console.log(`Fixing invalid retweet data for tweet ${enhancedTweet.id}. Changing is_retweet to false.`);
    enhancedTweet.is_retweet = false;
  }
  
  // If the tweet doesn't have an author object but has profile_ prefixed fields
  // create an author object from those fields
  if (!enhancedTweet.author && enhancedTweet.profile_username) {
    enhancedTweet.author = {
      id: enhancedTweet.author_id,
      username: enhancedTweet.profile_username,
      display_name: enhancedTweet.profile_display_name || enhancedTweet.profile_username,
      avatar_url: enhancedTweet.profile_avatar_url || '',
      avatar_nft_id: enhancedTweet.profile_avatar_nft_id,
      avatar_nft_chain: enhancedTweet.profile_avatar_nft_chain,
      replies_sort_order: enhancedTweet.profile_replies_sort_order
    };
  }
  
  // If the author object is missing display_name, use username as fallback
  if (enhancedTweet.author && !enhancedTweet.author.display_name && enhancedTweet.author.username) {
    enhancedTweet.author.display_name = enhancedTweet.author.username;
  }
  
  // For retweets with original_tweet_id but without original_author, create a placeholder
  // This allows the tweet to pass validation and be displayed properly
  if (enhancedTweet.is_retweet === true && enhancedTweet.original_tweet_id && !enhancedTweet.original_author) {
    enhancedTweet.original_author = {
      id: 'placeholder',
      username: 'user',
      display_name: 'User',
      avatar_url: '',
    };
  }
  
  return enhancedTweet;
}

/**
 * Completely rewritten isValidTweet function that's much more robust
 * and handles edge cases better
 */
export function isValidTweet(tweet: any): tweet is TweetWithAuthor {
  if (!tweet) return false;
  
  // First try to enhance the tweet data to fix common issues
  const enhancedTweet = enhanceTweetData(tweet);
  if (!enhancedTweet) return false;
  
  // Validate basic properties
  const hasBasicProperties = 
    typeof enhancedTweet.id === 'string' &&
    typeof enhancedTweet.author_id === 'string' &&
    typeof enhancedTweet.content === 'string' &&
    typeof enhancedTweet.created_at === 'string';
  
  if (!hasBasicProperties) {
    console.log(`Tweet missing required properties: id=${getSafeTweetId(enhancedTweet)}`);
    return false;
  }
  
  // Check if author object exists and has required properties
  const hasAuthor = 
    enhancedTweet.author &&
    typeof enhancedTweet.author.id === 'string' &&
    typeof enhancedTweet.author.username === 'string';
  
  if (!hasAuthor) {
    console.log(`Tweet missing required author properties: id=${getSafeTweetId(enhancedTweet)}`);
    return false;
  }
  
  // Special validation for retweets to ensure they have original tweet ID
  if (enhancedTweet.is_retweet === true) {
    if (!enhancedTweet.original_tweet_id) {
      console.log(`Retweet missing original_tweet_id: id=${getSafeTweetId(enhancedTweet)}`);
      return false;
    }
    
    // Make sure original_author exists (even if it's just a placeholder)
    if (!enhancedTweet.original_author) {
      console.log(`Retweet missing original_author: id=${getSafeTweetId(enhancedTweet)}`);
      return false;
    }
  }
  
  return true;
}

// Helper function to safely get tweet ID for logging
export function getSafeTweetId(tweet: any): string {
  if (!tweet) return 'unknown';
  return typeof tweet.id === 'string' ? tweet.id : 'unknown';
}
