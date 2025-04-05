
import { useState, useEffect, useCallback, useMemo, memo, Suspense, useRef } from 'react';
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
  RefreshCw,
  Trash2,
  Settings,
  Star,
  Clock,
  BookmarkIcon,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  BadgeCheck
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { VisuallyHidden } from '@/radix-ui/react-visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const NotificationIcon = memo(({ type }: { type: NotificationType }) => {
  switch (type) {
    case 'like':
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 shadow-glow-sm shadow-red-500/20">
          <Heart className="h-4 w-4 text-red-500" fill="#ef4444" />
        </div>
      );
    case 'comment':
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 shadow-glow-sm shadow-blue-500/20">
          <MessageSquare className="h-4 w-4 text-blue-500" />
        </div>
      );
    case 'retweet':
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/30 shadow-glow-sm shadow-green-500/20">
          <Repeat className="h-4 w-4 text-green-500" />
        </div>
      );
    case 'follow':
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/30 shadow-glow-sm shadow-purple-500/20">
          <User className="h-4 w-4 text-purple-500" />
        </div>
      );
    case 'mention':
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 shadow-glow-sm shadow-yellow-500/20">
          <AtSign className="h-4 w-4 text-yellow-500" />
        </div>
      );
    default:
      return null;
  }
});

const NotificationText = memo(({ notification }: { notification: Notification }) => {
  const { type, actor, commentId } = notification;
  
  switch (type) {
    case 'like':
      if (commentId) {
        return (
          <div className="flex items-center flex-wrap">
            <span className="font-semibold text-white">{actor.displayName}</span>
            {actor.isVerified && <VerifiedBadge className="ml-1" />}
            <span className="ml-1 text-gray-300">gillade din kommentar</span>
          </div>
        );
      }
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold text-white">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1 text-gray-300">gillade din tweet</span>
        </div>
      );
    case 'comment':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold text-white">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1 text-gray-300">svarade på din tweet</span>
        </div>
      );
    case 'retweet':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold text-white">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1 text-gray-300">retweetade ditt inlägg</span>
        </div>
      );
    case 'follow':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold text-white">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1 text-gray-300">följer dig nu</span>
        </div>
      );
    case 'mention':
      return (
        <div className="flex items-center flex-wrap">
          <span className="font-semibold text-white">{actor.displayName}</span>
          {actor.isVerified && <VerifiedBadge className="ml-1" />}
          <span className="ml-1 text-gray-300">nämnde dig i en tweet</span>
        </div>
      );
    default:
      return <span>Ny notifikation</span>;
  }
});

