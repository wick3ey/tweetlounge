
import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from '@/types/Notification';

// Create a notification
export async function createNotification(
  userId: string,
  actorId: string,
  type: NotificationType,
  tweetId?: string,
  commentId?: string
) {
  try {
    // Don't create notifications for self-actions
    if (userId === actorId) {
      return null;
    }
    
    // Get the current user to verify permissions
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    // Ensure that the actor ID matches the current user's ID for RLS compliance
    if (currentUser?.id !== actorId) {
      console.error('Permission denied: Cannot create notification with different actor_id than the current user');
      return null;
    }
    
    // Check if a similar notification already exists to prevent duplicates
    // For example, if a user likes and unlikes a post multiple times
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('actor_id', actorId)
      .eq('type', type)
      .is('tweet_id', tweetId ? tweetId : null)
      .is('comment_id', commentId ? commentId : null)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGSQL_ERROR_NO_ROWS_IN_RESULT_SET') {
      console.error('Error checking for existing notification:', checkError);
    }
    
    // If a similar notification exists, return that instead of creating a new one
    if (existingNotification) {
      console.log('Similar notification already exists, skipping creation');
      return existingNotification;
    }
    
    const notification = {
      user_id: userId,
      actor_id: actorId,
      type,
      tweet_id: tweetId,
      comment_id: commentId,
      read: false
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

// Delete a notification (e.g., when unliking a tweet or unfollowing a user)
export async function deleteNotification(
  userId: string,
  actorId: string,
  type: NotificationType,
  tweetId?: string,
  commentId?: string
) {
  try {
    // Get the current user to verify permissions
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    // Ensure that we're either the recipient or the actor for RLS compliance
    if (currentUser?.id !== userId && currentUser?.id !== actorId) {
      console.error('Permission denied: Cannot delete notification that you did not create or receive');
      return false;
    }
    
    const match: any = {
      user_id: userId,
      actor_id: actorId,
      type
    };
    
    if (tweetId) match.tweet_id = tweetId;
    if (commentId) match.comment_id = commentId;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .match(match);
      
    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

// Get unread notification count
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    // Verify that we're checking count for the current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    if (currentUser?.id !== userId) {
      console.error('Permission denied: Cannot get unread count for another user');
      return 0;
    }
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

// Mark specific notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    // First verify that this notification belongs to the current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    if (!currentUser) {
      console.error('User must be logged in to mark notifications as read');
      return false;
    }
    
    // First check if this notification belongs to the current user
    const { data: notificationData, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', currentUser.id)
      .single();
      
    if (fetchError || !notificationData) {
      console.error('Permission denied: Cannot mark notification as read');
      return false;
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', currentUser.id);
      
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    // Verify that we're updating notifications for the current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    
    if (currentUser?.id !== userId) {
      console.error('Permission denied: Cannot mark notifications as read for another user');
      return false;
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return false;
  }
}
