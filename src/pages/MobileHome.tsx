
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/layout/MobileLayout';
import TweetFeed from '@/components/tweet/TweetFeed';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

const MobileHome: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  // This component should only render on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setForceRefresh(prev => !prev); // Toggle to trigger refresh
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <MobileLayout 
      title="TweetLounge" 
      showHeader={true} 
      showBottomNav={true}
    >
      <div className="flex flex-col h-full bg-black">
        {/* Pull to refresh indicator (would require additional library for actual pull-to-refresh) */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-2"></div>
            Refreshing...
          </div>
        )}
        
        {/* Tweet Feed */}
        <div className="flex-1">
          <TweetFeed forceRefresh={forceRefresh} />
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileHome;
