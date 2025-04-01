import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Notification, NotificationType } from '@/types/Notification';
import { markNotificationAsRead, markAllNotificationsAsRead as markAllRead } from '@/services/notificationService';
import { 
  getCachedNotifications, 
  cacheNotifications, 
  updateCachedNotification,
  addCachedNotification,
  markAllCachedNotificationsAsRead
} from '@/utils/notificationCacheService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Improved fetch function with cache support
  const fetchNotifications = useCallback(async (forceFresh: boolean = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First check cache if not forcing fresh data
      if (!forceFresh) {
        const cachedData = getCachedNotifications(user.id);
        if (cachedData) {
          setNotifications(cachedData);
          setUnreadCount(cachedData.filter(n => !n.read).length);
          setLoading(false);
          
          // Refresh in background to keep data updated
          setTimeout(() => fetchNotificationsFromDB(false), 0);
          return;
        }
      }
      
      // If no cache or forcing fresh, fetch from DB
      await fetchNotificationsFromDB(true);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Even in case of error, try to use cached data if available
      const cachedData = getCachedNotifications(user.id);
      if (cachedData) {
        setNotifications(cachedData);
        setUnreadCount(cachedData.filter(n => !n.read).length);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Database fetch implementation
  const fetchNotificationsFromDB = async (updateUI: boolean = true) => {
    if (!user) return;
    
    try {
      // First, fetch notifications with optimized query
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); // Increased from 50 to show more history

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
      }

      if (notificationsData.length === 0) {
        if (updateUI) {
          setNotifications([]);
          setUnreadCount(0);
        }
        cacheNotifications(user.id, []);
        return;
      }

      // Then fetch profile data for each actor_id
      const actorIds = notificationsData.map(notification => notification.actor_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
        .in('id', actorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of actor_id to profile data for quick lookup
      const profilesMap = profilesData.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {});

      // Get all tweet IDs to fetch their content
      const tweetIds = notificationsData
        .filter(n => n.tweet_id)
        .map(n => n.tweet_id)
        .filter(Boolean);
      
      let tweetsMap = {};
      
      if (tweetIds.length > 0) {
        const { data: tweetsData, error: tweetsError } = await supabase
          .from('tweets')
          .select('id, content, created_at')
          .in('id', tweetIds);
          
        if (!tweetsError && tweetsData) {
          tweetsMap = tweetsData.reduce((map, tweet) => {
            map[tweet.id] = tweet;
            return map;
          }, {});
        }
      }

      // Combine notification data with actor profile data and tweet data
      const formattedNotifications: Notification[] = notificationsData.map((notification) => {
        const actorProfile = profilesMap[notification.actor_id] || {
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null
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

      // Update cache with fresh data
      cacheNotifications(user.id, formattedNotifications);
      
      if (updateUI) {
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications from DB:', error);
      throw error;
    }
  };

  // Mark notification as read with cache update
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user || !notificationId) return;
    
    try {
      // Update cache immediately for responsive UI
      updateCachedNotification(user.id, notificationId, { read: true });
      
      // Update local state
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Then update database (optimistic update)
      const success = await markNotificationAsRead(notificationId);
      
      if (!success) {
        // Revert changes if DB update failed
        console.error('Failed to mark notification as read in database');
        // We keep the optimistic UI update though
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // We keep the optimistic UI update though
    }
  };

  // Mark all notifications as read with cache update
  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    try {
      // Update cache immediately
      markAllCachedNotificationsAsRead(user.id);
      
      // Update local state
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
      
      // Then update database
      const success = await markAllRead(user.id);
      
      if (!success) {
        console.error('Failed to mark all notifications as read in database');
        // We keep the optimistic UI update though
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // We keep the optimistic UI update though
    }
  };

  // Setup real-time subscription with enhanced caching
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch using cache where possible
    fetchNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // When new notification is received, fetch the actor details separately
          try {
            const { data: actorData, error: actorError } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
              .eq('id', payload.new.actor_id)
              .single();

            if (actorError) {
              console.error('Error fetching actor details:', actorError);
              return;
            }
            
            // If notification has a tweet_id, fetch tweet details
            let tweetData = null;
            if (payload.new.tweet_id) {
              const { data, error } = await supabase
                .from('tweets')
                .select('id, content, created_at')
                .eq('id', payload.new.tweet_id)
                .single();
                
              if (!error) {
                tweetData = data;
              }
            }

            const newNotification: Notification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              actorId: payload.new.actor_id,
              type: payload.new.type as NotificationType,
              tweetId: payload.new.tweet_id,
              commentId: payload.new.comment_id,
              createdAt: payload.new.created_at,
              read: payload.new.read,
              actor: {
                username: actorData.username,
                displayName: actorData.display_name,
                avatarUrl: actorData.avatar_url,
                isVerified: !!(actorData.avatar_nft_id && actorData.avatar_nft_chain)
              },
              tweet: tweetData ? {
                id: tweetData.id,
                content: tweetData.content,
                createdAt: tweetData.created_at
              } : undefined
            };

            // Update cache with new notification
            addCachedNotification(user.id, newNotification);
            
            // Add to notifications state
            setNotifications(prev => [newNotification, ...prev]);
            
            // Update unread count
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          } catch (error) {
            console.error('Error processing new notification:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update notifications when read status changes
          if (payload.new && payload.old) {
            const updatedId = payload.new.id;
            const wasRead = payload.old.read;
            const isReadNow = payload.new.read;
            
            if (wasRead !== isReadNow) {
              // Update cache
              updateCachedNotification(user.id, updatedId, { read: isReadNow });
              
              // Update local state
              setNotifications(prev => 
                prev.map(n => n.id === updatedId ? { ...n, read: isReadNow } : n)
              );
              
              // Update unread count
              if (!wasRead && isReadNow) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              } else if (wasRead && !isReadNow) {
                setUnreadCount(prev => prev + 1);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Modified to not show toast notifications
  const showNotificationToast = (notification: Notification) => {
    // No-op: we don't want to show any toast notifications
    return;
  };

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead
  };
}
