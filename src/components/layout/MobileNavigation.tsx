
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Bell, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

const MobileNavigation = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { 
      icon: Bell, 
      label: 'Notif.',
      path: '/notifications',
      badge: unreadCount > 0 ? unreadCount : null
    },
    { icon: Bookmark, label: 'Saved', path: '/bookmarks' },
    { icon: User, label: 'Profile', path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2",
                isActive ? "text-primary" : "text-gray-400"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-6 w-6 transition-all",
                  isActive ? "scale-110 opacity-100" : "opacity-70"
                )} />
                {item.badge && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium transition-all",
                isActive ? "opacity-100" : "opacity-70"
              )}>{item.label}</span>
              {isActive && (
                <div className="absolute top-0 h-1 w-8 bg-primary rounded-full animate-fade-in" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavigation;