const NotificationItem = memo(({ 
  notification, 
  onNotificationClick,
  isPriority = false
}: { 
  notification: Notification, 
  onNotificationClick: (notification: Notification) => void,
  isPriority?: boolean
}) => {
  const formattedTime = useMemo(() => 
    formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }), 
    [notification.createdAt]
  );
  
  const tweetPreview = useMemo(() => {
    if (!notification.tweet && !notification.referencedTweet) return null;
    
    const tweet = notification.referencedTweet || notification.tweet;
    if (!tweet) return null;

    return (
      <Card className="mt-2 ml-12 bg-gray-900/60 border-gray-800/70 overflow-hidden backdrop-blur-sm transition-colors hover:bg-gray-900/80">
        <CardContent className="p-3">
          {notification.type === 'comment' && (
            <div className="flex items-center space-x-1 mb-1 text-xs text-gray-400">
              <span>Svar till</span>
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
      className={`relative px-4 py-3 flex items-start gap-3 cursor-pointer transition-all duration-300 ${
        notification.read 
          ? 'bg-black hover:bg-gray-900/50' 
          : isPriority 
            ? 'bg-blue-900/15 hover:bg-blue-900/25 border-l-2 border-blue-500' 
            : 'bg-gray-900/40 hover:bg-gray-800/50'
      }`}
      aria-live={notification.read ? 'off' : 'polite'}
    >
      {!notification.read && !isPriority && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
      )}
      
      <NotificationIcon type={notification.type} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <Avatar className={`h-10 w-10 ${
              isPriority 
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' 
                : 'ring-1 ring-gray-800/50 ring-offset-1 ring-offset-black'
            }`}>
              {notification.actor.avatarUrl ? (
                <AvatarImage src={notification.actor.avatarUrl} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-600/40 to-purple-700/40 text-white font-semibold">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="ml-1 p-1 h-auto rounded-full hover:bg-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-gray-200">
                    <DropdownMenuLabel className="text-xs text-gray-400">Alternativ</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700/50" />
                    <DropdownMenuItem className="text-sm hover:text-white focus:text-white">
                      <Clock className="mr-2 h-4 w-4" /> Dölj för 30 dagar
                    </DropdownMenuItem>
                    {!notification.read ? (
                      <DropdownMenuItem className="text-sm hover:text-white focus:text-white">
                        <CheckCircle className="mr-2 h-4 w-4" /> Markera som läst
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-sm hover:text-white focus:text-white">
                        <BookmarkIcon className="mr-2 h-4 w-4" /> Spara för senare
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-gray-700/50" />
                    <DropdownMenuItem className="text-sm text-red-400 hover:text-red-300 focus:text-red-300">
                      <Trash2 className="mr-2 h-4 w-4" /> Ta bort
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <div className="flex items-center hover:text-blue-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    <span>Svara</span>
                  </div>
                  <div className="flex items-center hover:text-green-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Repeat className="h-3.5 w-3.5 mr-1.5" />
                    <span>Retweet</span>
                  </div>
                  <div className="flex items-center text-red-500 hover:text-red-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
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

const NotificationSkeleton = () => (
  <div className="px-4 py-3 flex items-start gap-3">
    <Skeleton className="h-9 w-9 rounded-full bg-gray-800/40" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <Skeleton className="h-3 w-24 bg-gray-800/40" />
          <Skeleton className="h-3 w-16 bg-gray-800/40 ml-2" />
        </div>
        <Skeleton className="h-3 w-16 bg-gray-800/40" />
      </div>
      <Skeleton className="h-12 w-full bg-gray-800/40 rounded-md" />
    </div>
  </div>
);

const VirtualizedNotificationList = ({ 
  notifications,
  onNotificationClick,
  priorityIds = []
}: { 
  notifications: Notification[],
  onNotificationClick: (notification: Notification) => void,
  priorityIds?: string[]
}) => {
  const itemsToRender = useMemo(() => {
    return notifications.slice(0, 50).map(notification => {
      const isPriority = priorityIds.includes(notification.id);
      return { ...notification, isPriority };
    });
  }, [notifications, priorityIds]);

  const sortedNotifications = useMemo(() => {
    // Sortera så att prioriterade notiser kommer först
    return [...itemsToRender].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return 0;
    });
  }, [itemsToRender]);

  return (
    <div className="divide-y divide-gray-800/50">
      {sortedNotifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onNotificationClick={onNotificationClick}
          isPriority={notification.isPriority}
        />
      ))}
    </div>
  );
};

const InstantLoadingState = () => (
  <div className="flex flex-col space-y-1">
    {Array(5).fill(0).map((_, i) => (
      <NotificationSkeleton key={i} />
    ))}
  </div>
);

const EmptyNotifications = () => (
  <div className="py-12 text-center">
    <div className="mx-auto w-16 h-16 rounded-full bg-gray-800/70 flex items-center justify-center mb-4 border border-gray-700/50 shadow-lg shadow-black/20">
      <Bell className="h-7 w-7 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Inga notiser än</h3>
    <p className="text-gray-400 text-sm max-w-xs mx-auto">
      När någon interagerar med dina tweets eller profil kommer du se det här
    </p>
  </div>
);

const NotificationFilterBar = ({ 
  activeFilter, 
  setActiveFilter,
  unreadCount
}: { 
  activeFilter: string,
  setActiveFilter: (filter: string) => void,
  unreadCount: number
}) => {
  return (
    <div className="flex items-center justify-between mb-2 px-2">
      <div className="relative">
        <div className="relative flex overflow-x-auto hide-scrollbar">
          <Button
            variant={activeFilter === "all" ? "default" : "ghost"}
            size="sm"
            className={`text-sm rounded-full px-3 whitespace-nowrap ${
              activeFilter === "all" 
                ? "bg-white text-black hover:bg-gray-100" 
                : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setActiveFilter("all")}
          >
            Alla
          </Button>
          <Button
            variant={activeFilter === "unread" ? "default" : "ghost"}
            size="sm"
            className={`text-sm rounded-full px-3 ml-1 whitespace-nowrap ${
              activeFilter === "unread" 
                ? "bg-white text-black hover:bg-gray-100" 
                : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setActiveFilter("unread")}
          >
            Olästa
            {unreadCount > 0 && (
              <Badge className="ml-1.5 bg-blue-500 text-xs h-5 min-w-5 flex items-center justify-center">{unreadCount}</Badge>
            )}
          </Button>
          <Button
            variant={activeFilter === "mentions" ? "default" : "ghost"}
            size="sm"
            className={`text-sm rounded-full px-3 ml-1 whitespace-nowrap ${
              activeFilter === "mentions" 
                ? "bg-white text-black hover:bg-gray-100" 
                : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setActiveFilter("mentions")}
          >
            Omnämnanden
          </Button>
          <Button
            variant={activeFilter === "follows" ? "default" : "ghost"}
            size="sm"
            className={`text-sm rounded-full px-3 ml-1 whitespace-nowrap ${
              activeFilter === "follows" 
                ? "bg-white text-black hover:bg-gray-100" 
                : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setActiveFilter("follows")}
          >
            Följare
          </Button>
          <Button
            variant={activeFilter === "likes" ? "default" : "ghost"}
            size="sm"
            className={`text-sm rounded-full px-3 ml-1 whitespace-nowrap ${
              activeFilter === "likes" 
                ? "bg-white text-black hover:bg-gray-100" 
                : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setActiveFilter("likes")}
          >
            Gilla
          </Button>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications,
    unreadCount
  } = useNotifications();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firstLoadRef = useRef(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [priorityNotificationIds, setPriorityNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    // Filtrera notifikationer baserat på aktivt filter
    let filtered = [...notifications];
    
    if (activeFilter === "unread") {
      filtered = filtered.filter(n => !n.read);
    } else if (activeFilter === "mentions") {
      filtered = filtered.filter(n => n.type === "mention");
    } else if (activeFilter === "follows") {
      filtered = filtered.filter(n => n.type === "follow");
    } else if (activeFilter === "likes") {
      filtered = filtered.filter(n => n.type === "like");
    }
    
    setFilteredNotifications(filtered);
    
    if (notifications.length > 0 && firstLoadRef.current) {
      firstLoadRef.current = false;
    }
  }, [notifications, activeFilter]);

  useEffect(() => {
    // Hitta viktiga notifikationer baserat på vissa kriterier
    // T.ex. från verifierade användare eller omnämnanden
    const priority = notifications
      .filter(n => (n.actor.isVerified || n.type === 'mention') && !n.read)
      .map(n => n.id);
    
    setPriorityNotificationIds(priority);
  }, [notifications]);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchNotifications(true);
      toast({
        title: "Uppdaterad",
        description: "Notifikationer uppdaterade",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera notifikationer",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [fetchNotifications, toast]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      toast({
        title: "Klart",
        description: "Alla notifikationer markerade som lästa",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte markera notifikationer som lästa",
        variant: "destructive"
      });
    }
  }, [markAllAsRead, toast]);

  const renderContent = () => {
    if (loading && filteredNotifications.length === 0) {
      return <InstantLoadingState />;
    }
    
    if (!loading && filteredNotifications.length === 0) {
      return <EmptyNotifications />;
    }
    
    return (
      <>
        <VisuallyHidden asChild>
          <h2>Alla notifikationer</h2>
        </VisuallyHidden>
        
        <VirtualizedNotificationList 
          notifications={filteredNotifications}
          onNotificationClick={handleNotificationClick}
          priorityIds={priorityNotificationIds}
        />
      </>
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto flex flex-col h-full">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/90 border-b border-gray-800/70 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Notifikationer
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-blue-500 text-xs">{unreadCount} nya</Badge>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing || loading}
                      className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="sr-only md:not-sr-only md:ml-2">Uppdatera</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Uppdatera notifikationer</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="sr-only md:not-sr-only md:ml-2">Inställningar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Notifikationsinställningar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleMarkAllAsRead}
                      disabled={unreadCount === 0}
                      className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="sr-only md:not-sr-only md:ml-2">Markera alla som lästa</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Markera alla som lästa</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <NotificationFilterBar 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter}
              unreadCount={unreadCount}
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-full"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <Suspense fallback={<InstantLoadingState />}>
            {renderContent()}
          </Suspense>
        </ScrollArea>
      </div>
    </Layout>
  );
};

export default Notifications;
