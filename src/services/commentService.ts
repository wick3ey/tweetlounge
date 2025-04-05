import { supabase } from "@/integrations/supabase/client";
import { Comment } from "@/types/Comment";
import { updateTweetInCache } from "@/utils/tweetCacheService";
import { syncCommentCount } from "@/services/commentCountService";

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
    console.log(`CommentService: Updating tweet ${tweetId} comment count to ${commentCount}`);
    
    // Update the tweet's replies_count with the accurate count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: commentCount })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet comment count:', updateError);
      return commentCount;
    }
    
    console.log(`CommentService: Updated tweet ${tweetId} comment count to ${commentCount} in database`);
    
    // Update the tweet in cache with the new count
    updateTweetInCache(tweetId, (tweet) => ({
      ...tweet,
      replies_count: commentCount
    }));
    
    // Also broadcast an update using consistent channel name
    try {
      await supabase.channel('global-comment-updates').send({
        type: 'broadcast',
        event: 'comment-count-updated',
        payload: { tweetId, count: commentCount }
      });
    } catch (broadcastError) {
      console.error('Error broadcasting comment count update:', broadcastError);
    }
    
    return commentCount;
  } catch (error) {
    console.error('Failed to update tweet comment count:', error);
    return 0;
  }
};

/**
 * Create a new comment
 */
export const createComment = async (
  tweetId: string,
  content: string,
  parentCommentId?: string | null
): Promise<Comment | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      console.error('No authenticated user found when creating comment');
      return null;
    }
    
    // Insert the comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        tweet_id: tweetId,
        user_id: user.user.id,
        parent_reply_id: parentCommentId || null
      })
      .select(`
        *,
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
      return null;
    }
    
    // Update the comment count for the tweet using our dedicated service
    const newCount = await syncCommentCount(tweetId);
    console.log(`Comment created: tweet ${tweetId} now has ${newCount} comments`);
    
    // Update the tweet cache with the new count
    updateTweetInCache(tweetId, (tweet) => ({
      ...tweet,
      replies_count: newCount
    }));
    
    // Format the response to match our Comment type
    const formattedComment: Comment = {
      id: data.id,
      content: data.content,
      user_id: data.user_id,
      tweet_id: data.tweet_id,
      parent_comment_id: data.parent_reply_id,
      created_at: data.created_at,
      likes_count: data.likes_count || 0,
      author: {
        username: data.profiles.username,
        display_name: data.profiles.display_name,
        avatar_url: data.profiles.avatar_url || '',
        avatar_nft_id: data.profiles.avatar_nft_id,
        avatar_nft_chain: data.profiles.avatar_nft_chain
      }
    };
    
    // Broadcast a message to notify clients
    await supabase.channel('comment-count-updates').send({
      type: 'broadcast',
      event: 'comment-created',
      payload: { tweetId, commentId: data.id, commentCount: newCount }
    });
    
    return formattedComment;
  } catch (error) {
    console.error('Failed to create comment:', error);
    return null;
  }
};

/**
 * Check if a user liked a comment
 */
export const checkIfUserLikedComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking if user liked comment:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Failed to check if user liked comment:', error);
    return false;
  }
};

/**
 * Like or unlike a comment
 */
export const likeComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      console.error('No authenticated user found when liking comment');
      return false;
    }
    
    // Check if the user already liked the comment
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing like:', checkError);
      return false;
    }
    
    if (existingLike) {
      // Unlike the comment
      const { error: unlikeError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (unlikeError) {
        console.error('Error unliking comment:', unlikeError);
        return false;
      }
      
      // Decrement the likes count - Fixed RPC function name
      const { error: updateError } = await supabase
        .rpc('decrement_counter', { row_id: commentId });
      
      if (updateError) {
        console.error('Error decrementing likes count:', updateError);
      }
      
      return true;
    } else {
      // Like the comment
      const { error: likeError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.user.id
        });
      
      if (likeError) {
        console.error('Error liking comment:', likeError);
        return false;
      }
      
      // Increment the likes count - Fixed RPC function name
      const { error: updateError } = await supabase
        .rpc('increment_counter', { row_id: commentId });
      
      if (updateError) {
        console.error('Error incrementing likes count:', updateError);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Failed to like/unlike comment:', error);
    return false;
  }
};

/**
 * Get all comments by a user
 */
export const getUserComments = async (userId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        user_id,
        tweet_id,
        parent_reply_id,
        created_at,
        likes_count,
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
      .limit(50);
    
    if (error) {
      console.error('Error fetching user comments:', error);
      return [];
    }
    
    // Format comments to match our Comment type
    const formattedComments: Comment[] = data.map(comment => ({
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
    
    return formattedComments;
  } catch (error) {
    console.error('Failed to fetch user comments:', error);
    return [];
  }
};
