
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import NewsSection from '@/components/crypto/NewsSection';
import { WhoToFollow } from '@/components/profile/WhoToFollow';
import { Search, RefreshCw } from 'lucide-react';
import MarketStats from '@/components/crypto/MarketStats';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

const RightSidebar: React.FC = () => {
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <motion.aside 
      className="hidden lg:block w-[350px] h-screen overflow-hidden sticky top-0 bg-black border-l border-gray-800"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <ScrollArea className="h-screen py-3 pr-1">
        <div className="px-4 mb-4">
          <div className="relative">
            <div className="flex items-center w-full bg-gray-900 rounded-full overflow-hidden">
              <Search className="h-4 w-4 text-gray-500 ml-3" />
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-transparent border-none py-2.5 pl-2 pr-4 text-sm focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4 px-4">
          {/* Market Stats */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-4">
              <MarketStats />
            </div>
          </div>
          
          {/* What's happening */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-4">
              <h2 className="font-bold text-xl text-white mb-3">What's happening</h2>
              <TrendingHashtags limit={5} />
              <div className="pt-2 hover:bg-gray-800/50 transition-colors cursor-pointer rounded-lg">
                <span className="text-blue-400 text-sm px-3">Show more</span>
              </div>
            </div>
          </div>
          
          {/* Who to follow */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-4">
              <h2 className="font-bold text-xl text-white mb-3">Who to follow</h2>
              <WhoToFollow limit={3} />
              <div className="pt-2 hover:bg-gray-800/50 transition-colors cursor-pointer rounded-lg">
                <span className="text-blue-400 text-sm px-3">Show more</span>
              </div>
            </div>
          </div>
          
          {/* Latest News */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50 mb-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-xl text-white">Latest News</h2>
                <div className="flex items-center gap-1">
                  <div className="text-xs bg-blue-500/20 text-blue-400 rounded-full px-2 py-0.5 flex items-center">
                    <span>Auto-updating</span>
                    <div className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <NewsSection compact={true} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.aside>
  );
};

export default RightSidebar;
