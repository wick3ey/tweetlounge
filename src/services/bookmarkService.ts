import { TweetWithAuthor, createPartialProfile } from '@/types/Tweet';
import { supabase } from '@/lib/supabase';

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
      // Use a direct query instead of the RPC function to avoid ambiguous column reference
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking bookmark status:', error);
        return false;
      }
      
      return !!data;
    } catch (catchError) {
      console.error('Error checking bookmark status with direct query:', catchError);
      return false;
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
    
    // Use a direct query instead of RPC to avoid ambiguous column references
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        created_at as bookmarked_at,
        tweets!bookmarks_tweet_id_fkey (
          id,
          content,
          author_id,
          created_at,
          likes_count,
          retweets_count,
          replies_count,
          is_retweet,
          original_tweet_id,
          image_url,
          profiles!tweets_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            avatar_nft_id,
            avatar_nft_chain
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error fetching bookmarked tweets:', error);
      throw error;
    }
    
    // Transform the data to match the TweetWithAuthor type
    const transformedData: TweetWithAuthor[] = (data || []).map((item: any) => {
      const tweet = item.tweets;
      const profile = tweet.profiles;
      
      return {
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
        bookmarked_at: item.bookmarked_at,
        author: createPartialProfile({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name || profile.username,
          avatar_url: profile.avatar_url || '',
          avatar_nft_id: profile.avatar_nft_id,
          avatar_nft_chain: profile.avatar_nft_chain
        })
      };
    });
    
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
