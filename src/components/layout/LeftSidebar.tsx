
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
  Hash,
  TrendingUp,
  Users,
  Newspaper
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter
} from '@/components/ui/sidebar';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const WhoToFollow = () => {
  const suggestedUsers = [
    { id: 1, name: 'Vitalik Buterin', username: 'vitalikbuterin', avatar: 'https://pbs.twimg.com/profile_images/977496875887558661/L86xyLF4_400x400.jpg' },
    { id: 2, name: 'CZ Binance', username: 'cz_binance', avatar: 'https://pbs.twimg.com/profile_images/1690836282220613638/rW36MAxf_400x400.jpg' },
    { id: 3, name: 'Brian Armstrong', username: 'brian_armstrong', avatar: 'https://pbs.twimg.com/profile_images/1347260911376510977/3MPJ6Fu__400x400.jpg' },
  ];

  return (
    <Card className="bg-black border-gray-800 mt-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Users className="w-5 h-5 text-crypto-blue mr-2" />
          Who to Follow
        </h3>
        <div className="space-y-3">
          {suggestedUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-gray-500 text-xs">@{user.username}</p>
                </div>
              </div>
              <Button size="sm" className="bg-white text-black hover:bg-gray-200 rounded-full text-xs h-8">
                Follow
              </Button>
            </div>
          ))}
        </div>
        <Button variant="link" className="text-crypto-blue px-0 mt-2 text-sm w-full">
          Show more
        </Button>
      </CardContent>
    </Card>
  );
};

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
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen">
        <Sidebar className="border-r border-gray-800 bg-black w-[280px]">
          <SidebarContent className="pt-2">
            <SidebarGroup className="px-2">
              <div className="p-2 mb-2">
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
                className="mt-4 mb-2 bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full h-12 w-full p-0 xl:p-3 shadow-sm hover:shadow-md transition-all"
              >
                <span className="font-bold">Tweet</span>
                <MessageSquare className="xl:hidden h-6 w-6" />
              </Button>
            </SidebarGroup>
            
            <ScrollArea className="flex-1 h-[calc(100vh-350px)]">
              <Tabs defaultValue="stats" className="mt-4 px-2">
                <TabsList className="w-full bg-black border border-gray-800 rounded-lg">
                  <TabsTrigger value="stats" className="flex items-center text-xs">
                    <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="news" className="flex items-center text-xs">
                    <Newspaper className="w-3.5 h-3.5 mr-1.5" />
                    News
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="flex items-center text-xs">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    Trends
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="mt-2">
                  <MarketStats />
                </TabsContent>
                
                <TabsContent value="news" className="mt-2">
                  <NewsSection />
                </TabsContent>
                
                <TabsContent value="trends" className="mt-2">
                  <TrendingTopics />
                </TabsContent>
              </Tabs>
              
              <div className="px-2 mb-4">
                <WhoToFollow />
              </div>
            </ScrollArea>
          </SidebarContent>
          
          <SidebarFooter className="p-2 border-t border-gray-800">
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
