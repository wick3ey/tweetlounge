
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
  Bell,
  MoreHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { VerifiedBadge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
    setFilteredNotifications(notifications);
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
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
          return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} liked your reply</>;
        }
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} liked your tweet</>;
      case 'comment':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} replied to your tweet</>;
      case 'retweet':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} reposted your tweet</>;
      case 'follow':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} followed you</>;
      case 'mention':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} mentioned you in a tweet</>;
      default:
        return 'New notification';
    }
  };

  const renderTweetPreview = (notification: Notification) => {
    if (!notification.tweet && !notification.referencedTweet) return null;
    
    const tweet = notification.referencedTweet || notification.tweet;
    if (!tweet) return null;

    return (
      <div className="mt-2 pl-12">
        <div className="text-gray-500 text-sm">
          {notification.type === 'comment' && (
            <div className="flex items-center space-x-1 mb-1 text-xs">
              <span>Replying to</span>
              <span className="text-blue-400">{notification.actor.displayName}</span>
            </div>
          )}
          <div className="text-white text-sm border-l-0 pl-0">
            {tweet.content}
          </div>
        </div>
      </div>
    );
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
            <>
              <VisuallyHidden asChild>
                <h2>All Notifications</h2>
              </VisuallyHidden>
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                    notification.read ? 'bg-black' : 'bg-gray-900/50'
                  } hover:bg-gray-800/30`}
                  aria-live={notification.read ? 'off' : 'polite'}
                >
                  <div className="flex items-center justify-center w-8 h-8 mt-1 rounded-full bg-gray-800/50">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        <Avatar className="h-10 w-10">
                          {notification.actor.avatarUrl ? (
                            <AvatarImage src={notification.actor.avatarUrl} />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-blue-400/30 to-purple-500/30 text-white font-semibold">
                            {notification.actor.displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-white text-sm font-medium">
                              {getNotificationText(notification)}
                            </p>
                            
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 ml-2"></div>
                            )}
                          </div>
                          
                          <div className="flex items-center text-gray-500">
                            <span className="text-xs ml-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            <button className="ml-2 p-1 rounded-full hover:bg-gray-800">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {notification.type !== 'follow' && (
                          <div className="text-gray-500 text-sm mt-1">
                            {/* Removed @username display */}
                          </div>
                        )}
                        
                        {renderTweetPreview(notification)}
                        
                        {notification.type === 'like' && notification.tweet && (
                          <div className="mt-3 flex items-center text-gray-500 text-xs">
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            <Repeat className="h-3.5 w-3.5 mx-2" />
                            <Heart className="h-3.5 w-3.5 mx-2 text-red-500 fill-current" />
                            <span className="text-red-500">1</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
