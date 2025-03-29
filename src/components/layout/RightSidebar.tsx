
import { Search, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import { WhoToFollowSection } from '@/components/layout/WhoToFollowSection';

const RightSidebar = () => {
  return (
    <div className="hidden lg:block w-[340px] border-l border-gray-800 bg-black">
      <div className="p-4 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input 
            className="pl-10 bg-gray-900 border-gray-800 rounded-full text-sm py-5"
            placeholder="Search TweetLounge"
          />
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 -mr-4">
          <div className="space-y-4">
            {/* Market Stats */}
            <MarketStats />
            
            {/* News Section */}
            <div className="mt-4">
              <NewsSection />
            </div>
            
            {/* Trending Topics */}
            <div className="mt-4">
              <TrendingTopics />
            </div>
            
            {/* Who To Follow */}
            <div className="mt-4 mb-6">
              <WhoToFollowSection />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default RightSidebar;
