
import React from 'react';
import { Home, Bell, Bookmark, User, Hash, Mail, Settings, Compass, Shield, Search, ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from '@/contexts/ProfileContext';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

const LeftSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: Hash, label: 'Trending', path: '/hashtag/trending' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const sidebarWidth = collapsed ? 'w-[70px]' : 'w-[240px]';

  return (
    <motion.div 
      className={`fixed left-0 top-[60px] h-[calc(100vh-60px)] ${sidebarWidth} bg-black border-r border-gray-800 flex flex-col transition-all duration-300 z-20`}
      initial={false}
      animate={{ width: collapsed ? 70 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="relative">
        <button 
          onClick={toggleSidebar} 
          className="absolute -right-3 top-4 bg-gray-800 rounded-full p-1 border border-gray-700 shadow-md hover:bg-gray-700 transition-colors z-30"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </motion.div>
        </button>
      </div>
      
      <ScrollArea className="flex-grow">
        <nav className="pl-2 pr-1 pt-2">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `
                    flex items-center p-3 rounded-lg transition-all
                    ${isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'}
                  `}
                >
                  <item.icon className={`${collapsed ? 'mx-auto' : 'mr-4'} h-6 w-6`} />
                  {!collapsed && <span className="text-lg">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </ScrollArea>
      
      <div className="mt-auto px-3 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-3 pb-3">
          <Avatar className="h-10 w-10 border border-gray-700 shadow-md">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
              {profile?.username?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && (
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">{profile?.display_name || profile?.username}</p>
              <p className="text-xs text-gray-500 truncate">@{profile?.username}</p>
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          className={`${collapsed ? 'w-10 p-2' : 'w-full'} mb-4 bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300`} 
          onClick={signOut}
        >
          {collapsed ? <Settings className="h-4 w-4" /> : "Logout"}
        </Button>
      </div>
    </motion.div>
  );
};

export default LeftSidebar;
