
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import NewsSection from '@/components/crypto/NewsSection';
import { WhoToFollow } from '@/components/profile/WhoToFollow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Search } from 'lucide-react';

const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block min-w-[350px] max-w-[350px] h-screen overflow-y-auto sticky top-0 bg-black border-l border-gray-800 py-3">
      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-gray-900 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
      
      {/* Trending Section */}
      <div className="bg-gray-900 rounded-xl mb-4 mx-4">
        <div className="p-3 pb-0">
          <h2 className="font-bold text-xl mb-4">What's happening</h2>
        </div>
        <div className="px-4">
          <TrendingHashtags limit={5} />
        </div>
        <div className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
          <span className="text-blue-400 text-sm">Show more</span>
        </div>
      </div>
      
      {/* Who to Follow */}
      <div className="bg-gray-900 rounded-xl mb-4 mx-4">
        <div className="p-3 pb-0">
          <h2 className="font-bold text-xl mb-4">Who to follow</h2>
        </div>
        <WhoToFollow limit={3} />
        <div className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
          <span className="text-blue-400 text-sm">Show more</span>
        </div>
      </div>
      
      {/* News Section - Compact version */}
      <div className="px-4">
        <NewsSection compact={true} />
      </div>
    </aside>
  );
};

export default RightSidebar;
