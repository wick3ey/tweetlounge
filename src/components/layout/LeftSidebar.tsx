
import React from 'react';
import { Home, Bell, Bookmark, User, Hash, Mail, Settings, Compass, Search } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from '@/contexts/ProfileContext';
import { motion } from 'framer-motion';

const LeftSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: Hash, label: 'Trending', path: '/hashtag/trending' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <motion.div 
      className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-64 bg-black border-r border-gray-800 flex flex-col z-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-grow overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          </div>
          <span className="ml-3 text-xl font-bold text-white">TweetLounge</span>
        </div>
        
        <nav className="mt-2">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `
                    flex items-center p-3 rounded-full transition-all hover:bg-gray-800/70
                    ${isActive ? 'font-bold text-white' : 'text-gray-400'}
                  `}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  <span className="text-lg">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border border-gray-700">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              {profile?.username?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          
          <div className="truncate">
            <p className="text-sm font-semibold text-white truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-xs text-gray-500 truncate">@{profile?.username}</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full bg-transparent border-gray-700 hover:bg-gray-800 text-white" 
          onClick={signOut}
        >
          Logout
        </Button>
      </div>
    </motion.div>
  );
};

export default LeftSidebar;
