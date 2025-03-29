
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Bookmark, 
  MessageSquare,
  MoreHorizontal, 
  Zap, 
  BarChart2,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

const LeftSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Hash, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: BarChart2, label: 'Analytics', path: '/analytics' },
    { icon: User, label: 'Profile', path: '/profile' },
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
    <div className="hidden md:flex flex-col h-screen sticky top-0 w-16 xl:w-64 p-2 xl:p-4">
      <div className="p-2 xl:p-3 mb-2">
        <Link to="/home" className="flex items-center justify-center xl:justify-start">
          <div className="bg-crypto-blue/10 rounded-full w-10 h-10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-crypto-blue" />
          </div>
          <span className="hidden xl:block text-xl font-bold ml-3">TweetLounge</span>
        </Link>
      </div>
      
      <nav className="space-y-1 mb-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-center xl:justify-start p-2 xl:p-3 rounded-full xl:rounded-full text-lg hover:bg-gray-900 transition-colors ${
              location.pathname === item.path
                ? 'font-bold'
                : 'text-gray-400'
            }`}
          >
            <item.icon className="h-6 w-6" />
            <span className="hidden xl:block ml-4">{item.label}</span>
          </Link>
        ))}
        
        <button className="flex items-center justify-center xl:justify-start p-2 xl:p-3 rounded-full xl:rounded-full text-lg hover:bg-gray-900 transition-colors text-gray-400 w-full">
          <MoreHorizontal className="h-6 w-6" />
          <span className="hidden xl:block ml-4">More</span>
        </button>
      </nav>
      
      <Button 
        className="mt-2 bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full h-12 w-12 xl:h-auto xl:w-full p-0 xl:p-3 shadow-sm hover:shadow-md transition-all"
      >
        <span className="hidden xl:block font-bold">Tweet</span>
        <MessageSquare className="xl:hidden h-6 w-6" />
      </Button>
      
      <div className="mt-auto">
        {user && (
          <div className="flex items-center justify-center xl:justify-between p-2 xl:p-3 rounded-full hover:bg-gray-900 transition-colors">
            <div className="flex items-center">
              <Avatar className="h-10 w-10">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="Profile" />
                ) : null}
                <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:block ml-3">
                <p className="font-bold text-sm leading-tight">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
                <p className="text-gray-500 text-sm">
                  @{profile?.username || user.email?.split('@')[0]}
                </p>
              </div>
            </div>
            <MoreHorizontal className="hidden xl:block h-5 w-5 text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
