
import React from 'react';
import { TrendingHashtags } from '@/components/hashtag/TrendingHashtags';
import { TrendingTopics } from '@/components/crypto/TrendingTopics';

const RightSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:block w-72 xl:w-80 h-full overflow-y-auto sticky top-0 p-4 space-y-4">
      <TrendingHashtags limit={5} />
      <TrendingTopics />
    </aside>
  );
};

export default RightSidebar;
