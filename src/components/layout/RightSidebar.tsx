
import { Search, TrendingUp, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import TrendingTopics from '@/components/crypto/TrendingTopics';

const RightSidebar = () => {
  // Mock data
  const whoToFollow = [
    { id: 1, name: 'Satoshi', username: 'satoshi', avatar: 'https://avatars.githubusercontent.com/u/224?s=200&v=4' },
    { id: 2, name: 'Vitalik', username: 'vitalik', avatar: 'https://avatars.githubusercontent.com/u/9454151?s=200&v=4' },
    { id: 3, name: 'CZ Binance', username: 'cz_binance', avatar: 'https://avatars.githubusercontent.com/u/37979?s=200&v=4' },
  ];

  return (
    <div className="hidden lg:block w-80 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input 
            className="pl-10 bg-gray-900 border-gray-800 rounded-full text-sm py-5"
            placeholder="Search"
          />
        </div>
        
        {/* Market Stats Section */}
        <div className="mb-4">
          <MarketStats />
        </div>
        
        {/* Trending Topics Section */}
        <div className="mb-4">
          <TrendingTopics />
        </div>
        
        {/* News Section */}
        <div className="mb-4">
          <NewsSection />
        </div>
        
        <Card className="bg-black border-gray-800 mb-4">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-xl">Who to follow</h2>
              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {whoToFollow.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 border border-gray-800">
                      <AvatarImage src={profile.avatar} alt={profile.name} />
                      <AvatarFallback>{profile.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <p className="font-medium text-white">{profile.name}</p>
                      <p className="text-xs text-gray-500">@{profile.username}</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-white hover:bg-gray-200 text-black rounded-full text-xs py-1 px-3 h-8 font-bold"
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="text-crypto-blue text-sm hover:bg-crypto-blue/10 mt-4 w-full justify-start px-3">
              Show more
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RightSidebar;
