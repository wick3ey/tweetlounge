
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import TrendingTopics from '@/components/crypto/TrendingTopics';
import MarketStats from '@/components/crypto/MarketStats';
import NewsSection from '@/components/crypto/NewsSection';
import WhoToFollow from '@/components/profile/WhoToFollow';

const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-72 xl:w-80 h-full overflow-y-auto sticky top-0 p-4 space-y-4">
      <MarketStats />
      <TrendingHashtags limit={5} />
      <WhoToFollow limit={3} />
      <TrendingTopics />
      <NewsSection compact={true} />
    </aside>
  );
};

export default RightSidebar;
