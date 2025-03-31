
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import NewsSection from '@/components/crypto/NewsSection';
import { WhoToFollow } from '@/components/profile/WhoToFollow';
import { Separator } from '@/components/ui/separator';
import { Search, X, Sparkles, ChevronUp, Users, Newspaper } from 'lucide-react';
import MarketStats from '@/components/crypto/MarketStats';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

const RightSidebar: React.FC = () => {
  const [showSearch, setShowSearch] = React.useState(false);
  const [minimizedSections, setMinimizedSections] = React.useState<Record<string, boolean>>({
    marketStats: false,
    trending: false,
    whoToFollow: false,
    news: false,
  });

  const toggleSection = (section: string) => {
    setMinimizedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section 
  }: { 
    title: string; 
    icon: React.ComponentType<any>; 
    section: string 
  }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full bg-gray-800 text-blue-400">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="font-bold text-white">{title}</h2>
      </div>
      <button
        onClick={() => toggleSection(section)}
        className="p-1 hover:bg-gray-800 rounded-full transition-colors"
      >
        <ChevronUp className={`h-4 w-4 transition-transform ${minimizedSections[section] ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

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
            {showSearch ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center w-full bg-gray-900 rounded-full overflow-hidden"
              >
                <Search className="h-4 w-4 text-gray-500 ml-3" />
                <input
                  type="text"
                  placeholder="Search"
                  autoFocus
                  className="w-full bg-transparent border-none py-2.5 pl-2 pr-4 text-sm focus:ring-0 focus:outline-none"
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className="p-2 mr-1 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center gap-2 bg-gray-900/70 hover:bg-gray-900 border border-gray-800 rounded-full py-2.5 px-4 transition-colors"
              >
                <Search className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500 text-sm">Search</span>
              </motion.button>
            )}
          </div>
        </div>
        
        <div className="space-y-4 px-4">
          {/* Market Stats */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-3">
              <MarketStats />
            </div>
          </div>
          
          {/* Trending Section */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-3">
              <SectionHeader title="What's happening" icon={Sparkles} section="trending" />
              <AnimatePresence>
                {!minimizedSections.trending && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TrendingHashtags limit={5} />
                    <div className="pt-2 hover:bg-gray-800/50 transition-colors cursor-pointer rounded-lg">
                      <span className="text-blue-400 text-sm px-3">Show more</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Who to Follow */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50">
            <div className="p-3">
              <SectionHeader title="Who to follow" icon={Users} section="whoToFollow" />
              <AnimatePresence>
                {!minimizedSections.whoToFollow && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <WhoToFollow limit={3} />
                    <div className="pt-2 hover:bg-gray-800/50 transition-colors cursor-pointer rounded-lg">
                      <span className="text-blue-400 text-sm px-3">Show more</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* News Section */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800/50 mb-4">
            <div className="p-3">
              <SectionHeader title="Latest News" icon={Newspaper} section="news" />
              <AnimatePresence>
                {!minimizedSections.news && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NewsSection compact={true} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.aside>
  );
};

export default RightSidebar;
