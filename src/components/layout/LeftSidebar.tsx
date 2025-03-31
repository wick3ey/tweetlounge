
import React from 'react';
import { Home, Bell, Bookmark, User, Hash, Mail } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProfile } from '@/contexts/ProfileContext';

const LeftSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-60 bg-black border-r border-gray-800 py-4 px-2 flex flex-col">
      <nav className="flex-grow">
        <ul>
          <li>
            <NavLink to="/home" className={`flex items-center p-2 rounded-lg hover:bg-gray-900 transition-colors ${isActive('/home') ? 'font-semibold text-white' : 'text-gray-400'}`}>
              <Home className="mr-2 h-5 w-5" />
              <span>Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/notifications" className={`flex items-center p-2 rounded-lg hover:bg-gray-900 transition-colors ${isActive('/notifications') ? 'font-semibold text-white' : 'text-gray-400'}`}>
              <Bell className="mr-2 h-5 w-5" />
              <span>Notifications</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/bookmarks" className={`flex items-center p-2 rounded-lg hover:bg-gray-900 transition-colors ${isActive('/bookmarks') ? 'font-semibold text-white' : 'text-gray-400'}`}>
              <Bookmark className="mr-2 h-5 w-5" />
              <span>Bookmarks</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={`flex items-center p-2 rounded-lg hover:bg-gray-900 transition-colors ${isActive('/profile') ? 'font-semibold text-white' : 'text-gray-400'}`}>
              <User className="mr-2 h-5 w-5" />
              <span>Profile</span>
            </NavLink>
          </li>
          <li>
            <NavLink to={`/hashtag/trending`} className={`flex items-center p-2 rounded-lg hover:bg-gray-900 transition-colors ${isActive('/hashtag/trending') ? 'font-semibold text-white' : 'text-gray-400'}`}>
              <Hash className="mr-2 h-5 w-5" />
              <span>Trending</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      
      {/* User Info and Logout */}
      <div className="mt-auto pt-4 border-t border-gray-800">
        <div className="pb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username} />
            <AvatarFallback>{profile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-semibold text-white">{profile?.username}</p>
            <p className="text-xs text-gray-500">@{profile?.username}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={signOut}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default LeftSidebar;
