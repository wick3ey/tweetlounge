
import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Check, 
  Trash2, 
  Filter, 
  Bell, 
  RefreshCw 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { NotificationType } from '@/types/Notification';

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    markAsRead,
    markAllAsRead, 
    fetchNotifications,
    loading
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  // Function to get notification title based on type
  const getNotificationTitle = (type: NotificationType, actorName: string): string => {
    switch (type) {
      case 'like':
        return `${actorName} liked your post`;
      case 'comment':
        return `${actorName} commented on your post`;
      case 'retweet':
        return `${actorName} retweeted your post`;
      case 'follow':
        return `${actorName} started following you`;
      case 'mention':
        return `${actorName} mentioned you`;
      default:
        return 'New notification';
    }
  };

  // Function to get notification description
  const getNotificationDescription = (notification: any): string => {
    if (notification.tweet?.content) {
      // Truncate tweet content if it's too long
      return notification.tweet.content.length > 100 
        ? `${notification.tweet.content.substring(0, 100)}...` 
        : notification.tweet.content;
    }
    return '';
  };

  return (
    <div className="container mx-auto p-4 bg-black text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Bell className="mr-2" /> Notifications
        </h1>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => fetchNotifications()}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Notifications</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>
                Unread Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="destructive" 
            onClick={() => markAllAsRead()}
          >
            <Check className="mr-2 h-4 w-4" /> Mark All Read
          </Button>
        </div>
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No notifications to display
        </div>
      )}

      <div className="space-y-4">
        {filteredNotifications.map(notification => (
          <div 
            key={notification.id} 
            className={`
              flex items-start p-4 rounded-lg 
              ${notification.read ? 'bg-gray-900' : 'bg-blue-900/20 border border-blue-500'}
            `}
          >
            <div className="flex-grow">
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {getNotificationTitle(notification.type, notification.actor.displayName)}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                {getNotificationDescription(notification)}
              </p>
            </div>
            <div className="ml-4 flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Read</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
