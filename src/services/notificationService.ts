
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

// Delete a notification (e.g., when unliking a tweet)
export async function deleteNotification(
  userId: string,
  actorId: string,
  type: NotificationType,
  tweetId?: string
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .match({
        user_id: userId,
        actor_id: actorId,
        type,
        tweet_id: tweetId
      });
      
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
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
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
