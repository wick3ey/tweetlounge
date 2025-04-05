
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
    
    // Check if the bookmark already exists
    const { count: bookmarkExists } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
      
    if (bookmarkExists) {
      console.log('Tweet already bookmarked');
      return true;
    }
    
    // Create the bookmark
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        tweet_id: tweetId
      });
      
    if (error) {
      console.error('Error bookmarking tweet:', error);
      throw error;
    }
    
    // Update bookmark count on tweet
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ 
        bookmarks_count: supabase.rpc('increment_bookmark_count', { tweet_id_param: tweetId })
      })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating bookmark count:', updateError);
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
    
    // Check if bookmark exists before removing
    const { count: bookmarkExists } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('tweet_id', tweetId);
      
    if (!bookmarkExists) {
      console.log('Bookmark does not exist, nothing to remove');
      return true;
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
    
    // Update bookmark count on tweet
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ 
        bookmarks_count: supabase.rpc('decrement_bookmark_count', { tweet_id_param: tweetId })
      })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating bookmark count:', updateError);
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
      // Use a direct query to check bookmark status
      const { count, error } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId);
        
      if (error) {
        console.error('Error checking bookmark status:', error);
        return false;
      }
      
      return count > 0;
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
    
    // Try to use the RPC function if available
    try {
      const { data, error } = await supabase
        .rpc('get_bookmarked_tweets', { 
          p_user_id: user.id,
          limit_count: limit,
          offset_count: offset
        });
        
      if (!error && data && data.length > 0) {
        return data.map((item: any) => {
          return {
            id: item.id,
            content: item.content,
            author_id: item.author_id,
            created_at: item.created_at,
            likes_count: item.likes_count || 0,
            retweets_count: item.retweets_count || 0,
            replies_count: item.replies_count || 0,
            is_retweet: item.is_retweet || false,
            original_tweet_id: item.original_tweet_id,
            image_url: item.image_url,
            bookmarked_at: item.bookmarked_at,
            author: createPartialProfile({
              id: item.author_id,
              username: item.username,
              display_name: item.display_name || item.username,
              avatar_url: item.avatar_url || '',
              avatar_nft_id: item.avatar_nft_id,
              avatar_nft_chain: item.avatar_nft_chain
            })
          };
        });
      }
    } catch (rpcError) {
      console.log('RPC function not available, falling back to standard query:', rpcError);
    }
    
    // Fallback to standard query if RPC not available
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
        likes_count: tweet.likes_count || 0,
        retweets_count: tweet.retweets_count || 0,
        replies_count: tweet.replies_count || 0,
        is_retweet: tweet.is_retweet || false,
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
    // First check the bookmarks_count field on the tweet
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .select('bookmarks_count')
      .eq('id', tweetId)
      .single();
      
    if (!tweetError && tweetData && typeof tweetData.bookmarks_count === 'number') {
      return tweetData.bookmarks_count;
    }
    
    // Fallback to counting bookmarks directly
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error fetching bookmark count:', error);
      return 0;
    }
    
    // Update the bookmarks_count in the tweets table if it doesn't match
    if (!tweetError && tweetData && tweetData.bookmarks_count !== count) {
      const { error: updateError } = await supabase
        .from('tweets')
        .update({ bookmarks_count: count })
        .eq('id', tweetId);
        
      if (updateError) {
        console.error('Error updating bookmark count:', updateError);
      }
    }
    
    return count || 0;
  } catch (error) {
    console.error('Failed to fetch bookmark count:', error);
    return 0;
  }
}
