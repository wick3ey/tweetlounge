
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const TweetFeedTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');

  return (
    <div className="flex bg-black">
      <button
        onClick={() => setActiveTab('for-you')}
        className={cn(
          "flex-1 py-3 text-center relative font-medium text-sm transition-colors",
          activeTab === 'for-you' 
            ? "text-white" 
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        For you
        {activeTab === 'for-you' && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-crypto-blue" />
        )}
      </button>
      
      <button
        onClick={() => setActiveTab('following')}
        className={cn(
          "flex-1 py-3 text-center relative font-medium text-sm transition-colors",
          activeTab === 'following' 
            ? "text-white" 
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        Following
        {activeTab === 'following' && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-crypto-blue" />
        )}
      </button>
    </div>
  );
};

export default TweetFeedTabs;
