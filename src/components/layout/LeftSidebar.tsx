
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Hash, 
  Bell, 
  Mail, 
  User, 
  Bookmark, 
  Settings,
  Compass,
  ChevronRight,
  Zap as ZapIcon,
  MessageSquare as MessageSquareIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useState, useEffect } from 'react';

interface LeftSidebarProps {
  collapsed?: boolean;
}

const LeftSidebar = ({ collapsed = false }: LeftSidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  
  // Update internal state when prop changes
  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Hash, label: 'Explore', path: '/explore' },
    { 
      icon: Bell, 
      label: 'Notifications', 
      path: '/notifications',
      badge: unreadCount > 0 ? unreadCount : null 
    },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];
  
  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    } else if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'TL';
    }
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <aside className={`relative flex flex-col h-screen sticky top-0 ${isCollapsed ? 'min-w-[80px] max-w-[80px]' : 'min-w-[275px] max-w-[275px]'} py-4 bg-black border-r border-gray-800 transition-all duration-300 hidden md:flex`}>
      {/* Toggle Button */}
      <button 
        onClick={toggleCollapse}
        className="absolute -right-3 top-10 bg-gray-800 rounded-full p-1 shadow-lg border border-gray-700 z-10 hover:bg-gray-700 transition-colors"
      >
        <ChevronRight className={`h-4 w-4 text-gray-300 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Logo */}
      <div className={`px-4 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <Link to="/home" className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
            <ZapIcon className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold ml-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">TweetLounge</span>
          )}
        </Link>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all",
                    active 
                      ? "bg-gray-900 text-white" 
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white",
                    isCollapsed ? "justify-center" : ""
                  )}
                >
                  <div className={cn(
                    "relative flex items-center justify-center",
                    active ? "text-white" : ""
                  )}>
                    <item.icon className="h-5 w-5" />
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && <span className="text-base">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Tweet Button */}
      <div className={`px-4 mt-4 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <Button 
          className={`${isCollapsed ? 'w-12 h-12 rounded-full p-0' : 'w-full'} bg-blue-500 hover:bg-blue-600 text-white rounded-full h-12 font-bold shadow-md transition-all`}
        >
          {isCollapsed ? <MessageSquareIcon className="h-5 w-5" /> : "Tweet"}
        </Button>
      </div>
      
      {/* User Profile */}
      {user && (
        <div className={`px-4 mb-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-full hover:bg-gray-800/50 transition-colors`}>
            <Avatar className="h-10 w-10 border-2 border-transparent">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-blue-500/90 text-white font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="font-bold text-sm text-white leading-tight truncate">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  @{profile?.username || user.email?.split('@')[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation - Hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800">
        <div className="flex justify-around items-center p-2">
          {menuItems.slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "p-2 rounded-full flex flex-col items-center justify-center",
                isActive(item.path) ? "text-blue-400" : "text-gray-400"
              )}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.badge && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
