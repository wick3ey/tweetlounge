
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Bell, MessageSquare, BookmarkIcon, ListIcon, MoreHorizontal, Activity, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LeftSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const menuItems = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/explore', label: 'Explore', icon: Activity },
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

  const handleMenuItemClick = (path: string) => {
    if (path === '/profile' && profile?.username) {
      navigate(`/profile/${profile.username}`);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname.includes('/profile');
    }
    return location.pathname === path;
  };

  return (
    <div className="hidden md:flex flex-col h-screen py-2 px-1 sticky top-0 w-16 xl:w-56 border-r border-border/50">
      <div className="flex items-center justify-center xl:justify-start mb-4 p-2">
        <Link to="/home" className="text-2xl font-display font-bold text-primary flex items-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
        </Link>
      </div>
      
      <nav className="space-y-1 mb-6">
        <TooltipProvider>
          {menuItems.map((item) => (
            <Tooltip key={item.path} delayDuration={300}>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => handleMenuItemClick(item.path)}
                  className={`flex items-center justify-center xl:justify-start p-2 rounded-full xl:rounded-lg hover:bg-primary/10 transition-colors w-full text-left ${
                    isActive(item.path) 
                      ? 'font-medium text-primary bg-primary/5'
                      : 'text-foreground/80'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive(item.path) ? 'text-primary' : ''}`} />
                  <span className="hidden xl:block ml-3 text-base">{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="xl:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      
      <Button 
        className="web3-button py-2 rounded-full flex items-center justify-center xl:justify-start w-full mt-2 shadow-glow-sm hover:shadow-glow-md"
      >
        <Zap className="h-5 w-5 xl:mr-2" />
        <span className="hidden xl:inline">Tweet</span>
      </Button>
      
      <div className="mt-auto mb-2">
        {user && (
          <button 
            onClick={() => profile?.username ? navigate(`/profile/${profile.username}`) : navigate('/profile')}
            className="flex items-center justify-center xl:justify-start p-2 rounded-full hover:bg-primary/10 transition-colors w-full text-left"
          >
            <Avatar className="h-8 w-8 border border-border hover-glow">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block ml-2 flex-1 truncate">
              <p className="font-semibold text-foreground text-sm">{profile?.display_name || user.email?.split('@')[0]}</p>
              <p className="text-muted-foreground text-xs truncate">@{profile?.username || user.email?.split('@')[0]}</p>
            </div>
            <MoreHorizontal className="hidden xl:block h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
