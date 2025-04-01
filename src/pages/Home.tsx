
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
import { 
  invalidateTweetCache, 
  CACHE_KEYS 
} from '@/utils/tweetCacheService'

const Home: React.FC = () => {
  console.debug('[Home] Component rendering');
  const { user } = useAuth();
  const [feedKey, setFeedKey] = useState<number>(0); // Add state to force refresh of feed
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  console.debug('[Home] User authenticated:', !!user);

  // Improved tweet posting response handler
  const handleTweetPosted = () => {
    console.debug('[Home] Tweet posted, triggering immediate feed refresh');
    
    // Force a complete refresh from the server to get the newest tweet
    handleRefresh(true, true);
    
    // Also schedule another refresh after a short delay to handle any latency
    setTimeout(() => {
      if (isMounted.current) {
        handleRefresh(true, true);
      }
    }, 500);
  };

  // Modified refresh function with force database fetch option
  const handleRefresh = (force = false, forceDatabase = false) => {
    if ((isRefreshing || !isMounted.current) && !force) {
      console.debug('[Home] Refresh request ignored - already refreshing or component unmounted');
      return;
    }
    
    console.debug('[Home] Manual refresh triggered, forceDatabase:', forceDatabase);
    setIsRefreshing(true);
    
    // Clear relevant caches when forcing a database refresh
    if (forceDatabase) {
      try {
        console.debug('[Home] Forcing cache invalidation for immediate feed update');
        localStorage.removeItem(`tweet-cache-home-feed-limit:10-offset:0`);
        localStorage.removeItem(`tweet-cache-home-feed-limit:20-offset:0`);
      } catch (e) {
        console.error('[Home] Error clearing cache:', e);
      }
    }
    
    // Update feed by incrementing key to force complete re-render
    setFeedKey(prevKey => prevKey + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      if (isMounted.current) {
        console.debug('[Home] Refresh complete');
        setIsRefreshing(false);
      }
    }, 300);
  };

  // Enhanced realtime listener with improved responsiveness
  useEffect(() => {
    console.debug('[Home] Setting up realtime listeners');
    isMounted.current = true;

    // Function to handle immediate refresh
    const immediateRefresh = () => {
      console.debug('[Home] Immediate refresh triggered');
      handleRefresh(true, true);
    };

    // Function to handle debounced refresh
    const debouncedRefresh = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          console.debug('[Home] Executing debounced refresh');
          handleRefresh();
        }
      }, 100); // Reduced to 100ms for quicker response
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
    
    // Listen for changes to the tweets table with immediate refresh for new tweets
    const tweetsChannel = supabase
      .channel('public:tweets:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.debug('[Home] Detected tweet change:', payload.eventType);
        // For INSERT events, refresh immediately with force database refresh
        if (payload.eventType === 'INSERT') {
          console.debug('[Home] New tweet detected, refreshing immediately');
          immediateRefresh();
          
          // Also invalidate cache
          if (payload.new && 'id' in payload.new) {
            const tweetCacheKeys = [
              CACHE_KEYS.HOME_FEED,
              `${CACHE_KEYS.USER_TWEETS}-userId:${(payload.new as any).author_id}`
            ];
            
            tweetCacheKeys.forEach(key => {
              invalidateTweetCache(key)
                .then(() => console.debug(`[Home] Cache invalidated for key: ${key}`))
                .catch(err => console.error(`[Home] Error invalidating cache for key ${key}:`, err));
            });
            
            // Forcibly clear localStorage cache for immediate updates
            try {
              localStorage.removeItem(`tweet-cache-home-feed-limit:10-offset:0`);
              localStorage.removeItem(`tweet-cache-home-feed-limit:20-offset:0`);
              console.debug('[Home] Forcibly cleared home feed cache from localStorage');
            } catch (e) {
              console.error('[Home] Error clearing home feed cache:', e);
            }
          }
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
        immediateRefresh();
        
        // If we have user info, clear their profile cache as well
        if (payload.payload && payload.payload.userId) {
          const profileCacheKey = `profile-${payload.payload.userId}-posts-limit:20-offset:0`;
          try {
            localStorage.removeItem(`tweet-cache-${profileCacheKey}`);
            console.debug(`[Home] Cleared profile cache for user ${payload.payload.userId}`);
          } catch (e) {
            console.error('[Home] Error clearing profile cache:', e);
          }
        }
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
                  onClick={() => handleRefresh(true, true)}
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
                  forceRefresh={feedKey > 0}
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
