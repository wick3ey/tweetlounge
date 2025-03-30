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
    if (!currentUser || currentUser.id !== actorId) {
      console.error('Permission denied: Cannot create notification with different actor_id than the current user');
      return null;
    }
    
    // Use the database function to create the notification (bypasses RLS)
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_actor_id: currentUser.id,
      p_type: type,
      p_tweet_id: tweetId || null,
      p_comment_id: commentId || null
    });
    
    if (error) {
      console.error('Error creating notification via RPC:', error);
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
    if (!currentUser || (currentUser.id !== userId && currentUser.id !== actorId)) {
      console.error('Permission denied: Cannot delete notification that you did not create or receive');
      return false;
    }
    
    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('actor_id', actorId)
      .eq('type', type);
    
    // Apply conditional filters correctly using is for null checks
    if (tweetId) {
      query = query.eq('tweet_id', tweetId);
    } else {
      query = query.is('tweet_id', null);
    }
    
    if (commentId) {
      query = query.eq('comment_id', commentId);
    } else {
      query = query.is('comment_id', null);
    }
      
    const { error } = await query;
      
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
    
    if (!currentUser || currentUser.id !== userId) {
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
    // Get current user to verify permissions
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
    
    if (!currentUser || currentUser.id !== userId) {
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
