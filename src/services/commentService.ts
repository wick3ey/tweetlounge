import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types/Comment';
import { createNotification, deleteNotification } from './notificationService';

export async function getUserComments(userId: string, limit = 20, offset = 0): Promise<Comment[]> {
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
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error fetching user comments:', error);
      throw error;
    }
    
    if (!data) return [];
    
    const formattedComments: Comment[] = data.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      tweet_id: comment.tweet_id,
      parent_comment_id: comment.parent_reply_id,
      created_at: comment.created_at,
      likes_count: comment.likes_count,
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
}

export async function createComment(tweetId: string, content: string, parentCommentId?: string): Promise<Comment | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to comment');
    }
    
    const commentData = {
      content,
      user_id: user.id,
      tweet_id: tweetId,
      parent_reply_id: parentCommentId || null
    };
    
    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
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
      console.error('Error creating comment:', error);
      throw error;
    }

    if (!parentCommentId) {
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select('author_id')
        .eq('id', tweetId)
        .single();
        
      if (!tweetError && tweetData) {
        await createNotification(
          tweetData.author_id,
          user.id,
          'comment',
          tweetId,
          data.id
        );
      }
    } else {
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();
        
      if (!commentError && commentData) {
        await createNotification(
          commentData.user_id,
          user.id,
          'comment',
          tweetId,
          data.id
        );
      }
    }
    
    const comment: Comment = {
      id: data.id,
      content: data.content,
      user_id: data.user_id,
      tweet_id: data.tweet_id,
      parent_comment_id: data.parent_reply_id,
      created_at: data.created_at,
      likes_count: data.likes_count,
      author: {
        username: data.profiles.username,
        display_name: data.profiles.display_name,
        avatar_url: data.profiles.avatar_url || '',
        avatar_nft_id: data.profiles.avatar_nft_id,
        avatar_nft_chain: data.profiles.avatar_nft_chain
      }
    };
    
    return comment;
  } catch (error) {
    console.error('Comment creation failed:', error);
    return null;
  }
}

export async function getCommentReplies(commentId: string): Promise<Comment[]> {
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
      .eq('parent_reply_id', commentId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching comment replies:', error);
      throw error;
    }
    
    if (!data) return [];
    
    const formattedReplies: Comment[] = data.map((reply: any) => ({
      id: reply.id,
      content: reply.content,
      user_id: reply.user_id,
      tweet_id: reply.tweet_id,
      parent_comment_id: reply.parent_reply_id,
      created_at: reply.created_at,
      likes_count: reply.likes_count,
      author: {
        username: reply.profiles.username,
        display_name: reply.profiles.display_name,
        avatar_url: reply.profiles.avatar_url || '',
        avatar_nft_id: reply.profiles.avatar_nft_id,
        avatar_nft_chain: reply.profiles.avatar_nft_chain
      }
    }));
    
    return formattedReplies;
  } catch (error) {
    console.error('Failed to fetch comment replies:', error);
    return [];
  }
}

export async function likeComment(commentId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User must be logged in to like a comment');
    }
    
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking comment like:', checkError);
      return false;
    }
    
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('user_id, tweet_id')
      .eq('id', commentId)
      .single();
      
    if (commentError) {
      console.error('Error fetching comment data:', commentError);
      return false;
    }
    
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (deleteError) {
        console.error('Error removing comment like:', deleteError);
        return false;
      }
      
      const { error: updateError } = await supabase
        .from('comments')
        .update({ 
          likes_count: supabase.rpc('decrement_counter', { row_id: commentId }) 
        })
        .eq('id', commentId);
      
      if (updateError) {
        console.error('Error updating comment likes count:', updateError);
        return false;
      }
      
      await deleteNotification(
        commentData.user_id,
        user.id,
        'like',
        commentData.tweet_id,
        commentId
      );
      
      return true;
    }
    
    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id
      });
    
    if (insertError) {
      console.error('Error adding comment like:', insertError);
      return false;
    }
    
    const { error: updateError } = await supabase
      .from('comments')
      .update({ 
        likes_count: supabase.rpc('increment_counter', { row_id: commentId }) 
      })
      .eq('id', commentId);
    
    if (updateError) {
      console.error('Error updating comment likes count:', updateError);
      return false;
    }
    
    await createNotification(
      commentData.user_id,
      user.id,
      'like',
      commentData.tweet_id,
      commentId
    );
    
    return true;
  } catch (error) {
    console.error('Comment like operation failed:', error);
    return false;
  }
}

export async function checkIfUserLikedComment(commentId: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
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
}
