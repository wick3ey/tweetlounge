
import { supabase } from "@/lib/supabase";
import { updateTweetInCache } from "@/utils/tweetCacheService";

/**
 * Count comments for a tweet
 */
export const countTweetComments = async (tweetId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
    
    if (error) {
      console.error('Error counting comments:', error.message);
      return 0;
    }
    
    return count || 0;
  } catch (err) {
    console.error('Failed to count comments:', err);
    return 0;
  }
};

/**
 * Update the comment count for a tweet in the database
 */
export const updateTweetCommentCount = async (tweetId: string): Promise<number> => {
  try {
    // Get exact count directly from database
    const count = await countTweetComments(tweetId);
    
    // Update the tweet record with the latest count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: count })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
    } else {
      console.log(`Updated tweet ${tweetId} with comment count ${count}`);
      
      // Update in cache immediately for consistent UI
      updateTweetInCache(tweetId, (tweet) => ({
        ...tweet,
        replies_count: count
      }));
      
      // Also broadcast the updated count via Supabase's realtime
      broadcastCommentCount(tweetId, count);
    }
    
    return count;
  } catch (error) {
    console.error('Error updating comment count:', error);
    return 0;
  }
};

/**
 * Broadcast the comment count update to all clients
 */
export const broadcastCommentCount = async (tweetId: string, count: number): Promise<void> => {
  try {
    await supabase.channel('custom-all-channel').send({
      type: 'broadcast',
      event: 'comment-count-updated',
      payload: { 
        tweetId, 
        commentCount: count,
        timestamp: Date.now()
      }
    });
    console.log(`Broadcast comment count update for ${tweetId}: ${count}`);
  } catch (error) {
    console.error('Error broadcasting comment count:', error);
  }
};

/**
 * Create a new comment on a tweet
 */
export const createComment = async (
  tweetId: string,
  content: string,
  parentReplyId?: string
): Promise<any> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('User auth error:', userError?.message);
      throw new Error('Authentication required');
    }
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        tweet_id: tweetId,
        content,
        user_id: userData.user.id,
        parent_reply_id: parentReplyId || null
      })
      .select(`
        id, 
        content, 
        tweet_id, 
        parent_reply_id, 
        created_at, 
        likes_count, 
        user_id, 
        profiles:user_id (
          username, 
          display_name, 
          avatar_url,
          avatar_nft_id,
          avatar_nft_chain
        )
      `)
      .single();
      
    if (error) {
      console.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
    
    // Update the comment count
    await updateTweetCommentCount(tweetId);
    
    // Send a broadcast notification
    await supabase.channel('custom-all-channel').send({
      type: 'broadcast',
      event: 'comment-created',
      payload: { 
        tweetId, 
        commentId: data.id,
        userId: userData.user.id
      }
    });
    
    return data;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};
