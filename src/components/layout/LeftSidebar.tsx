
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Hash, 
  Bell, 
  Mail, 
  User, 
  Bookmark, 
  BarChart2,
  MessageSquare,
  MoreHorizontal, 
  Zap,
  Settings,
  Coins,
  Compass,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Card } from '@/components/ui/card';

const LeftSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const primaryMenuItems = [
    { icon: Home, label: 'Hem', path: '/home' },
    { icon: Hash, label: 'Utforska', path: '/explore' },
    { icon: Bell, label: 'Notifikationer', path: '/notifications' },
    { icon: Mail, label: 'Meddelanden', path: '/messages' },
    { icon: Bookmark, label: 'Bokmärken', path: '/bookmarks' },
  ];
  
  const secondaryMenuItems = [
    { icon: BarChart2, label: 'Analys', path: '/analytics' },
    { icon: Coins, label: 'Krypto', path: '/crypto' },
    { icon: Compass, label: 'Trender', path: '/trends' },
    { icon: Settings, label: 'Inställningar', path: '/settings' },
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
  
  const renderMenuLink = (item, index) => {
    const active = isActive(item.path);
    
    return (
      <TooltipProvider key={item.path} delayDuration={350}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.path}
              className={cn(
                "flex items-center justify-center xl:justify-start p-2.5 xl:p-3 rounded-full text-base hover:bg-gray-800 transition-all duration-200",
                active 
                  ? "font-semibold bg-gray-800 text-white" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center",
                active && "text-crypto-blue"
              )}>
                <item.icon className="h-5 w-5" />
                {active && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-crypto-blue rounded-r-full xl:hidden" />
                )}
              </div>
              <span className={cn(
                "hidden xl:block ml-4",
                active && "text-white"
              )}>
                {item.label}
              </span>
              {item.badge && (
                <span className="hidden xl:flex ml-auto bg-crypto-blue text-white text-xs font-medium rounded-full h-5 min-w-5 items-center justify-center px-1.5">
                  {item.badge}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="xl:hidden">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  const DesktopSidebar = () => (
    <div className="hidden md:flex flex-col h-screen sticky top-0 w-16 xl:w-64 py-3 border-r border-gray-800">
      <div className="p-2 xl:p-3 mb-3">
        <Link to="/home" className="flex items-center justify-center xl:justify-start">
          <div className="bg-crypto-blue rounded-full w-10 h-10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="hidden xl:block text-xl font-bold ml-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TweetLounge</span>
        </Link>
      </div>
      
      <nav className="space-y-0.5 mb-4">
        {primaryMenuItems.map(renderMenuLink)}
        
        <Collapsible open={isMoreOpen} onOpenChange={setIsMoreOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-center xl:justify-start p-2.5 xl:p-3 rounded-full text-base hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-white",
              isMoreOpen && "bg-gray-800 text-white"
            )}>
              <div className="flex items-center justify-center">
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <span className="hidden xl:block ml-4">Mer</span>
              <ChevronDown className="hidden xl:block ml-auto h-4 w-4 transition-transform duration-200" 
                style={{ transform: isMoreOpen ? 'rotate(180deg)' : 'rotate(0)' }} 
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="xl:ml-2 space-y-0.5 mt-0.5 overflow-hidden">
            {secondaryMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-center xl:justify-start p-2.5 xl:p-3 rounded-full text-base hover:bg-gray-800 transition-all duration-200",
                  isActive(item.path) 
                    ? "font-semibold bg-gray-800 text-white" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="hidden xl:block ml-4">{item.label}</span>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>
      
      <Button 
        className="mt-2 bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full h-12 w-12 xl:h-auto xl:w-full p-0 xl:p-3 shadow-md hover:shadow-lg transition-all duration-300"
      >
        <span className="hidden xl:block font-bold">Tweeta</span>
        <MessageSquare className="xl:hidden h-5 w-5" />
      </Button>
      
      <div className="mt-auto">
        {user && (
          <Card className="mx-2 mb-3 bg-gray-900/50 border-gray-800 hover:bg-gray-800/70 transition-colors duration-300">
            <div className="flex items-center justify-center xl:justify-between p-2 xl:p-3 rounded-lg">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 border-2 border-gray-800">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue font-semibold">
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
          </Card>
        )}
      </div>
    </div>
  );
  
  const MobileSidebar = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800">
      <div className="flex justify-around items-center p-2">
        {primaryMenuItems.slice(0, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "p-2 rounded-full flex items-center justify-center",
              isActive(item.path) ? "text-crypto-blue" : "text-gray-400"
            )}
          >
            <item.icon className="h-6 w-6" />
          </Link>
        ))}
        
        <DrawerTrigger asChild onClick={() => setMobileMenuOpen(true)}>
          <button className="p-2 rounded-full text-gray-400">
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </DrawerTrigger>
      </div>
    </div>
  );
  
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
      
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DrawerContent className="bg-black border-t border-gray-800 p-4">
          <div className="flex flex-col space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center mb-2">
              <div className="bg-crypto-blue rounded-full w-10 h-10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold ml-3">TweetLounge</span>
            </div>
            
            {user && (
              <div className="flex items-center p-3 rounded-lg bg-gray-900 mb-4">
                <Avatar className="h-12 w-12">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-bold">
                    {profile?.display_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-gray-500 text-sm">
                    @{profile?.username || user.email?.split('@')[0]}
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {[...primaryMenuItems, ...secondaryMenuItems].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center p-3 rounded-lg",
                    isActive(item.path) 
                      ? "bg-gray-800 text-white" 
                      : "text-gray-400 hover:bg-gray-900"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            
            <Button 
              className="mt-2 bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full p-3 shadow-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              <span className="font-bold">Tweeta</span>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default LeftSidebar;
