
import { supabase } from "@/integrations/supabase/client";

const CHANNEL_NAME = 'global-comments-tracker';

/**
 * Get the exact number of comments for a tweet from the database
 */
export const getExactCommentCount = async (tweetId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }
    
    return typeof count === 'number' ? count : 0;
  } catch (error) {
    console.error('Failed to get exact comment count:', error);
    return 0;
  }
};

/**
 * Update the comment count in the tweets table and broadcast the update
 */
export const syncCommentCount = async (tweetId: string): Promise<number> => {
  try {
    const commentCount = await getExactCommentCount(tweetId);
    
    // Update the tweet record with the exact count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: commentCount })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
    } else {
      console.log(`CommentCountService: Updated tweet ${tweetId} with count ${commentCount}`);
    }
    
    // Broadcast the update to all listeners
    await broadcastCommentCount(tweetId, commentCount);
    
    return commentCount;
  } catch (error) {
    console.error('Failed to sync comment count:', error);
    return 0;
  }
};

/**
 * Broadcast a comment count update via Supabase realtime
 */
export const broadcastCommentCount = async (tweetId: string, count: number): Promise<void> => {
  try {
    await supabase.channel(CHANNEL_NAME).send({
      type: 'broadcast',
      event: 'comment-count-updated',
      payload: { tweetId, count }
    });
    console.log(`CommentCountService: Broadcasted count ${count} for tweet ${tweetId}`);
  } catch (error) {
    console.error('Error broadcasting comment count:', error);
  }
};

/**
 * Set up a listener for comment count updates
 */
export const subscribeToCommentCountUpdates = (
  tweetId: string, 
  onCountUpdated: (count: number) => void
): (() => void) => {
  // Subscribe to direct database changes on comments table
  const dbChannel = supabase
    .channel(`comments-for-tweet-${tweetId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `tweet_id=eq.${tweetId}`
    }, async () => {
      // When any change happens to comments, get the exact count
      const count = await syncCommentCount(tweetId);
      onCountUpdated(count);
    })
    .subscribe();
    
  // Also subscribe to the broadcast channel for updates from other components
  const broadcastChannel = supabase
    .channel(CHANNEL_NAME)
    .on('broadcast', { event: 'comment-count-updated' }, (payload) => {
      if (payload.payload && payload.payload.tweetId === tweetId) {
        onCountUpdated(payload.payload.count);
      }
    })
    .subscribe();
    
  // Return a cleanup function
  return () => {
    supabase.removeChannel(dbChannel);
    supabase.removeChannel(broadcastChannel);
  };
};
