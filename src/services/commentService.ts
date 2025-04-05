
import { supabase } from "@/integrations/supabase/client";
import { Comment } from "@/types/Comment";

// Fix the error in the commentService.ts file
// The error occurs because we're trying to access properties directly on an array
// We need to access the first element of the array if it exists

// Check if author is an array and get the first element
export const formatCommentAuthor = (comment: Comment) => {
  if (Array.isArray(comment.author)) {
    comment.author = {
      username: comment.author[0]?.username || '',
      display_name: comment.author[0]?.display_name || '',
      avatar_url: comment.author[0]?.avatar_url || '',
      avatar_nft_id: comment.author[0]?.avatar_nft_id || null,
      avatar_nft_chain: comment.author[0]?.avatar_nft_chain || null
    };
  }
  return comment;
};

/**
 * Create a new comment on a tweet
 */
export const createComment = async (
  tweetId: string, 
  content: string, 
  parentCommentId?: string
): Promise<Comment | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError?.message);
      return null;
    }
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        tweet_id: tweetId,
        user_id: userData.user.id,
        parent_reply_id: parentCommentId || null
      })
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
      .single();
      
    if (error) {
      console.error('Error creating comment:', error.message);
      return null;
    }
    
    // Update the tweet's comment count
    await updateTweetCommentCount(tweetId);
    
    // Format and return the comment
    const comment: Comment = {
      id: data.id,
      content: data.content,
      user_id: data.user_id,
      tweet_id: data.tweet_id,
      parent_comment_id: data.parent_reply_id,
      created_at: data.created_at,
      likes_count: 0,
      author: {
        username: data.profiles.username,
        display_name: data.profiles.display_name,
        avatar_url: data.profiles.avatar_url || '',
        avatar_nft_id: data.profiles.avatar_nft_id,
        avatar_nft_chain: data.profiles.avatar_nft_chain
      }
    };
    
    return formatCommentAuthor(comment);
  } catch (error) {
    console.error('Error in createComment:', error);
    return null;
  }
};

/**
 * Update the comment count for a tweet in the database
 */
export const updateTweetCommentCount = async (tweetId: string): Promise<number> => {
  try {
    // Count all comments for the tweet
    const { count, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);
      
    if (error) {
      console.error('Error counting comments:', error.message);
      return 0;
    }
    
    // Update the tweet with the count
    const { error: updateError } = await supabase
      .from('tweets')
      .update({ replies_count: count || 0 })
      .eq('id', tweetId);
      
    if (updateError) {
      console.error('Error updating tweet replies count:', updateError.message);
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in updateTweetCommentCount:', error);
    return 0;
  }
};

/**
 * Like a comment
 */
export const likeComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError?.message);
      return false;
    }
    
    // Check if user already liked the comment
    const isLiked = await checkIfUserLikedComment(commentId);
    
    if (isLiked) {
      // If comment is already liked, unlike it
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('comment_id', commentId);
        
      if (error) {
        console.error('Error unliking comment:', error.message);
        return false;
      }
      
      // First get the current like count
      const { data: commentData, error: fetchError } = await supabase
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .single();
      
      if (fetchError || commentData === null) {
        console.error('Error fetching comment like count:', fetchError?.message);
        return false;
      }
      
      // Decrement the count manually
      const newCount = Math.max(0, (commentData.likes_count || 1) - 1);
      
      // Then update with the new count
      const { error: updateError } = await supabase
        .from('comments')
        .update({ likes_count: newCount })
        .eq('id', commentId);
      
      if (updateError) {
        console.error('Error updating comment like count:', updateError.message);
        return false;
      }
    } else {
      // Like the comment
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          user_id: userData.user.id,
          comment_id: commentId
        });
        
      if (error) {
        console.error('Error liking comment:', error.message);
        return false;
      }
      
      // First get the current like count
      const { data: commentData, error: fetchError } = await supabase
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .single();
      
      if (fetchError || commentData === null) {
        console.error('Error fetching comment like count:', fetchError?.message);
        return false;
      }
      
      // Increment the count manually
      const newCount = (commentData.likes_count || 0) + 1;
      
      // Then update with the new count
      const { error: updateError } = await supabase
        .from('comments')
        .update({ likes_count: newCount })
        .eq('id', commentId);
      
      if (updateError) {
        console.error('Error updating comment like count:', updateError.message);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in likeComment:', error);
    return false;
  }
};

/**
 * Check if current user liked a comment
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
      .eq('user_id', userData.user.id)
      .eq('comment_id', commentId);
      
    if (error) {
      console.error('Error checking like status:', error.message);
      return false;
    }
    
    return count ? count > 0 : false;
  } catch (error) {
    console.error('Error in checkIfUserLikedComment:', error);
    return false;
  }
};

/**
 * Get comments made by a specific user
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
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user comments:', error.message);
      return [];
    }
    
    const comments: Comment[] = data.map((item: any) => ({
      id: item.id,
      content: item.content,
      user_id: item.user_id,
      tweet_id: item.tweet_id,
      parent_comment_id: item.parent_reply_id,
      created_at: item.created_at,
      likes_count: item.likes_count || 0,
      author: {
        username: item.profiles.username,
        display_name: item.profiles.display_name,
        avatar_url: item.profiles.avatar_url || '',
        avatar_nft_id: item.profiles.avatar_nft_id,
        avatar_nft_chain: item.profiles.avatar_nft_chain
      }
    }));
    
    return comments.map(formatCommentAuthor);
  } catch (error) {
    console.error('Error in getUserComments:', error);
    return [];
  }
};
