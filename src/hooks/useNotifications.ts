import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification, NotificationType } from '@/types/Notification';
import { markNotificationAsRead, markAllNotificationsAsRead as markAllRead, getNotifications } from '@/services/notificationService';
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
  
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!user || hasInitializedRef.current) return;
    
    const cachedData = getCachedNotifications(user.id);
    if (cachedData) {
      setNotifications(cachedData);
      setUnreadCount(cachedData.filter(n => !n.read).length);
      setLoading(false);
      
      setTimeout(() => fetchNotificationsFromDB(false), 0);
    }
    
    hasInitializedRef.current = true;
  }, [user]);

  const fetchNotifications = useCallback(async (forceFresh: boolean = false) => {
    if (!user || isFetchingRef.current) return;
    
    try {
      const shouldShowLoading = notifications.length === 0;
      if (shouldShowLoading) {
        setLoading(true);
      }
      
      isFetchingRef.current = true;
      
      if (!forceFresh) {
        const cachedData = getCachedNotifications(user.id);
        if (cachedData) {
          setNotifications(cachedData);
          setUnreadCount(cachedData.filter(n => !n.read).length);
          
          setTimeout(() => fetchNotificationsFromDB(false), 10);
          return;
        }
      }
      
      await fetchNotificationsFromDB(true);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      const cachedData = getCachedNotifications(user.id);
      if (cachedData) {
        setNotifications(cachedData);
        setUnreadCount(cachedData.filter(n => !n.read).length);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, notifications.length]);

  const fetchNotificationsFromDB = async (updateUI: boolean = true) => {
    if (!user) return;
    
    try {
      const notificationsData = await getNotifications(user.id);
      
      if (updateUI) {
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(n => !n.read).length);
      }
      
      return notificationsData;
    } catch (error) {
      console.error('Failed to fetch notifications from DB:', error);
      throw error;
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user || !notificationId) return;
    
    try {
      updateCachedNotification(user.id, notificationId, { read: true });
      
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      const success = await markNotificationAsRead(notificationId);
      
      if (!success) {
        console.error('Failed to mark notification as read in database');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    try {
      markAllCachedNotificationsAsRead(user.id);
      
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
      
      const success = await markAllRead(user.id);
      
      if (!success) {
        console.error('Failed to mark all notifications as read in database');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    
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
          try {
            const [actorResponse, tweetResponse] = await Promise.all([
              supabase
                .from('profiles')
                .select('username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
                .eq('id', payload.new.actor_id)
                .single(),
                
              payload.new.tweet_id ? 
                supabase
                  .from('tweets')
                  .select('id, content, created_at')
                  .eq('id', payload.new.tweet_id)
                  .single() : 
                Promise.resolve({ data: null, error: null })
            ]);

            if (actorResponse.error) {
              console.error('Error fetching actor details:', actorResponse.error);
              return;
            }
            
            const actorData = actorResponse.data;
            const tweetData = tweetResponse.data;

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

            addCachedNotification(user.id, newNotification);
            
            setNotifications(prev => [newNotification, ...prev]);
            
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
          if (payload.new && payload.old) {
            const updatedId = payload.new.id;
            const wasRead = payload.old.read;
            const isReadNow = payload.new.read;
            
            if (wasRead !== isReadNow) {
              updateCachedNotification(user.id, updatedId, { read: isReadNow });
              
              setNotifications(prev => 
                prev.map(n => n.id === updatedId ? { ...n, read: isReadNow } : n)
              );
              
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

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead
  };
}
