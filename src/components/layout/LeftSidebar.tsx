
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Bell, MessageSquare, BookmarkIcon, MoreHorizontal, Activity, Zap, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useIsMobile } from '@/hooks/use-mobile';

const LeftSidebar = ({ isOpen, onToggle }: { isOpen?: boolean, onToggle?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

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
    
    // Close sidebar on mobile after navigation
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname.includes('/profile');
    }
    return location.pathname === path;
  };

  // For mobile, render a different sidebar that's conditionally displayed
  if (isMobile) {
    return (
      <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={onToggle}></div>
        <div className="absolute left-0 top-0 h-full w-72 bg-[#222222] shadow-xl">
          <div className="flex flex-col h-full py-2 px-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 p-2">
              <Link to="/home" className="text-2xl font-display font-bold text-primary flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-semibold">KryptoSphere</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button 
                  key={item.path}
                  onClick={() => handleMenuItemClick(item.path)}
                  className={`flex items-center w-full p-3 rounded-lg text-left transition-colors ${
                    isActive(item.path) 
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground/80 hover:bg-primary/5'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive(item.path) ? 'text-primary' : ''}`} />
                  <span className="text-base">{item.label}</span>
                </button>
              ))}
            </nav>
            
            <Button 
              className="web3-button py-3 rounded-lg flex items-center justify-center w-full mt-4 shadow-glow-sm hover:shadow-glow-md text-base"
              onClick={() => navigate('/compose')}
            >
              <Zap className="h-5 w-5 mr-3" />
              <span>Compose Tweet</span>
            </Button>
            
            <div className="mt-auto mb-4">
              {user && (
                <div 
                  onClick={() => profile?.username ? navigate(`/profile/${profile.username}`) : navigate('/profile')}
                  className="flex items-center p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-border mr-3">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-base">{profile?.display_name || user.email?.split('@')[0]}</p>
                    <p className="text-muted-foreground text-sm">@{profile?.username || user.email?.split('@')[0]}</p>
                  </div>
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="hidden md:flex flex-col h-screen py-2 px-4 sticky top-0 w-72 border-r border-border/50 overflow-y-auto bg-[#222222]">
      <div className="flex items-center justify-start mb-6 p-2">
        <Link to="/home" className="text-2xl font-display font-bold text-primary flex items-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold">KryptoSphere</span>
        </Link>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button 
            key={item.path}
            onClick={() => handleMenuItemClick(item.path)}
            className={`flex items-center w-full p-3 rounded-lg text-left transition-colors ${
              isActive(item.path) 
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground/80 hover:bg-primary/5'
            }`}
          >
            <item.icon className={`h-5 w-5 mr-3 ${isActive(item.path) ? 'text-primary' : ''}`} />
            <span className="text-base">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <Button 
        className="web3-button py-3 rounded-lg flex items-center justify-center w-full mt-4 shadow-glow-sm hover:shadow-glow-md text-base"
        onClick={() => navigate('/compose')}
      >
        <Zap className="h-5 w-5 mr-3" />
        <span>Compose Tweet</span>
      </Button>
      
      <div className="mt-auto mb-4">
        {user && (
          <div 
            onClick={() => profile?.username ? navigate(`/profile/${profile.username}`) : navigate('/profile')}
            className="flex items-center p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors"
          >
            <Avatar className="h-10 w-10 border border-border mr-3">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-base">{profile?.display_name || user.email?.split('@')[0]}</p>
              <p className="text-muted-foreground text-sm">@{profile?.username || user.email?.split('@')[0]}</p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
