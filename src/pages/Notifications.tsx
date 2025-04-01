
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  MoreHorizontal,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { VerifiedBadge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

// Memo-ized notification icon component for performance
const NotificationIcon = memo(({ type }: { type: NotificationType }) => {
  switch (type) {
    case 'like':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30">
          <Heart className="h-4 w-4 text-red-500" fill="#ef4444" />
        </div>
      );
    case 'comment':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30">
          <MessageSquare className="h-4 w-4 text-blue-500" />
        </div>
      );
    case 'retweet':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/30">
          <Repeat className="h-4 w-4 text-green-500" />
        </div>
      );
    case 'follow':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/30">
          <User className="h-4 w-4 text-purple-500" />
        </div>
      );
    case 'mention':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/30">
          <AtSign className="h-4 w-4 text-yellow-500" />
        </div>
      );
    default:
      return null;
  }
});

// Optimized notification text component
const NotificationText = memo(({ notification }: { notification: Notification }) => {
  const { type, actor, commentId } = notification;
  
  switch (type) {
    case 'like':
      if (commentId) {
        return (
          <div className="flex items-center flex-wrap">
            <span className="font-semibold">{actor.displayName}</span>
            {actor.isVerified && <VerifiedBadge className="ml-1" />}
            <span className="ml-1">liked your reply</span>
          </div>
        );
      }
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1">liked your tweet</span>
        </div>
      );
    case 'comment':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1">replied to your tweet</span>
        </div>
      );
    case 'retweet':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1">reposted your tweet</span>
        </div>
      );
    case 'follow':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1">followed you</span>
        </div>
      );
    case 'mention':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1">mentioned you in a tweet</span>
        </div>
      );
    default:
      return <span>New notification</span>;
  }
});

// Individual notification item component
const NotificationItem = memo(({ 
  notification, 
  onNotificationClick 
}: { 
  notification: Notification, 
  onNotificationClick: (notification: Notification) => void
}) => {
  // Pre-format timestamp to avoid recalculation on every render
  const formattedTime = useMemo(() => 
    formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }), 
    [notification.createdAt]
  );
  
  // Memoize the tweet preview
  const tweetPreview = useMemo(() => {
    if (!notification.tweet && !notification.referencedTweet) return null;
    
    const tweet = notification.referencedTweet || notification.tweet;
    if (!tweet) return null;

    return (
      <Card className="mt-2 ml-12 bg-gray-900/30 border-gray-800/60 overflow-hidden">
        <CardContent className="p-3">
          {notification.type === 'comment' && (
            <div className="flex items-center space-x-1 mb-1 text-xs text-gray-400">
              <span>Replying to</span>
              <span className="text-blue-400">@{notification.actor.username}</span>
            </div>
          )}
          <div className="text-white text-sm line-clamp-3">
            {tweet.content}
          </div>
        </CardContent>
      </Card>
    );
  }, [notification.tweet, notification.referencedTweet, notification.type, notification.actor.username]);
  
  return (
    <div 
      onClick={() => onNotificationClick(notification)}
      className={`relative px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
        notification.read ? 'bg-black hover:bg-gray-900/40' : 'bg-gray-900/40 hover:bg-gray-800/50'
      }`}
      aria-live={notification.read ? 'off' : 'polite'}
    >
      {!notification.read && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
      )}
      
      <NotificationIcon type={notification.type} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-offset-black ring-gray-800/50">
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
              <NotificationText notification={notification} />
              
              <div className="flex items-center text-gray-500 ml-2">
                <span className="text-xs whitespace-nowrap">
                  {formattedTime}
                </span>
                <button className="ml-1 p-1 rounded-full hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {notification.type !== 'follow' && (
              <div className="text-gray-500 text-xs mt-1">
                <span className="text-gray-400">@{notification.actor.username}</span>
              </div>
            )}
            
            {tweetPreview}
            
            {notification.type === 'like' && notification.tweet && (
              <div className="mt-2 flex items-center text-gray-500 text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    <span>Reply</span>
                  </div>
                  <div className="flex items-center">
                    <Repeat className="h-3.5 w-3.5 mr-1.5" />
                    <span>Repost</span>
                  </div>
                  <div className="flex items-center text-red-500">
                    <Heart className="h-3.5 w-3.5 mr-1.5 fill-current" />
                    <span>1</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Empty state component
const EmptyNotifications = () => (
  <div className="py-12 text-center">
    <div className="mx-auto w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4 border border-gray-700/50 shadow-lg shadow-black/20">
      <Bell className="h-7 w-7 text-gray-500" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">No notifications yet</h3>
    <p className="text-gray-500 text-sm max-w-xs mx-auto">
      When someone interacts with your tweets or profile, you'll see it here
    </p>
  </div>
);

// Loading state component
const LoadingState = () => (
  <div className="flex justify-center items-center p-12">
    <div className="relative">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <div className="absolute inset-0 rounded-full animate-pulse bg-blue-500/10"></div>
    </div>
    <span className="ml-3 text-gray-400 font-medium">Loading notifications...</span>
  </div>
);

// Main notifications component with optimized rendering
const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications
  } = useNotifications();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update filtered notifications when the main notifications change
  useEffect(() => {
    setFilteredNotifications(notifications);
  }, [notifications]);

  // Optimized notification click handler
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.tweetId) {
      navigate(`/tweet/${notification.tweetId}`);
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor.username}`);
    }
  }, [markAsRead, navigate]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchNotifications(true); // Force fresh data
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchNotifications]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto flex flex-col h-full">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/90 border-b border-gray-800/70 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Notifications</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
              >
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Mark all as read</span>
              </Button>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-800/50">
            {loading ? (
              <LoadingState />
            ) : filteredNotifications.length === 0 ? (
              <EmptyNotifications />
            ) : (
              <>
                <VisuallyHidden asChild>
                  <h2>All Notifications</h2>
                </VisuallyHidden>
                {filteredNotifications.map(notification => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onNotificationClick={handleNotificationClick}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </Layout>
  );
};

export default Notifications;
