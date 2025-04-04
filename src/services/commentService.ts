
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the comment count for a tweet by counting all comments associated with the tweet ID
 */
export const updateTweetCommentCount = async (tweetId: string): Promise<number> => {
  try {
    // Get the exact count of comments for this tweet
    const { count, error: countError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (countError) {
      console.error('Error getting comment count:', countError);
      return 0;
    }
    
    // Ensure count is a number
    const commentCount = typeof count === 'number' ? count : 0;
    
    // Update the tweet's replies_count with the accurate count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: commentCount })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
      return commentCount;
    }
    
    console.log(`Updated tweet ${tweetId} comment count to ${commentCount}`);
    return commentCount;
  } catch (error) {
    console.error('Failed to update tweet comment count:', error);
    return 0;
  }
};
