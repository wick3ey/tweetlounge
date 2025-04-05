
import { supabase } from "@/integrations/supabase/client";

const COMMENT_COUNT_CHANNEL = 'comment-count-updates';
// Keep track of active subscriptions to prevent duplicates
const activeSubscriptions = new Map<string, { 
  dbChannel: any, 
  broadcastChannel: any, 
  lastCount: number,
  lastChecked: number,
  refCount: number
}>();

// In-memory cache for comment counts
const commentCountCache = new Map<string, {
  count: number,
  timestamp: number,
  expiryTime: number
}>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Get the exact number of comments for a tweet directly from the database
 */
export const getExactCommentCount = async (tweetId: string): Promise<number> => {
  try {
    // Check cache first
    const now = Date.now();
    const cachedData = commentCountCache.get(tweetId);
    
    if (cachedData && now < cachedData.expiryTime) {
      console.log(`Using cached comment count for tweet ${tweetId}: ${cachedData.count}`);
      return cachedData.count;
    }
    
    const { count, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }
    
    const commentCount = typeof count === 'number' ? count : 0;
    
    // Cache the result
    commentCountCache.set(tweetId, {
      count: commentCount,
      timestamp: now,
      expiryTime: now + CACHE_EXPIRY
    });
    
    return commentCount;
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
        subscription.lastChecked = Date.now();
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
    
    // Get existing subscription and increment reference count
    const existingSubscription = activeSubscriptions.get(tweetId)!;
    existingSubscription.refCount++;
    existingSubscription.lastChecked = Date.now();
    
    // Get initial count from existing subscription
    onCountUpdated(existingSubscription.lastCount);
    
    // Return the cleanup function
    return () => {
      // Decrement reference count, only cleanup when no more references
      const currentSub = activeSubscriptions.get(tweetId);
      if (currentSub) {
        currentSub.refCount--;
        console.log(`Decremented ref count for ${tweetId} subscription to ${currentSub.refCount}`);
        
        if (currentSub.refCount <= 0) {
          console.log(`Cleaning up subscription for tweet ${tweetId} as ref count is 0`);
          supabase.removeChannel(currentSub.dbChannel);
          supabase.removeChannel(currentSub.broadcastChannel);
          activeSubscriptions.delete(tweetId);
        }
      }
    };
  }
  
  console.log(`Setting up comment count subscription for tweet ${tweetId}`);
  
  let initialCount = 0;
  // Get initial count immediately, with cache prioritization
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
      // Invalidate cache on change
      commentCountCache.delete(tweetId);
      
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
        
        // Update cache with new value
        const now = Date.now();
        commentCountCache.set(tweetId, {
          count: payload.payload.count,
          timestamp: now,
          expiryTime: now + CACHE_EXPIRY
        });
        
        onCountUpdated(payload.payload.count);
      }
    })
    .subscribe();
    
  // Store this subscription
  activeSubscriptions.set(tweetId, { 
    dbChannel, 
    broadcastChannel, 
    lastCount: initialCount,
    lastChecked: Date.now(),
    refCount: 1
  });
  
  // Return cleanup function
  return () => {
    const subscription = activeSubscriptions.get(tweetId);
    if (subscription) {
      subscription.refCount--;
      console.log(`Decremented ref count for ${tweetId} subscription to ${subscription.refCount}`);
      
      if (subscription.refCount <= 0) {
        console.log(`Removed comment count subscriptions for tweet ${tweetId}`);
        supabase.removeChannel(subscription.dbChannel);
        supabase.removeChannel(subscription.broadcastChannel);
        activeSubscriptions.delete(tweetId);
      }
    }
  };
};

/**
 * Check if a tweet has an active comment count subscription
 */
export const hasActiveCommentCountSubscription = (tweetId: string): boolean => {
  return activeSubscriptions.has(tweetId);
};

// Clean up stale subscriptions every minute
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  activeSubscriptions.forEach((subscription, tweetId) => {
    // If a subscription is older than 5 minutes and not actively used, clean it up
    if (now - subscription.lastChecked > FIVE_MINUTES && subscription.refCount <= 0) {
      console.log(`Cleaning up stale subscription for tweet ${tweetId}`);
      supabase.removeChannel(subscription.dbChannel);
      supabase.removeChannel(subscription.broadcastChannel);
      activeSubscriptions.delete(tweetId);
    } else if (now - subscription.lastChecked > FIVE_MINUTES) {
      // If it's old but still has refs, just update the timestamp to keep it alive
      subscription.lastChecked = now;
    }
  });
  
  // Clean up expired cache entries
  commentCountCache.forEach((value, key) => {
    if (now > value.expiryTime) {
      commentCountCache.delete(key);
    }
  });
}, 60000); // Check every minute

/**
 * Log all active subscriptions - useful for debugging
 */
export const debugLogActiveSubscriptions = () => {
  console.log(`[DEBUG] Active comment count subscriptions: ${activeSubscriptions.size}`);
  activeSubscriptions.forEach((sub, tweetId) => {
    console.log(`[DEBUG] - ${tweetId}: refCount=${sub.refCount}, lastCount=${sub.lastCount}, age=${(Date.now() - sub.lastChecked) / 1000}s`);
  });
  
  console.log(`[DEBUG] Comment count cache entries: ${commentCountCache.size}`);
  commentCountCache.forEach((cached, tweetId) => {
    console.log(`[DEBUG] - ${tweetId}: count=${cached.count}, age=${(Date.now() - cached.timestamp) / 1000}s, expires in ${(cached.expiryTime - Date.now()) / 1000}s`);
  });
};
