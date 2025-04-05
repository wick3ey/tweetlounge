
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Hash, 
  Bell, 
  Mail, 
  User, 
  BarChart2,
  MessageSquare,
  Settings,
  Compass,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';

const LeftSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  
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
    { icon: BarChart2, label: 'Market', path: '/market' },
    { icon: Compass, label: 'Discover', path: '/discover' },
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
  
  return (
    <div className="hidden md:flex flex-col h-screen sticky top-0 w-72 py-4 bg-gradient-to-b from-black to-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="px-6 mb-6">
        <Link to="/home" className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold ml-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">TweetLounge</span>
        </Link>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all",
                    active 
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white" 
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "relative flex items-center justify-center",
                    active ? "text-blue-400" : ""
                  )}>
                    <item.icon className="h-5 w-5" />
                    {active && (
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full" />
                    )}
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </div>
                    )}
                  </div>
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <div className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Tweet Button */}
      <div className="px-6 mt-4 mb-6">
        <Button 
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl h-12 font-bold shadow-md transition-all duration-300"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          Tweet
        </Button>
      </div>
      
      {/* User Profile */}
      {user && (
        <div className="px-4 mb-4">
          <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-colors duration-300">
            <div className="flex items-center p-3 rounded-lg">
              <Avatar className="h-10 w-10 border-2 border-gray-700 shadow-inner">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Profile" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-400/30 to-purple-500/30 text-white font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 overflow-hidden">
                <p className="font-bold text-sm text-white leading-tight truncate">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  @{profile?.username || user.email?.split('@')[0]}
                </p>
              </div>
            </div>
          </Card>
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
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
