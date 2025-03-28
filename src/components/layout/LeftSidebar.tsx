
import { Link, useLocation } from 'react-router-dom';
import { Home, User, Bell, MessageSquare, BookmarkIcon, ListIcon, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

const LeftSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();

  const menuItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/explore', label: 'Explore', icon: ListIcon },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
    { path: '/profile', label: 'Profile', icon: User },
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

  return (
    <div className="hidden md:flex flex-col h-screen p-4 sticky top-0 w-64">
      <div className="flex items-center mb-6 p-2">
        <Link to="/" className="text-2xl font-bold text-twitter-blue flex items-center">
          <svg 
            viewBox="0 0 24 24" 
            className="h-8 w-8 fill-current"
            aria-hidden="true"
          >
            <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path>
          </svg>
        </Link>
      </div>
      
      <nav className="space-y-4 mb-8">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex items-center p-3 rounded-full hover:bg-gray-200 transition-colors ${
              location.pathname === item.path ? 'font-bold' : ''
            }`}
          >
            <item.icon className="mr-4 h-6 w-6" />
            <span className="text-xl">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <Button className="bg-twitter-blue hover:bg-twitter-blue/90 rounded-full text-white py-6 text-lg w-full mt-4">
        Tweet
      </Button>
      
      <div className="mt-auto mb-4">
        {user && (
          <Link 
            to="/profile" 
            className="flex items-center p-3 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Avatar className="mr-3 h-10 w-10">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-twitter-blue text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="font-semibold">{profile?.display_name || user.email?.split('@')[0]}</p>
              <p className="text-gray-500 text-sm truncate">@{profile?.username || user.email?.split('@')[0]}</p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
