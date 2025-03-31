
import React, { useState, useEffect, useRef } from 'react';
import { ZapIcon, Bookmark, RefreshCw, BarChart3, TrendingUp } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import TweetComposer from '@/components/tweet/TweetComposer';
import TweetFeed from '@/components/tweet/TweetFeed';
import { createTweet } from '@/services/tweetService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { updateTweetCommentCount } from '@/services/commentService';
import MobileLayout from '@/components/layout/MobileLayout';
import { useCryptoData } from '@/utils/coingeckoService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useMarketData } from '@/services/marketService';
import { Badge } from '@/components/ui/badge';
import { useNewsData, formatNewsDate } from '@/utils/newsService';

const MobileHome: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const { cryptoData } = useCryptoData();
  const { marketData } = useMarketData();
  const { newsArticles } = useNewsData();
  
  // Optimized listener with improved debounce for performance
  useEffect(() => {
    isMounted.current = true;
    let pendingRefreshes = 0;

    // Function to handle debounced refresh
    const debouncedRefresh = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      pendingRefreshes++;
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (pendingRefreshes > 0 && isMounted.current) {
          handleRefresh();
          pendingRefreshes = 0;
        }
      }, 2000);
    };

    // Listen for realtime comment updates to refresh the feed
    const commentsChannel = supabase
      .channel('public:comments:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        // Check if payload.new exists and has a tweet_id property
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          
          // First update the count in the database
          updateTweetCommentCount(tweetId)
            .catch(err => console.error('Error updating comment count:', err));

          // Use debounced refresh
          debouncedRefresh();
        }
      })
      .subscribe();
    
    // Also listen for changes to the tweets table with same debounce mechanism
    const tweetsChannel = supabase
      .channel('public:tweets:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        debouncedRefresh();
      })
      .subscribe();
      
    return () => {
      isMounted.current = false;
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(tweetsChannel);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleTweetSubmit = async (content: string, imageFile?: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a tweet",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    try {
      const result = await createTweet(content, imageFile);
      if (!result) {
        throw new Error("Failed to create tweet");
      }
      
      // Update feed by incrementing key instead of reloading the page
      if (isMounted.current) {
        setFeedKey(prevKey => prevKey + 1);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error posting tweet:", error);
      if (isMounted.current) {
        toast({
          title: "Tweet Error",
          description: "Failed to post your tweet. Please try again.",
          variant: "destructive"
        });
      }
      throw error;
    }
  };

  const handleRefresh = () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing || !isMounted.current) return;
    
    setIsRefreshing(true);
    
    // Update feed by incrementing key
    setFeedKey(prevKey => prevKey + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }, 500);
  };

  if (!isMobile) {
    return null; // Don't render on non-mobile devices
  }

  return (
    <MobileLayout title="Home" showHeader={true} showBottomNav={true}>
      <div className="flex flex-col min-h-full">
        {/* Market Highlights Section */}
        <div className="px-4 py-3 bg-crypto-darkgray/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-white">Market Highlights</h2>
            <CryptoButton
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate('/market')}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              View All
            </CryptoButton>
          </div>
          
          <ScrollArea className="pb-2" orientation="horizontal">
            <div className="flex space-x-3 pb-2 w-max">
              {cryptoData.slice(0, 5).map((crypto, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 p-3 glass-card min-w-[140px] border border-crypto-gray/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{crypto.symbol}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-1.5 ${
                        crypto.change >= 0 ? 'text-crypto-green border-crypto-green/30' : 'text-crypto-red border-crypto-red/30'
                      }`}
                    >
                      {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-crypto-lightgray mb-1">{crypto.name}</div>
                  <div className="text-base font-semibold">${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Tweet Composer */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-800 shrink-0 bg-crypto-black">
          <TweetComposer onTweetSubmit={handleTweetSubmit} />
        </div>
        
        {/* Tweet Feed Tabs */}
        <div className="border-b border-gray-800 shrink-0">
          <TweetFeedTabs />
        </div>
        
        {/* Feed Refresh Button */}
        <div className="sticky top-0 z-10 bg-crypto-black/80 backdrop-blur-sm py-2 px-4 border-b border-gray-800/50 flex justify-between items-center">
          <div className="flex items-center">
            <div className="rounded-lg bg-crypto-blue/10 p-1 mr-2">
              <ZapIcon className="text-crypto-blue h-4 w-4" />
            </div>
            <h2 className="text-sm font-medium text-white">Latest Tweets</h2>
          </div>
          
          <CryptoButton 
            variant="outline" 
            size="sm" 
            className={`text-xs h-7 border-gray-800 hover:bg-gray-900 hover:border-gray-700 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </CryptoButton>
        </div>
        
        {/* Tweet Feed */}
        <div className="flex-1">
          <TweetFeed key={feedKey} onCommentAdded={handleRefresh} />
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileHome;
