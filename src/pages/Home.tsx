
import React, { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CryptoTicker from '@/components/crypto/CryptoTicker'
import { ZapIcon, RefreshCwIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import { Separator } from '@/components/ui/separator'
import TweetComposer from '@/components/tweet/TweetComposer'
import TweetFeed from '@/components/tweet/TweetFeed'
import { createTweet } from '@/services/tweetService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { updateTweetCommentCount } from '@/services/commentService'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0); // Add state to force refresh of feed
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

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
      }, 2000); // Wait 2 seconds before refreshing for better performance
    };

    // Listen for realtime comment updates to refresh the feed
    const commentsChannel = supabase
      .channel('public:comments:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('Home page detected comment change:', payload);
        
        // Check if payload.new exists and has a tweet_id property
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          console.log(`Updating comment count for tweet ${tweetId} in Home page`);
          
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
        console.log('Home page detected tweet change:', payload);
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
    console.log('Manually refreshing feed in Home component');
    
    // Update feed by incrementing key
    setFeedKey(prevKey => prevKey + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }, 500);
  };

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
            
            {/* Tweet Composer */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-black shrink-0">
              <TweetComposer onTweetSubmit={handleTweetSubmit} />
            </div>
            
            {/* Tweet Feed with Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="border-b border-gray-800 shrink-0">
                <TweetFeedTabs />
              </div>
              <div className="flex-1 overflow-y-auto">
                <TweetFeed 
                  key={feedKey} 
                  onCommentAdded={handleRefresh} 
                />
              </div>
            </div>
          </main>
        </div>
        
        <RightSidebar />
      </div>
    </div>
  );
};

export default Home;
