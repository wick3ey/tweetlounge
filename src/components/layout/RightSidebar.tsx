
import React, { useState } from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import { WhoToFollow } from '@/components/profile/WhoToFollow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-72 xl:w-80 h-full overflow-y-auto sticky top-0 p-4 space-y-4">
      <MarketStats />
      
      <div className="border border-gray-800 bg-black/20 rounded-lg p-3">
        <Tabs defaultValue="hashtags" className="w-full">
          <TabsList className="w-full bg-gray-900/50 mb-3">
            <TabsTrigger value="hashtags" className="flex-1">Trending Hashtags</TabsTrigger>
            <TabsTrigger value="follow" className="flex-1">Who to Follow</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hashtags" className="mt-0">
            <TrendingHashtags limit={5} />
          </TabsContent>
          
          <TabsContent value="follow" className="mt-0">
            <WhoToFollow limit={5} />
          </TabsContent>
        </Tabs>
      </div>
      
      <TrendingTopics />
      <NewsSection compact={true} />
    </aside>
  );
};

export default RightSidebar;
