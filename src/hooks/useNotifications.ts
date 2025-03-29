
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Notification } from '@/types/Notification';
import { markNotificationAsRead, markAllNotificationsAsRead as markAllRead } from '@/services/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First, fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
      }

      // Then fetch profile data for each actor_id
      const actorIds = notificationsData.map(notification => notification.actor_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
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

      // Combine notification data with actor profile data
      const formattedNotifications: Notification[] = notificationsData.map((notification) => {
        const actorProfile = profilesMap[notification.actor_id] || {
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null
        };

        return {
          id: notification.id,
          userId: notification.user_id,
          actorId: notification.actor_id,
          type: notification.type,
          tweetId: notification.tweet_id,
          commentId: notification.comment_id,
          createdAt: notification.created_at,
          read: notification.read,
          actor: {
            username: actorProfile.username,
            displayName: actorProfile.display_name,
            avatarUrl: actorProfile.avatar_url
          }
        };
      });

      setNotifications(formattedNotifications);
      
      // Count unread notifications
      const unread = formattedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const success = await markNotificationAsRead(notificationId);

      if (success) {
        // Update local state
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        ));
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    try {
      const success = await markAllRead(user.id);

      if (success) {
        // Update local state
        setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
        setUnreadCount(0);
        
        toast({
          title: 'Success',
          description: 'All notifications marked as read',
        });
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notifications. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Setup real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
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
              .select('username, display_name, avatar_url')
              .eq('id', payload.new.actor_id)
              .single();

            if (actorError) {
              console.error('Error fetching actor details:', actorError);
              return;
            }

            const newNotification: Notification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              actorId: payload.new.actor_id,
              type: payload.new.type,
              tweetId: payload.new.tweet_id,
              commentId: payload.new.comment_id,
              createdAt: payload.new.created_at,
              read: payload.new.read,
              actor: {
                username: actorData.username,
                displayName: actorData.display_name,
                avatarUrl: actorData.avatar_url
              }
            };

            // Add to notifications
            setNotifications(prev => [newNotification, ...prev]);
            
            // Update unread count
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Show toast notification
            showNotificationToast(newNotification);
          } catch (error) {
            console.error('Error processing new notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Show a toast notification for new notifications
  const showNotificationToast = (notification: Notification) => {
    let title = 'New Notification';
    let description = '';
    
    switch (notification.type) {
      case 'like':
        description = `${notification.actor.displayName} liked your tweet`;
        break;
      case 'comment':
        description = `${notification.actor.displayName} commented on your tweet`;
        break;
      case 'retweet':
        description = `${notification.actor.displayName} retweeted your tweet`;
        break;
      case 'follow':
        description = `${notification.actor.displayName} started following you`;
        break;
      default:
        description = 'You have a new notification';
    }
    
    toast({
      title,
      description,
    });
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
