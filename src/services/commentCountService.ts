
import { supabase } from "@/integrations/supabase/client";

const COMMENT_COUNT_CHANNEL = 'comment-count-updates';

/**
 * Get the exact number of comments for a tweet directly from the database
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
    // Get exact count from database
    const commentCount = await getExactCommentCount(tweetId);
    
    // Update the tweet with exact count - important to use the direct database count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: commentCount })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
    } else {
      console.log(`Updated tweet ${tweetId} with comment count ${commentCount}`);
    }
    
    // Broadcast update to all clients
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
    await supabase.channel(COMMENT_COUNT_CHANNEL).send({
      type: 'broadcast',
      event: 'comment-count-update',
      payload: { tweetId, count }
    });
    console.log(`Broadcast comment count ${count} for tweet ${tweetId}`);
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
  console.log(`Setting up comment count subscription for tweet ${tweetId}`);
  
  // Get initial count immediately
  getExactCommentCount(tweetId)
    .then(count => {
      console.log(`Initial comment count for tweet ${tweetId}: ${count}`);
      onCountUpdated(count);
    });
  
  // Listen for database changes on comments
  const dbChannel = supabase
    .channel(`comments-for-tweet-${tweetId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `tweet_id=eq.${tweetId}`
    }, async () => {
      // When any change happens, get and sync the exact count
      const count = await syncCommentCount(tweetId);
      onCountUpdated(count);
    })
    .subscribe();
    
  // Also subscribe to the broadcast channel for updates
  const broadcastChannel = supabase
    .channel(COMMENT_COUNT_CHANNEL)
    .on('broadcast', { event: 'comment-count-update' }, (payload) => {
      if (payload.payload && payload.payload.tweetId === tweetId) {
        console.log(`Received broadcast count update for ${tweetId}: ${payload.payload.count}`);
        onCountUpdated(payload.payload.count);
      }
    })
    .subscribe();
    
  // Return cleanup function
  return () => {
    supabase.removeChannel(dbChannel);
    supabase.removeChannel(broadcastChannel);
    console.log(`Removed comment count subscriptions for tweet ${tweetId}`);
  };
};
