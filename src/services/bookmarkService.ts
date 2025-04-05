
import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor, createPartialProfile } from '@/types/Tweet';

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
    
    // Update bookmark count using the new RPC function
    const { error: countUpdateError } = await supabase
      .from('tweets')
      .update({ 
        bookmarks_count: supabase.rpc('increment_bookmark_count', { tweet_id_param: tweetId })
      })
      .eq('id', tweetId);
    
    if (countUpdateError) {
      console.error('Bookmark count update error:', countUpdateError);
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark creation failed:', error);
    return false;
  }
}

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
    
    // Update bookmark count using the new RPC function
    const { error: countUpdateError } = await supabase
      .from('tweets')
      .update({ 
        bookmarks_count: supabase.rpc('decrement_bookmark_count', { tweet_id_param: tweetId })
      })
      .eq('id', tweetId);
    
    if (countUpdateError) {
      console.error('Bookmark count update error:', countUpdateError);
    }
    
    return true;
  } catch (error) {
    console.error('Bookmark removal failed:', error);
    return false;
  }
}
