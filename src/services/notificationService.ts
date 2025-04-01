
import { supabase } from '@/integrations/supabase/client';
import { NotificationType, Notification } from '@/types/Notification';
import { getCachedNotifications, cacheNotifications } from '@/utils/notificationCacheService';
import { CACHE_DURATIONS } from '@/utils/cacheService';

// In-memory query deduplication
const pendingQueries = new Map<string, Promise<any>>();

/**
 * Get notifications with advanced caching, deduplication and parallelization
 * @param userId User ID 
 * @returns Notifications or empty array
 */
export async function getNotifications(userId: string) {
  if (!userId) return [];
  
  // Create unique key for this query
  const queryKey = `get-notifications-${userId}`;
  
  // Check if this query is already in progress - prevents duplicate fetches
  if (pendingQueries.has(queryKey)) {
    console.log('Reusing in-flight notification query');
    return pendingQueries.get(queryKey);
  }
  
  // Create and store the promise
  const queryPromise = (async () => {
    try {
      // First fetch notifications with optimized query
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        return [];
      }

      if (notificationsData.length === 0) {
        return [];
      }

      // Parallel fetching for maximum speed
      const [profilesResponse, tweetsResponse] = await Promise.all([
        // Fetch profiles
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
          .in('id', notificationsData.map(n => n.actor_id)),
          
        // Fetch tweet data (if there are any tweet IDs)
        notificationsData.some(n => n.tweet_id) 
          ? supabase
              .from('tweets')
              .select('id, content, created_at')
              .in('id', notificationsData.filter(n => n.tweet_id).map(n => n.tweet_id))
          : Promise.resolve({ data: [], error: null })
      ]);
      
      if (profilesResponse.error) {
        console.error('Error fetching profiles:', profilesResponse.error);
        return [];
      }

      // Create lookup maps for fast data access (O(1) complexity)
      const profilesMap = Object.fromEntries(
        (profilesResponse.data || []).map(profile => [profile.id, profile])
      );
      
      const tweetsMap = Object.fromEntries(
        (tweetsResponse.data || []).map(tweet => [tweet.id, tweet])
      );

      // Convert to final format with O(n) complexity
      const formattedNotifications: Notification[] = notificationsData.map(notification => {
        const actorProfile = profilesMap[notification.actor_id] || {
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null,
          avatar_nft_id: null,
          avatar_nft_chain: null
        };
        
        const tweetData = notification.tweet_id ? tweetsMap[notification.tweet_id] : null;

        return {
          id: notification.id,
          userId: notification.user_id,
          actorId: notification.actor_id,
          type: notification.type as NotificationType,
          tweetId: notification.tweet_id,
          commentId: notification.comment_id,
          createdAt: notification.created_at,
          read: notification.read,
          actor: {
            username: actorProfile.username,
            displayName: actorProfile.display_name,
            avatarUrl: actorProfile.avatar_url,
            isVerified: !!(actorProfile.avatar_nft_id && actorProfile.avatar_nft_chain)
          },
          tweet: tweetData ? {
            id: tweetData.id,
            content: tweetData.content,
            createdAt: tweetData.created_at
          } : undefined
        };
      });
      
      // Cache for future requests - use long duration for notifications
      cacheNotifications(userId, formattedNotifications, CACHE_DURATIONS.LONG);
      
      return formattedNotifications;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    } finally {
      // Remove from pending queries after completion
      pendingQueries.delete(queryKey);
    }
  })();
  
  pendingQueries.set(queryKey, queryPromise);
  return queryPromise;
}

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

// Delete functionality is preserved but should only be used in exceptional cases
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
    // Try to get from cache first (microsecond response)
    const cached = getCachedNotifications(userId);
    if (cached) {
      return cached.filter(n => !n.read).length;
    }
    
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
    
    // Only update the read status, never delete
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
    
    // Only update the read status, don't remove any notifications
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
