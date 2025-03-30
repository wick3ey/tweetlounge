import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types/Notification';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageSquare, 
  Repeat, 
  User, 
  AtSign,
  CheckCircle,
  Loader2,
  Bell 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';

const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Now we just show all notifications without any filtering
    setFilteredNotifications(notifications);
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate to the relevant content
    if (notification.tweetId) {
      navigate(`/tweet/${notification.tweetId}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor.username}`);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" fill="#ef4444" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'retweet':
        return <Repeat className="h-5 w-5 text-green-500" />;
      case 'follow':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'mention':
        return <AtSign className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const { type, actor, commentId } = notification;
    switch (type) {
      case 'like':
        if (commentId) {
          return <><span className="font-semibold">{actor.displayName}</span> liked your comment</>;
        }
        return <><span className="font-semibold">{actor.displayName}</span> liked your tweet</>;
      case 'comment':
        return <><span className="font-semibold">{actor.displayName}</span> commented on your tweet</>;
      case 'retweet':
        return <><span className="font-semibold">{actor.displayName}</span> retweeted your tweet</>;
      case 'follow':
        return <><span className="font-semibold">{actor.displayName}</span> started following you</>;
      case 'mention':
        return <><span className="font-semibold">{actor.displayName}</span> mentioned you in a tweet</>;
      default:
        return 'New notification';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/80 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Notifications</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark all as read
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-800">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-400">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No notifications yet</h3>
              <p className="text-gray-500 text-sm">
                When someone interacts with your tweets or profile, you'll see it here
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  notification.read ? 'bg-black' : 'bg-gray-900/50'
                } hover:bg-gray-800/30`}
              >
                <div className="flex items-center justify-center w-8 h-8 mt-1 rounded-full bg-gray-800/50">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      {notification.actor.avatarUrl ? (
                        <AvatarImage src={notification.actor.avatarUrl} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-400/30 to-purple-500/30 text-white font-semibold">
                        {notification.actor.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-tight mb-1">
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
