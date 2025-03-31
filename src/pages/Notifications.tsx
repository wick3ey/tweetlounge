import { useState, useEffect, useRef, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
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
  Clock,
  Filter,
  Calendar,
  ChevronDown,
  Pin,
  Trash2,
  X,
  Info
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { VerifiedBadge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const notificationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut"
    }
  }),
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const filterOptions = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'retweets', label: 'Retweets' },
  { value: 'follows', label: 'Followers' },
];

const groupNotificationsByDate = (notifications: Notification[]) => {
  const groups: { [key: string]: Notification[] } = {};
  
  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateKey;
    
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      dateKey = 'This Week';
    } else if (today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) {
      dateKey = 'This Month';
    } else {
      dateKey = 'Earlier';
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(notification);
  });
  
  return groups;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications 
  } = useNotifications();
  
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    
    if (tab === 'mentions') {
      filtered = filtered.filter(n => n.type === 'mention');
    } else if (tab === 'verified') {
      filtered = filtered.filter(n => n.actor.isVerified);
    }
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter !== 'all') {
      const filterTypeMap: { [key: string]: NotificationType[] } = {
        'mentions': ['mention'],
        'likes': ['like'],
        'comments': ['comment'],
        'retweets': ['retweet'],
        'follows': ['follow']
      };
      
      const types = filterTypeMap[filter];
      if (types) {
        filtered = filtered.filter(n => types.includes(n.type));
      }
    }
    
    return filtered;
  }, [notifications, filter, tab]);
  
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);
  
  const handleRefresh = async () => {
    try {
      await fetchNotifications();
      toast({
        title: "Updated",
        description: "Notifications have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      });
    }
  };

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
  
  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
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
          return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} liked your comment</>;
        }
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} liked your tweet</>;
      case 'comment':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} commented on your tweet</>;
      case 'retweet':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} retweeted your tweet</>;
      case 'follow':
        return <><span className="font-semibold">{actor.displayName}</span>{actor.isVerified && <VerifiedBadge className="ml-1" />} started following you</>;
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
      <motion.div 
        className={`mt-2 pl-12 py-2 px-3 bg-gray-900/30 rounded-lg border border-gray-800 ${expanded === notification.id ? 'max-h-none' : 'max-h-24 overflow-hidden'}`}
        animate={{ height: expanded === notification.id ? 'auto' : 'auto' }}
        transition={{ duration: 0.3 }}
      >
        {notification.type === 'comment' && (
          <div className="flex items-center space-x-1 mb-1 text-xs text-gray-500">
            <span>Say to</span>
            <span className="text-blue-400">{notification.actor.displayName}</span>
          </div>
        )}
        <div className="text-white text-sm border-l-0 pl-0">
          {tweet.content}
          {expanded !== notification.id && tweet.content.length > 100 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(notification.id);
              }}
              className="ml-1 text-blue-400 hover:text-blue-300 text-xs"
            >
              show more
            </button>
          )}
        </div>
        {expanded === notification.id && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{format(new Date(tweet.createdAt), 'd MMM, HH:mm')}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(notification.id);
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              show less
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const renderEmptyState = () => (
    <div className="py-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <Bell className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Notifications</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        When someone interacts with your tweets or profile, it will show up here
      </p>
      <Button 
        variant="outline" 
        className="mt-6 border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
        onClick={handleRefresh}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Refresh
      </Button>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto" ref={contentRef}>
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/90 border-b border-gray-800">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold flex items-center">
                <Bell className="h-5 w-5 mr-2 text-blue-400" />
                Notifications
                {filteredNotifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {filteredNotifications.filter(n => !n.read).length} new
                  </span>
                )}
              </h1>
              
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRefresh}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <Loader2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Refresh Notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={markAllAsRead}
                        className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        disabled={!filteredNotifications.some(n => !n.read)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark All as Read
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Mark All Notifications as Read</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 bg-gray-900 border-gray-800 text-gray-300"
                  >
                    {filterOptions.map((option) => (
                      <DropdownMenuItem 
                        key={option.value}
                        className={`flex items-center cursor-pointer ${filter === option.value ? 'bg-blue-500/20 text-blue-400' : ''}`}
                        onClick={() => setFilter(option.value)}
                      >
                        {filter === option.value && (
                          <CheckCircle className="h-4 w-4 mr-2 text-blue-400" />
                        )}
                        <span className={filter === option.value ? "ml-2" : "ml-6"}>{option.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <Tabs 
              defaultValue="all" 
              value={tab} 
              onValueChange={setTab}
              className="w-full"
            >
              <TabsList className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-1">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="mentions" 
                  className="flex-1 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"
                >
                  Mentions
                </TabsTrigger>
                <TabsTrigger 
                  value="verified" 
                  className="flex-1 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"
                >
                  Verified
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center p-12"
              >
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-400 text-lg">Loading Notifications...</span>
              </motion.div>
            ) : filteredNotifications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderEmptyState()}
              </motion.div>
            ) : (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <VisuallyHidden asChild>
                  <h2>All Notifications</h2>
                </VisuallyHidden>
                
                {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
                  <div key={dateGroup} className="mb-4">
                    <div className="sticky top-[108px] z-[5] backdrop-blur-md bg-black/80 px-4 py-2 border-b border-gray-800/50">
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-400">{dateGroup}</h3>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-800/70">
                      <AnimatePresence>
                        {groupNotifications.map((notification, index) => (
                          <motion.div 
                            key={notification.id}
                            custom={index}
                            variants={notificationVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 hover:bg-gray-800/30 transition-colors relative ${
                              notification.read ? 'bg-black' : 'bg-gray-900/50'
                            }`}
                            aria-live={notification.read ? 'off' : 'polite'}
                          >
                            {!notification.read && (
                              <motion.div 
                                className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                                layoutId={`indicator-${notification.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                            
                            <div className="flex">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/50 mr-3 flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 mr-3">
                                    <Avatar className="h-10 w-10 border border-gray-700">
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
                                        <p className="text-white text-sm">
                                          {getNotificationText(notification)}
                                        </p>
                                        
                                        {!notification.read && (
                                          <div className="h-2 w-2 rounded-full bg-blue-500 ml-2"></div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center text-gray-500">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                <span className="text-xs">
                                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">
                                              <p>{format(new Date(notification.createdAt), 'PPP, HH:mm')}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 ml-2 rounded-full hover:bg-gray-800"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent 
                                            align="end" 
                                            className="w-48 bg-gray-900 border-gray-800"
                                          >
                                            {!notification.read ? (
                                              <DropdownMenuItem 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  markAsRead(notification.id);
                                                }}
                                                className="text-blue-400 hover:text-blue-300 cursor-pointer"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Mark as Read
                                              </DropdownMenuItem>
                                            ) : (
                                              <DropdownMenuItem 
                                                className="text-gray-400 hover:text-gray-300 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Pin className="h-4 w-4 mr-2" />
                                                Pin to Top
                                              </DropdownMenuItem>
                                            )}
                                            
                                            <DropdownMenuSeparator />
                                            
                                            <DropdownMenuItem 
                                              className="text-red-400 hover:text-red-300 cursor-pointer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                    
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
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
                
                <div className="py-6 flex justify-center">
                  <Card className="max-w-md bg-gray-900/30 border-gray-800">
                    <CardContent className="p-4 flex items-center">
                      <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                      <p className="text-sm text-gray-400">
                        You can see all your notifications. We save notifications from the last 30 days.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
