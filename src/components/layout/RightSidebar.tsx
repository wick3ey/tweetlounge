import { Search, TrendingUp, MoreHorizontal, LineChart, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import { useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { CryptoButton } from '@/components/ui/crypto-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from 'react';

interface FollowSuggestionProps {
  name: string;
  username: string;
  avatarUrl: string;
}

const FollowSuggestion: React.FC<FollowSuggestionProps> = ({ name, username, avatarUrl }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center space-x-3">
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full"
      />
      <div>
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-gray-400">@{username}</div>
      </div>
    </div>
    <Button variant="outline" size="sm">
      Follow
    </Button>
  </div>
);

interface TrendingItemProps {
  topic: string;
  volume: number;
}

const TrendingItem: React.FC<TrendingItemProps> = ({ topic, volume }) => (
  <div className="py-2">
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold">{topic}</div>
      <div className="text-xs text-gray-400">{volume}</div>
    </div>
  </div>
);

const SearchWidget: React.FC = () => (
  <div className="relative">
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
      <Search className="h-4 w-4 text-gray-400" />
    </div>
    <Input
      className="w-full pl-10 py-2 bg-gray-900/50 border-gray-800 focus-visible:ring-blue-600 text-sm"
      placeholder="Search..."
    />
  </div>
);

interface SidebarWidgetProps {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}

const SidebarWidget: React.FC<SidebarWidgetProps> = ({ icon: Icon, title, color, children }) => (
  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
    <div className="flex items-center mb-4">
      <Icon className={`h-5 w-5 mr-2 ${color}`} />
      <h3 className="font-semibold text-md">{title}</h3>
    </div>
    <div>{children}</div>
  </div>
);

const FollowSuggestions: React.FC = () => {
  const suggestions = [
    { name: 'John Doe', username: 'johndoe', avatarUrl: 'https://i.pravatar.cc/150?img=1' },
    { name: 'Jane Smith', username: 'janesmith', avatarUrl: 'https://i.pravatar.cc/150?img=2' },
    { name: 'Alice Johnson', username: 'alicej', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
  ];
  
  return (
    <SidebarWidget
      icon={Users}
      title="Who to Follow"
      color="text-blue-400"
    >
      {suggestions.map((suggestion) => (
        <FollowSuggestion
          key={suggestion.username}
          name={suggestion.name}
          username={suggestion.username}
          avatarUrl={suggestion.avatarUrl}
        />
      ))}
    </SidebarWidget>
  );
};

const RightSidebar = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1024px)");
  
  // Handle overflow on mobile sidebar
  useEffect(() => {
    if (showMobileSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showMobileSidebar]);
  
  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile && showMobileSidebar) {
      setShowMobileSidebar(false);
    }
  }, [isMobile, showMobileSidebar]);
  
  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  return (
    <div className="hidden lg:block w-auto min-w-80 max-w-[400px] border-l border-gray-800 overflow-y-auto">
      <div className="p-4 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            className="w-full pl-10 py-5 bg-gray-900/50 border-gray-800 focus-visible:ring-blue-600"
            placeholder="Search..."
          />
        </div>
      </div>
      
      <ScrollArea className="h-full px-4 pb-4">
        <div className="space-y-6">
          <MarketStats />
          
          <div className="mt-6">
            <NewsSection compact={false} />
          </div>
          
          <SidebarWidget
            icon={TrendingUp}
            title="Trending Topics"
            color="text-purple-400"
          >
            <TrendingTopics />
          </SidebarWidget>
          
          <FollowSuggestions />
        </div>
      </ScrollArea>
      
      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg bg-gray-900 border-gray-700"
          onClick={toggleMobileSidebar}
        >
          <LineChart className="h-5 w-5" />
        </Button>
      )}
      
      {/* Mobile sidebar */}
      {isMobile && showMobileSidebar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-full max-w-[350px] bg-black border-l border-gray-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="font-semibold">More Information</h3>
              <CryptoButton variant="ghost" size="icon" onClick={toggleMobileSidebar}>
                <X className="h-5 w-5" />
              </CryptoButton>
            </div>
            
            <ScrollArea className="h-[calc(100vh-64px)] p-4">
              <div className="space-y-6">
                <SearchWidget />
                
                <MarketStats />
                
                <div className="mt-6">
                  <NewsSection compact={false} />
                </div>
                
                <SidebarWidget
                  icon={TrendingUp}
                  title="Trending Topics"
                  color="text-purple-400"
                >
                  <TrendingTopics />
                </SidebarWidget>
                
                <FollowSuggestions />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;
