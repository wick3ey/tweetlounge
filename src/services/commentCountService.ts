import { supabase } from "@/integrations/supabase/client";

const COMMENT_COUNT_CHANNEL = 'comment-count-updates';
// Keep track of active subscriptions to prevent duplicates
const activeSubscriptions = new Map<string, { 
  dbChannel: any, 
  broadcastChannel: any, 
  lastCount: number,
  lastChecked: number
}>();

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
    
    // Skip update if we already have this count stored
    const subscription = activeSubscriptions.get(tweetId);
    if (subscription && subscription.lastCount === commentCount) {
      return commentCount;
    }
    
    // Update the tweet with exact count - important to use the direct database count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: commentCount })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
    } else {
      console.log(`Updated tweet ${tweetId} with comment count ${commentCount}`);
      
      // Update the stored count if we have an active subscription
      if (subscription) {
        subscription.lastCount = commentCount;
      }
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
  // Check if we already have an active subscription for this tweet
  if (activeSubscriptions.has(tweetId)) {
    console.log(`Reusing existing comment count subscription for tweet ${tweetId}`);
    
    // Get initial count from existing subscription
    const existingSubscription = activeSubscriptions.get(tweetId)!;
    onCountUpdated(existingSubscription.lastCount);
    
    // Return the cleanup function
    return () => {
      // Don't actually clean up since other components may be using this subscription
      console.log(`Skipping cleanup for shared subscription for tweet ${tweetId}`);
    };
  }
  
  console.log(`Setting up comment count subscription for tweet ${tweetId}`);
  
  let initialCount = 0;
  // Get initial count immediately
  getExactCommentCount(tweetId)
    .then(count => {
      console.log(`Initial comment count for tweet ${tweetId}: ${count}`);
      initialCount = count;
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
    .channel(`broadcast-comments-${tweetId}`)
    .on('broadcast', { event: 'comment-count-update' }, (payload) => {
      if (payload.payload && payload.payload.tweetId === tweetId) {
        console.log(`Received broadcast count update for ${tweetId}: ${payload.payload.count}`);
        onCountUpdated(payload.payload.count);
      }
    })
    .subscribe();
    
  // Store this subscription
  activeSubscriptions.set(tweetId, { 
    dbChannel, 
    broadcastChannel, 
    lastCount: initialCount,
    lastChecked: Date.now()
  });
  
  // Return cleanup function
  return () => {
    console.log(`Removed comment count subscriptions for tweet ${tweetId}`);
    
    // Remove from active subscriptions
    if (activeSubscriptions.has(tweetId)) {
      const subscription = activeSubscriptions.get(tweetId)!;
      supabase.removeChannel(subscription.dbChannel);
      supabase.removeChannel(subscription.broadcastChannel);
      activeSubscriptions.delete(tweetId);
    }
  };
};

/**
 * Check if a tweet has an active comment count subscription
 */
export const hasActiveCommentCountSubscription = (tweetId: string): boolean => {
  return activeSubscriptions.has(tweetId);
};

// Clean up stale subscriptions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  activeSubscriptions.forEach((subscription, tweetId) => {
    // If a subscription is older than 5 minutes, clean it up
    if (now - subscription.lastChecked > FIVE_MINUTES) {
      console.log(`Cleaning up stale subscription for tweet ${tweetId}`);
      supabase.removeChannel(subscription.dbChannel);
      supabase.removeChannel(subscription.broadcastChannel);
      activeSubscriptions.delete(tweetId);
    }
  });
}, 60000); // Check every minute
