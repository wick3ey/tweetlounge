
import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Menu, Home, TrendingUp, Bell, Bookmark, User, MessageCircle, Settings, 
         Search, LogOut, LogIn, UserPlus, RefreshCw, ExternalLink } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import CryptoTicker from '@/components/crypto/CryptoTicker';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type MobileLayoutProps = {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  fullHeight?: boolean;
};

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children,
  title = 'TweetLounge',
  showHeader = true,
  showBottomNav = true,
  fullHeight = true,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  useEffect(() => {
    // When the sidebar is open, prevent body scrolling
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [sidebarOpen]);
  
  useEffect(() => {
    // Check for any notifications
    if (user) {
      const fetchCounts = async () => {
        try {
          // Get unread notifications count
          const { data: notifData, error: notifError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('read', false);
            
          if (!notifError && notifData) {
            setNotificationCount(notifData.length);
          }
          
          // Get unread messages count
          const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .select('id')
            .eq('recipient_id', user.id)
            .eq('read', false);
            
          if (!msgError && msgData) {
            setMessagesCount(msgData.length);
          }
        } catch (error) {
          console.error('Error fetching notification counts:', error);
        }
      };
      
      fetchCounts();
      
      // Set up realtime listeners for new notifications and messages
      const notificationsChannel = supabase
        .channel('mobile-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          setNotificationCount(prev => prev + 1);
        })
        .subscribe();
        
      const messagesChannel = supabase
        .channel('mobile-messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        }, () => {
          setMessagesCount(prev => prev + 1);
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user]);
  
  if (!isMobile) {
    return <>{children}</>;
  }
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSidebarOpen(false);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      navigate('/home');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const navigationItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/search' },
    { icon: TrendingUp, label: 'Market', path: '/market' },
    { icon: Bell, label: 'Notifications', path: '/notifications', requiresAuth: true, count: notificationCount },
    { icon: MessageCircle, label: 'Messages', path: '/messages', requiresAuth: true, count: messagesCount },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white">
      {/* Mobile Header - Twitter X style */}
      {showHeader && (
        <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center">
              {user ? (
                <Avatar 
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => setSidebarOpen(true)}
                >
                  <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-500">
                    {user.email?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <CryptoButton 
                  variant="ghost" 
                  size="sm" 
                  className="text-white p-1"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </CryptoButton>
              )}
            </div>
            
            {/* Center logo - Twitter X style */}
            <div className="flex justify-center items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="2" y1="2" x2="22" y2="22"></line>
                <line x1="22" y1="2" x2="2" y2="22"></line>
              </svg>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && notificationCount > 0 ? (
                <div className="relative">
                  <Bell className="h-6 w-6 text-white cursor-pointer" onClick={() => navigate('/notifications')} />
                  <Badge 
                    className="absolute -top-1 -right-1 bg-blue-500 text-[10px] h-4 min-w-4 flex items-center justify-center p-0 gap-0"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                </div>
              ) : (
                <CryptoButton 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 text-white"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-5 w-5" />
                </CryptoButton>
              )}
            </div>
          </div>

          {/* Twitter-style tabs */}
          {title === 'TweetLounge' && (
            <div className="flex border-b border-gray-800">
              <button className="flex-1 py-3 relative font-bold">
                For you
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>
              </button>
              <button className="flex-1 py-3 text-gray-500">
                Following
              </button>
            </div>
          )}

          {title === 'Notifications' && (
            <div className="flex border-b border-gray-800">
              <button className="flex-1 py-3 relative font-bold">
                All
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full"></div>
              </button>
              <button className="flex-1 py-3 text-gray-500">
                Mentions
              </button>
              <button className="flex-1 py-3 text-gray-500">
                Verified
              </button>
            </div>
          )}
        </header>
      )}
      
      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${fullHeight ? 'h-full' : ''} bg-black`}>
        <ScrollArea className="h-full">
          {children}
        </ScrollArea>
      </main>
      
      {/* Twitter X-style Mobile Navigation */}
      {showBottomNav && (
        <nav className="sticky bottom-0 w-full border-t border-gray-800 bg-black z-30">
          <div className="flex items-center justify-between px-5 h-14">
            {navigationItems.map((item) => {
              // Skip auth-required items if user not logged in
              if (item.requiresAuth && !user) return null;
              
              return (
                <button
                  key={item.path}
                  className="relative flex items-center justify-center"
                  onClick={() => navigate(item.path)}
                >
                  {item.count ? (
                    <div className="relative">
                      <item.icon className={`h-6 w-6 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`} />
                      <Badge 
                        className="absolute -top-1.5 -right-1.5 bg-blue-500 text-[10px] h-4 min-w-4 flex items-center justify-center p-0 gap-0"
                      >
                        {item.count > 99 ? '99+' : item.count}
                      </Badge>
                    </div>
                  ) : (
                    <item.icon className={`h-6 w-6 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-black border-r border-gray-800 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500 mr-2 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <line x1="2" y1="2" x2="22" y2="22"></line>
                      <line x1="22" y1="2" x2="2" y2="22"></line>
                    </svg>
                  </div>
                  <h2 className="font-bold text-xl text-white">TweetLounge</h2>
                </div>
                <CryptoButton 
                  variant="ghost" 
                  size="sm" 
                  className="text-white p-1" 
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </CryptoButton>
              </div>
              
              <div className="p-4 border-b border-gray-800">
                {user ? (
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                      <AvatarFallback className="bg-blue-500/20 text-blue-500">
                        {user.email?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-white">{user.user_metadata?.username || user.email?.split('@')[0]}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]">@{user.user_metadata?.username || user.email?.split('@')[0]}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <CryptoButton 
                      variant="default"
                      size="sm"
                      className="w-full bg-white text-black hover:bg-gray-200"
                      onClick={() => {
                        navigate('/login');
                        setSidebarOpen(false);
                      }}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </CryptoButton>
                    <CryptoButton 
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-800 text-white"
                      onClick={() => {
                        navigate('/signup');
                        setSidebarOpen(false);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </CryptoButton>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  {navigationItems.map((item) => {
                    // Skip auth-required items if user not logged in
                    if (item.requiresAuth && !user) return null;
                    
                    return (
                      <button
                        key={item.path}
                        className={`flex items-center justify-between w-full p-3 rounded-full text-left ${
                          isActive(item.path) 
                            ? 'font-bold text-white' 
                            : 'text-gray-400'
                        }`}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <item.icon className="h-6 w-6" />
                          <span className="text-xl">{item.label}</span>
                        </div>
                        
                        {item.count > 0 && (
                          <Badge className="bg-blue-500 text-white">
                            {item.count > 99 ? '99+' : item.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                  
                  <button
                    className="flex items-center space-x-4 w-full p-3 rounded-full text-left text-gray-400"
                    onClick={() => {
                      navigate('/bookmarks');
                      setSidebarOpen(false);
                    }}
                  >
                    <Bookmark className="h-6 w-6" />
                    <span className="text-xl">Bookmarks</span>
                  </button>
                  
                  <button
                    className="flex items-center space-x-4 w-full p-3 rounded-full text-left text-gray-400"
                    onClick={() => {
                      navigate('/profile');
                      setSidebarOpen(false);
                    }}
                  >
                    <User className="h-6 w-6" />
                    <span className="text-xl">Profile</span>
                  </button>
                </div>
                
                <Separator className="bg-gray-800 my-3" />
                
                {user && (
                  <button
                    className="flex items-center space-x-4 w-full p-3 rounded-full text-left text-white font-bold"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="text-xl">Logout</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Fixed blue action button - Twitter style */}
      <button 
        className="fixed right-5 bottom-16 w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg z-20"
        onClick={() => navigate('/compose')}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};

export default MobileLayout;
