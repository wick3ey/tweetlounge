
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor, createPartialProfile } from '@/types/Tweet';

/**
 * Checks if a tweet is bookmarked by the current user
 */
export async function checkIfTweetBookmarked(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    const { count } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
    
    return count ? count > 0 : false;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
}

/**
 * Gets the number of bookmarks for a tweet
 */
export async function getBookmarkCount(tweetId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('tweets')
      .select('bookmarks_count')
      .eq('id', tweetId)
      .single();
    
    if (error) {
      console.error('Error getting bookmark count:', error);
      return 0;
    }
    
    return data?.bookmarks_count || 0;
  } catch (error) {
    console.error('Error getting bookmark count:', error);
    return 0;
  }
}

/**
 * Bookmarks a tweet
 */
export async function bookmarkTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to bookmark a tweet');
    }
    
    // Check if bookmark already exists
    const { count: existingBookmark } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
    
    if (existingBookmark) {
      console.log('Tweet already bookmarked');
      return true;
    }
    
    // Create bookmark
    const { error: bookmarkError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        tweet_id: tweetId
      });
    
    if (bookmarkError) {
      console.error('Bookmark creation error:', bookmarkError);
      return false;
    }
    
    // Update bookmark count using SQL function
    const { data, error: countUpdateError } = await supabase.rpc(
      'increment_bookmark_count', 
      { tweet_id_param: tweetId }
    );
    
    if (countUpdateError) {
      console.error('Bookmark count update error:', countUpdateError);
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark creation failed:', error);
    return false;
  }
}

/**
 * Removes a bookmark from a tweet
 */
export async function unbookmarkTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to remove a bookmark');
    }
    
    // Delete bookmark
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
    
    if (deleteError) {
      console.error('Bookmark removal error:', deleteError);
      return false;
    }
    
    // Update bookmark count using SQL function
    const { data, error: countUpdateError } = await supabase.rpc(
      'decrement_bookmark_count', 
      { tweet_id_param: tweetId }
    );
    
    if (countUpdateError) {
      console.error('Bookmark count update error:', countUpdateError);
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark removal failed:', error);
    return false;
  }
}

/**
 * Gets all bookmarked tweets for the current user
 */
export async function getBookmarkedTweets(limit: number = 20, offset: number = 0): Promise<TweetWithAuthor[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to view bookmarks');
    }
    
    const { data, error } = await supabase.rpc(
      'get_bookmarked_tweets',
      { p_user_id: user.id, limit_count: limit, offset_count: offset }
    );
    
    if (error) {
      console.error('Error fetching bookmarked tweets:', error);
      return [];
    }
    
    return data.map((tweet: any) => ({
      id: tweet.id,
      content: tweet.content,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      likes_count: tweet.likes_count,
      retweets_count: tweet.retweets_count,
      replies_count: tweet.replies_count,
      is_retweet: tweet.is_retweet,
      original_tweet_id: tweet.original_tweet_id,
      image_url: tweet.image_url,
      bookmarked_at: tweet.bookmarked_at,
      author: createPartialProfile({
        id: tweet.author_id,
        username: tweet.username,
        display_name: tweet.display_name,
        avatar_url: tweet.avatar_url || '',
        avatar_nft_id: tweet.avatar_nft_id,
        avatar_nft_chain: tweet.avatar_nft_chain
      })
    }));
  } catch (error) {
    console.error('Error fetching bookmarked tweets:', error);
    return [];
  }
}
