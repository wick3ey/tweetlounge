
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor, createPartialProfile } from '@/types/Tweet';
import { updateTweetCount } from '@/utils/tweetCacheService';

/**
 * Add a tweet to user's bookmarks
 */
export const addBookmark = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('User auth error:', userError?.message);
      return false;
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userData.user.id,
        tweet_id: tweetId
      });

    if (error) {
      console.error('Error adding bookmark:', error.message);
      return false;
    }

    // Update the bookmarks count in the tweet
    const { data: tweetData, error: countError } = await supabase
      .from('tweets')
      .select('bookmarks_count')
      .eq('id', tweetId)
      .single();
      
    if (!countError && tweetData) {
      const currentCount = tweetData.bookmarks_count || 0;
      const newCount = currentCount + 1;
      
      await supabase
        .from('tweets')
        .update({ bookmarks_count: newCount })
        .eq('id', tweetId);
      
      // Update local cache
      updateTweetCount(tweetId, { bookmarks_count: newCount });
    }

    return true;
  } catch (error) {
    console.error('Error in addBookmark:', error);
    return false;
  }
};

/**
 * Remove a tweet from user's bookmarks
 */
export const removeBookmark = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('User auth error:', userError?.message);
      return false;
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId);

    if (error) {
      console.error('Error removing bookmark:', error.message);
      return false;
    }
    
    // Update the bookmarks count in the tweet
    const { data: tweetData, error: countError } = await supabase
      .from('tweets')
      .select('bookmarks_count')
      .eq('id', tweetId)
      .single();
      
    if (!countError && tweetData) {
      const currentCount = tweetData.bookmarks_count || 0;
      const newCount = Math.max(0, currentCount - 1);
      
      await supabase
        .from('tweets')
        .update({ bookmarks_count: newCount })
        .eq('id', tweetId);
      
      // Update local cache
      updateTweetCount(tweetId, { bookmarks_count: newCount });
    }

    return true;
  } catch (error) {
    console.error('Error in removeBookmark:', error);
    return false;
  }
};

/**
 * Check if a tweet is bookmarked by the current user
 */
export const checkIfTweetBookmarked = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return false;
    }

    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .eq('tweet_id', tweetId);

    if (error) {
      console.error('Error checking bookmark:', error.message);
      return false;
    }

    return count ? count > 0 : false;
  } catch (error) {
    console.error('Error in checkIfTweetBookmarked:', error);
    return false;
  }
};

/**
 * Get all bookmarked tweets for the current user
 */
export const getBookmarkedTweets = async (limit: number = 20, offset: number = 0): Promise<TweetWithAuthor[]> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        tweet_id,
        created_at,
        tweets:tweet_id (
          id,
          content,
          created_at,
          author_id,
          image_url,
          is_retweet,
          original_tweet_id,
          likes_count,
          retweets_count,
          replies_count,
          bookmarks_count,
          profiles:author_id (
            id,
            username,
            display_name,
            avatar_url,
            avatar_nft_id,
            avatar_nft_chain
          )
        )
      `)
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bookmarks:', error.message);
      return [];
    }

    const bookmarkedTweets: TweetWithAuthor[] = data.map((bookmark: any) => {
      const tweet = bookmark.tweets;
      return {
        id: tweet.id,
        content: tweet.content,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        image_url: tweet.image_url,
        is_retweet: tweet.is_retweet,
        original_tweet_id: tweet.original_tweet_id,
        likes_count: tweet.likes_count || 0,
        retweets_count: tweet.retweets_count || 0,
        replies_count: tweet.replies_count || 0,
        bookmarks_count: tweet.bookmarks_count || 0,
        bookmarked_at: bookmark.created_at,
        author: createPartialProfile(tweet.profiles)
      };
    });

    return bookmarkedTweets;
  } catch (error) {
    console.error('Error in getBookmarkedTweets:', error);
    return [];
  }
};

/**
 * Check if a tweet is bookmarked by the current user
 * This is just an alias for checkIfTweetBookmarked for clarity
 */
export const checkIfUserBookmarkedTweet = async (tweetId: string): Promise<boolean> => {
  return checkIfTweetBookmarked(tweetId);
};

/**
 * Get the bookmark count for a tweet
 */
export const getBookmarkCount = async (tweetId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('tweets')
      .select('bookmarks_count')
      .eq('id', tweetId)
      .single();
    
    if (error || !data) {
      console.error('Error getting bookmark count:', error?.message);
      return 0;
    }
    
    return data.bookmarks_count || 0;
  } catch (error) {
    console.error('Error in getBookmarkCount:', error);
    return 0;
  }
};

/**
 * Bookmark a tweet
 */
export const bookmarkTweet = async (tweetId: string): Promise<boolean> => {
  return addBookmark(tweetId);
};

/**
 * Unbookmark a tweet
 */
export const unbookmarkTweet = async (tweetId: string): Promise<boolean> => {
  return removeBookmark(tweetId);
};
