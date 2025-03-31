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
    { icon: TrendingUp, label: 'Market', path: '/market' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', requiresAuth: true, count: messagesCount },
    { icon: Bell, label: 'Notifications', path: '/notifications', requiresAuth: true, count: notificationCount },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks', requiresAuth: true },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-crypto-black">
      {/* Mobile Header */}
      {showHeader && (
        <header className="sticky top-0 z-30 bg-crypto-black border-b border-crypto-gray/30 backdrop-blur-md bg-opacity-90">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center">
              <CryptoButton 
                variant="ghost" 
                size="sm" 
                className="mr-2 text-white p-1"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </CryptoButton>
              <h1 className="text-lg font-display font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center space-x-2">
              {user && (
                <>
                  {notificationCount > 0 && (
                    <CryptoButton 
                      variant="ghost" 
                      size="sm" 
                      className="p-2 rounded-full relative"
                      onClick={() => navigate('/notifications')}
                    >
                      <Bell className="h-5 w-5 text-crypto-lightgray" />
                      <Badge 
                        className="absolute -top-1 -right-1 bg-crypto-blue text-[10px] h-4 min-w-4 flex items-center justify-center p-0 gap-0"
                      >
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Badge>
                    </CryptoButton>
                  )}
                  
                  <CryptoButton 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 rounded-full"
                    onClick={() => navigate('/profile')}
                  >
                    <Avatar className="h-8 w-8 border border-crypto-gray/30">
                      <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                      <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                        {user.email?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </CryptoButton>
                </>
              )}
              
              {!user && (
                <CryptoButton 
                  variant="default"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => navigate('/login')}
                >
                  Login
                </CryptoButton>
              )}
            </div>
          </div>
        </header>
      )}
      
      {/* Ticker for mobile */}
      <div className="w-full">
        <CryptoTicker />
      </div>
      
      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${fullHeight ? 'h-full' : ''}`}>
        <ScrollArea className="h-full">
          {children}
        </ScrollArea>
      </main>
      
      {/* Mobile Navigation */}
      {showBottomNav && (
        <nav className="sticky bottom-0 w-full border-t border-crypto-gray/30 bg-crypto-black backdrop-blur-md bg-opacity-90 z-30">
          <div className="flex items-center justify-around h-16">
            {navigationItems.map((item) => {
              // Skip auth-required items if user not logged in
              if (item.requiresAuth && !user) return null;
              
              return (
                <button
                  key={item.path}
                  className={`flex flex-col items-center justify-center h-full w-full relative ${
                    isActive(item.path) ? 'text-crypto-blue' : 'text-crypto-lightgray'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.count ? (
                    <div className="relative">
                      <item.icon className={`h-5 w-5 ${isActive(item.path) ? 'text-crypto-blue' : 'text-crypto-lightgray'}`} />
                      <Badge 
                        className="absolute -top-2 -right-2 bg-crypto-blue text-[10px] h-4 min-w-4 flex items-center justify-center p-0 gap-0"
                      >
                        {item.count > 99 ? '99+' : item.count}
                      </Badge>
                    </div>
                  ) : (
                    <item.icon className={`h-5 w-5 ${isActive(item.path) ? 'text-crypto-blue' : 'text-crypto-lightgray'}`} />
                  )}
                  <span className="text-xs mt-1">{item.label}</span>
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
              className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-crypto-black border-r border-crypto-gray/30 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-crypto-gray/30">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-crypto-blue mr-2 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <h2 className="font-display font-bold text-xl text-white">TweetLounge</h2>
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
              
              <div className="p-4 border-b border-crypto-gray/30">
                {user ? (
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                      <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                        {user.email?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{user.user_metadata?.username || user.email?.split('@')[0]}</div>
                      <div className="text-xs text-crypto-lightgray truncate max-w-[180px]">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <CryptoButton 
                      variant="default"
                      size="sm"
                      className="w-full"
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
                      className="w-full border-crypto-gray/30"
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
              
              <Tabs defaultValue="menu" className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-2 p-1 m-4 bg-crypto-darkgray/80">
                  <TabsTrigger value="menu" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                    Navigation
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-crypto-blue data-[state=active]:text-white">
                    Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="menu" className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-crypto-lightgray font-semibold pl-2">Main</h3>
                    {navigationItems.map((item) => {
                      // Skip auth-required items if user not logged in
                      if (item.requiresAuth && !user) return null;
                      
                      return (
                        <button
                          key={item.path}
                          className={`flex items-center justify-between w-full p-3 rounded-lg text-left ${
                            isActive(item.path) 
                              ? 'bg-crypto-gray/30 text-white' 
                              : 'hover:bg-crypto-gray/20 text-crypto-lightgray'
                          }`}
                          onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                          
                          {item.count > 0 && (
                            <Badge className="bg-crypto-blue text-white">
                              {item.count > 99 ? '99+' : item.count}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <Separator className="bg-crypto-gray/20" />
                  
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-crypto-lightgray font-semibold pl-2">Account</h3>
                    {user ? (
                      <>
                        <button
                          className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                          onClick={() => {
                            navigate('/profile');
                            setSidebarOpen(false);
                          }}
                        >
                          <User className="h-5 w-5" />
                          <span>Profile</span>
                        </button>
                        <button
                          className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-5 w-5" />
                          <span>Logout</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                          onClick={() => {
                            navigate('/login');
                            setSidebarOpen(false);
                          }}
                        >
                          <LogIn className="h-5 w-5" />
                          <span>Login</span>
                        </button>
                        <button
                          className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                          onClick={() => {
                            navigate('/signup');
                            setSidebarOpen(false);
                          }}
                        >
                          <UserPlus className="h-5 w-5" />
                          <span>Sign Up</span>
                        </button>
                      </>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-crypto-lightgray font-semibold pl-2">Preferences</h3>
                    
                    <button
                      className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                    >
                      <Settings className="h-5 w-5" />
                      <span>App Settings</span>
                    </button>
                    
                    <button
                      className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                      onClick={() => {
                        // Force refresh data
                        window.location.reload();
                      }}
                    >
                      <RefreshCw className="h-5 w-5" />
                      <span>Refresh Data</span>
                    </button>
                  </div>
                  
                  <Separator className="bg-crypto-gray/20" />
                  
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-crypto-lightgray font-semibold pl-2">About</h3>
                    
                    <div className="p-3 rounded-lg bg-crypto-darkgray/50">
                      <h4 className="font-medium text-white mb-1">TweetLounge</h4>
                      <p className="text-xs text-crypto-lightgray mb-2">Your crypto social platform</p>
                      <div className="text-xs text-crypto-lightgray">Version 1.0.0</div>
                    </div>
                    
                    <a 
                      href="https://twitter.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-blue"
                    >
                      <ExternalLink className="h-5 w-5" />
                      <span>Follow us on Twitter</span>
                    </a>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="p-4 border-t border-crypto-gray/30">
                <div className="bg-crypto-blue/10 rounded-lg p-3">
                  <h3 className="font-medium text-white mb-1">TweetLounge</h3>
                  <p className="text-xs text-crypto-lightgray">Follow crypto trends and join the community</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileLayout;
