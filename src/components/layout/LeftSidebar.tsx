
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
  BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarFooter
} from '@/components/ui/sidebar';

const LeftSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/explore' },
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen">
        <Sidebar className="border-r border-gray-800 bg-black w-[280px]">
          <SidebarContent className="pt-2">
            <div className="px-4 p-2 mb-4">
              <Link to="/home" className="flex items-center">
                <div className="bg-crypto-blue/10 rounded-full w-10 h-10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-crypto-blue" />
                </div>
                <span className="text-xl font-bold ml-3">TweetLounge</span>
              </Link>
            </div>
            
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.label}
                  >
                    <Link
                      to={item.path}
                      className={`flex items-center p-3 rounded-full text-lg hover:bg-gray-900 transition-colors ${
                        location.pathname === item.path ? 'font-bold' : 'text-gray-400'
                      }`}
                    >
                      <item.icon className="h-6 w-6 mr-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="More"
                >
                  <button className="flex items-center p-3 rounded-full text-lg hover:bg-gray-900 transition-colors text-gray-400 w-full">
                    <MoreHorizontal className="h-6 w-6 mr-4" />
                    <span>More</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <Button 
              className="mt-4 mb-2 mx-4 bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full h-12 w-full p-0 xl:p-3 shadow-sm hover:shadow-md transition-all"
            >
              <span className="font-bold">Tweet</span>
              <MessageSquare className="xl:hidden h-6 w-6" />
            </Button>
          </SidebarContent>
          
          <SidebarFooter className="p-4 border-t border-gray-800">
            {user && (
              <div className="flex items-center justify-between p-3 rounded-full hover:bg-gray-900 transition-colors">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="font-bold text-sm leading-tight">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-gray-500 text-sm">
                      @{profile?.username || user.email?.split('@')[0]}
                    </p>
                  </div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </div>
            )}
          </SidebarFooter>
        </Sidebar>
      </div>
    </SidebarProvider>
  );
};

export default LeftSidebar;
