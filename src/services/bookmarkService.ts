import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor } from '@/types/Tweet';

// Add a bookmark
export async function bookmarkTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to bookmark a tweet');
    }
    
    // First check if the tweet exists
    const { count: tweetExists } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })
      .eq('id', tweetId);
      
    if (!tweetExists) {
      console.log('Tweet does not exist, cannot bookmark');
      return false;
    }
    
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        tweet_id: tweetId
      });
      
    if (error) {
      if (error.code === '23505') { // Unique violation - already bookmarked
        console.log('Tweet already bookmarked');
        return true;
      }
      console.error('Error bookmarking tweet:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark creation failed:', error);
    return false;
  }
}

// Remove a bookmark
export async function unbookmarkTweet(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to remove a bookmark');
    }
    
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark removal failed:', error);
    return false;
  }
}

// Check if a tweet is bookmarked
export async function checkIfTweetBookmarked(tweetId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    // First check if the tweet exists to avoid 400 errors
    const { count: tweetExists } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })
      .eq('id', tweetId);
      
    if (!tweetExists) {
      console.log('Tweet does not exist, cannot check bookmark status');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .rpc('is_tweet_bookmarked', {
          tweet_id: tweetId,
          user_id: user.id
        });
        
      if (error) {
        console.error('Error checking bookmark status:', error);
        return false;
      }
      
      return data;
    } catch (catchError) {
      // Fall back to direct query if RPC fails
      console.warn('RPC failed, falling back to direct query');
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking bookmark status with direct query:', error);
        return false;
      }
      
      return !!data;
    }
  } catch (error) {
    console.error('Check bookmark status failed:', error);
    return false;
  }
}

// Get bookmarked tweets
export async function getBookmarkedTweets(limit = 20, offset = 0): Promise<TweetWithAuthor[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return [];
    }
    
    const { data, error } = await supabase
      .rpc('get_bookmarked_tweets', {
        p_user_id: user.id,
        limit_count: limit,
        offset_count: offset
      });
      
    if (error) {
      console.error('Error fetching bookmarked tweets:', error);
      throw error;
    }
    
    const transformedData: TweetWithAuthor[] = (data || []).map((item: any) => ({
      id: item.id,
      content: item.content,
      author_id: item.author_id,
      created_at: item.created_at,
      likes_count: item.likes_count,
      retweets_count: item.retweets_count,
      replies_count: item.replies_count,
      is_retweet: item.is_retweet,
      original_tweet_id: item.original_tweet_id,
      image_url: item.image_url,
      bookmarked_at: item.bookmarked_at,
      author: {
        id: item.author_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url || '',
        avatar_nft_id: item.avatar_nft_id,
        avatar_nft_chain: item.avatar_nft_chain
      }
    }));
    
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch bookmarked tweets:', error);
    return [];
  }
}

// Get bookmark count for a tweet
export async function getBookmarkCount(tweetId: string): Promise<number> {
  try {
    // First check if the tweet exists
    const { count: tweetExists } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })
      .eq('id', tweetId);
      
    if (!tweetExists) {
      console.log('Tweet does not exist, bookmark count is 0');
      return 0;
    }
    
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error fetching bookmark count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Failed to fetch bookmark count:', error);
    return 0;
  }
}
