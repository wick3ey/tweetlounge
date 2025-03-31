
import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Menu, Home, TrendingUp, Bell, Bookmark, User, Search } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import CryptoTicker from '@/components/crypto/CryptoTicker';
import { useAuth } from '@/contexts/AuthContext';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  if (!isMobile) {
    return <>{children}</>;
  }
  
  const navigationItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: TrendingUp, label: 'Market', path: '/market' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Bell, label: 'Notifications', path: '/notifications', requiresAuth: true },
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
            <div className="flex items-center space-x-1">
              {user && (
                <CryptoButton 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 rounded-full"
                  onClick={() => navigate('/profile')}
                >
                  <User className="h-5 w-5 text-crypto-blue" />
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
                  className={`flex flex-col items-center justify-center h-full w-full ${
                    isActive(item.path) ? 'text-crypto-blue' : 'text-crypto-lightgray'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className={`h-5 w-5 ${isActive(item.path) ? 'text-crypto-blue' : 'text-crypto-lightgray'}`} />
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
              animate={{ opacity: 0.5 }}
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
                <h2 className="font-display font-bold text-xl text-white">TweetLounge</h2>
                <CryptoButton 
                  variant="ghost" 
                  size="sm" 
                  className="text-white p-1" 
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </CryptoButton>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-crypto-lightgray font-semibold pl-2">Main</h3>
                    {navigationItems.map((item) => (
                      <button
                        key={item.path}
                        className={`flex items-center space-x-3 w-full p-3 rounded-lg text-left ${
                          isActive(item.path) 
                            ? 'bg-crypto-gray/30 text-white' 
                            : 'hover:bg-crypto-gray/20 text-crypto-lightgray'
                        }`}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  
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
                          onClick={() => {
                            // Handle logout
                            setSidebarOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                          </svg>
                          <span>Login</span>
                        </button>
                        <button
                          className="flex items-center space-x-3 w-full p-3 rounded-lg text-left hover:bg-crypto-gray/20 text-crypto-lightgray"
                          onClick={() => {
                            navigate('/signup');
                            setSidebarOpen(false);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                          <span>Sign Up</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
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
