
import React, { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import { ZapIcon, RefreshCwIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import TweetInput from '@/components/crypto/TweetInput'
import TweetFeed from '@/components/tweet/TweetFeed'
import { useAuth } from '@/contexts/AuthContext'
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import { supabase } from '@/lib/supabase'
import { updateTweetCommentCount } from '@/services/commentService'
import { ScrollArea } from '@/components/ui/scroll-area'

const Home: React.FC = () => {
  console.debug('[Home] Component rendering');
  const { user } = useAuth();
  const [feedKey, setFeedKey] = useState<number>(0); // Add state to force refresh of feed
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  console.debug('[Home] User authenticated:', !!user);

  // Optimized listener with improved debounce for performance
  useEffect(() => {
    console.debug('[Home] Setting up realtime listeners');
    isMounted.current = true;
    let pendingRefreshes = 0;

    // Function to handle debounced refresh
    const debouncedRefresh = () => {
      console.debug('[Home] Debounced refresh triggered, pending refreshes:', pendingRefreshes + 1);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      pendingRefreshes++;
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (pendingRefreshes > 0 && isMounted.current) {
          console.debug('[Home] Executing debounced refresh, pending count:', pendingRefreshes);
          handleRefresh();
          pendingRefreshes = 0;
        }
      }, 300); // Reduced to 300ms for more immediate response
    };

    // Listen for realtime comment updates to refresh the feed
    const commentsChannel = supabase
      .channel('public:comments:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.debug('[Home] Detected comment change:', payload.eventType, payload.new ? `for tweet ${(payload.new as any).tweet_id}` : '');
        
        // Check if payload.new exists and has a tweet_id property
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          console.debug(`[Home] Updating comment count for tweet ${tweetId}`);
          
          // First update the count in the database
          updateTweetCommentCount(tweetId)
            .then(() => console.debug(`[Home] Comment count updated for tweet ${tweetId}`))
            .catch(err => console.error('[Home] Error updating comment count:', err));

          // Use debounced refresh
          debouncedRefresh();
        }
      })
      .subscribe();
    
    console.debug('[Home] Comments channel subscribed');
    
    // Also listen for changes to the tweets table with immediate refresh for new tweets
    const tweetsChannel = supabase
      .channel('public:tweets:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.debug('[Home] Detected tweet change:', payload.eventType);
        // For INSERT events, refresh immediately
        if (payload.eventType === 'INSERT') {
          console.debug('[Home] New tweet detected, refreshing immediately');
          handleRefresh();
        } else {
          debouncedRefresh();
        }
      })
      .subscribe();
      
    console.debug('[Home] Tweets channel subscribed');
    
    // Listen for custom broadcast events with immediate refresh
    const broadcastChannel = supabase
      .channel('custom-all-channel')
      .on('broadcast', { event: 'tweet-created' }, (payload) => {
        console.debug('[Home] Received broadcast about new tweet:', payload);
        // Force immediate refresh for new tweets
        handleRefresh();
      })
      .subscribe();
      
    console.debug('[Home] Broadcast channel subscribed');
      
    return () => {
      console.debug('[Home] Cleaning up realtime listeners');
      isMounted.current = false;
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(tweetsChannel);
      supabase.removeChannel(broadcastChannel);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing || !isMounted.current) {
      console.debug('[Home] Refresh request ignored - already refreshing or component unmounted');
      return;
    }
    
    console.debug('[Home] Manual refresh triggered');
    setIsRefreshing(true);
    
    // Update feed by incrementing key
    setFeedKey(prevKey => prevKey + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      if (isMounted.current) {
        console.debug('[Home] Refresh complete');
        setIsRefreshing(false);
      }
    }, 500);
  };

  const handleTweetPosted = () => {
    console.debug('[Home] Tweet posted, triggering immediate feed refresh');
    // Force an immediate refresh when a tweet is posted
    handleRefresh();
  };

  console.debug('[Home] Rendering component with feedKey:', feedKey);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      <Header />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        
        <div className="flex-1 border-x border-gray-800 overflow-hidden flex flex-col">
          <main className="max-w-xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <div className="flex gap-3 items-center">
                <div className="rounded-lg bg-crypto-blue/10 p-1.5">
                  <ZapIcon className="text-crypto-blue h-5 w-5" />
                </div>
                <h1 className="text-xl font-display font-semibold crypto-gradient-text">Feed</h1>
                
                <CryptoButton 
                  variant="outline" 
                  size="sm" 
                  className={`ml-auto text-xs h-8 border-gray-800 hover:bg-gray-900 hover:border-gray-700 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCwIcon className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </CryptoButton>
              </div>
            </div>
            
            {/* Tweet Input */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-black shrink-0">
              <TweetInput onTweetPosted={handleTweetPosted} />
            </div>
            
            {/* Tweet Feed with Tabs */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="border-b border-gray-800 shrink-0">
                <TweetFeedTabs />
              </div>
              <ScrollArea className="flex-1">
                <TweetFeed 
                  key={feedKey} 
                  onCommentAdded={handleRefresh} 
                />
              </ScrollArea>
            </div>
          </main>
        </div>
        
        <RightSidebar />
      </div>
    </div>
  );
};

export default Home;
