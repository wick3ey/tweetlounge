import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/layout/MobileLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Heart, Repeat2, Bell, User, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Notification, NotificationType } from '@/types/Notification';

const MobileNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Mark notifications as read when this page is visited
      updateNotificationsReadStatus();
    }
  }, [user]);
  
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          content,
          created_at,
          read,
          sender:sender_id (id, username, display_name, avatar_url),
          tweet:tweet_id (id, content)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Transform the data to match our Notification interface
      const formattedNotifications: Notification[] = (data || []).map((notif: any) => ({
        id: notif.id,
        type: notif.type as NotificationType,
        content: notif.content,
        created_at: notif.created_at,
        read: notif.read,
        actor: notif.sender ? {
          id: notif.sender.id,
          username: notif.sender.username,
          displayName: notif.sender.display_name,
          avatarUrl: notif.sender.avatar_url
        } : undefined,
        tweet: notif.tweet ? {
          id: notif.tweet.id,
          content: notif.tweet.content
        } : undefined
      }));
      
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateNotificationsReadStatus = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error updating notification read status:', error);
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'recently';
    }
  };
  
  // For mobile display only
  if (!isMobile) {
    return null;
  }
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'reply':
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'retweet':
        return <Repeat2 className="h-4 w-4 text-green-500" />;
      case 'mention':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <MobileLayout title="Notifications" showHeader={true} showBottomNav={true}>
      <div className="flex flex-col min-h-full bg-black">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : notifications.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="divide-y divide-gray-800">
              {/* Featured accounts to follow */}
              <div className="p-3 flex overflow-x-auto space-x-4 scrollbar-none">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center min-w-[60px]">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-blue-500">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${i + 10}`} />
                        <AvatarFallback className="bg-blue-500/20">CZ</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-1 -right-1 bg-blue-500 p-0 min-w-0 h-5 w-5 flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </Badge>
                    </div>
                    <span className="text-xs mt-2 text-gray-400 whitespace-nowrap">@cryptouser{i}</span>
                  </div>
                ))}
              </div>
              
              {/* Notifications list */}
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-900/30">
                  <div className="flex">
                    <div className="mr-3 mt-1">
                      {notification.type === 'system' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={notification.actor?.avatarUrl} />
                          <AvatarFallback className="bg-blue-500/20">
                            {notification.actor?.username.substring(0, 2).toUpperCase() || 'TX'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start">
                        <div className="mr-2">{getNotificationIcon(notification.type)}</div>
                        <div>
                          {notification.actor && (
                            <span className="font-bold text-white">
                              {notification.actor.displayName || notification.actor.username}
                            </span>
                          )}
                          <span className="text-gray-300"> {notification.content}</span>
                          
                          {notification.tweet && (
                            <p className="text-gray-500 mt-1 line-clamp-2">{notification.tweet.content}</p>
                          )}
                          
                          <div className="text-gray-500 text-xs mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Bell className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No notifications yet</h3>
            <p className="text-gray-500">
              When someone interacts with your tweets or follows you, you'll see it here.
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileNotifications;
