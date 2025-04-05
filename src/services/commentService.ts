
import { supabase } from "@/lib/supabase";
import { updateTweetInCache } from "@/utils/tweetCacheService";
import { Comment } from "@/types/Comment";

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

/**
 * Get comments by a specific user
 */
export const getUserComments = async (userId: string, limit = 20, offset = 0): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error getting user comments:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const comments: Comment[] = data.map(comment => ({
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      tweet_id: comment.tweet_id,
      parent_comment_id: comment.parent_reply_id,
      created_at: comment.created_at,
      likes_count: comment.likes_count || 0,
      author: {
        username: comment.profiles.username,
        display_name: comment.profiles.display_name,
        avatar_url: comment.profiles.avatar_url || '',
        avatar_nft_id: comment.profiles.avatar_nft_id,
        avatar_nft_chain: comment.profiles.avatar_nft_chain
      }
    }));
    
    return comments;
  } catch (error) {
    console.error('Error getting user comments:', error);
    return [];
  }
};

/**
 * Like a comment
 */
export const likeComment = async (commentId: string, unlike = false): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('User auth error:', userError?.message);
      return false;
    }
    
    if (unlike) {
      // Remove like
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userData.user.id);
      
      if (error) {
        console.error('Error unliking comment:', error);
        return false;
      }
      
      // Decrease like count
      await updateCommentLikesCount(commentId, -1);
    } else {
      // Add like
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userData.user.id
        });
      
      if (error) {
        console.error('Error liking comment:', error);
        return false;
      }
      
      // Increase like count
      await updateCommentLikesCount(commentId, 1);
    }
    
    return true;
  } catch (error) {
    console.error('Error liking/unliking comment:', error);
    return false;
  }
};

/**
 * Check if user has liked a comment
 */
export const checkIfUserLikedComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return false;
    }
    
    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('user_id', userData.user.id);
    
    if (error) {
      console.error('Error checking if comment is liked:', error);
      return false;
    }
    
    return count ? count > 0 : false;
  } catch (error) {
    console.error('Error checking if comment is liked:', error);
    return false;
  }
};

/**
 * Update the likes count for a comment
 */
const updateCommentLikesCount = async (commentId: string, change: number): Promise<boolean> => {
  try {
    // First get the current likes count
    const { data, error: getError } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();
    
    if (getError) {
      console.error('Error getting comment:', getError);
      return false;
    }
    
    const currentCount = data.likes_count || 0;
    const newCount = Math.max(0, currentCount + change);
    
    // Update the likes count
    const { error: updateError } = await supabase
      .from('comments')
      .update({ likes_count: newCount })
      .eq('id', commentId);
    
    if (updateError) {
      console.error('Error updating comment likes count:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating comment likes count:', error);
    return false;
  }
};
