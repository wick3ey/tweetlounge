
import React, { useState, useEffect } from 'react'
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
import { supabase } from '@/integrations/supabase/client'
import { updateTweetCommentCount } from '@/services/commentService'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0); // Add state to force refresh of feed

  // Listen for realtime comment updates to refresh the feed
  useEffect(() => {
    // Setup realtime subscription for comments with improved error handling
    const channel = supabase
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
          updateTweetCommentCount(tweetId).then(() => {
            // Then force a refresh of the feed to show the updated count
            handleRefresh();
          });
        } else {
          // If we can't get the tweet_id, refresh the whole feed anyway
          handleRefresh();
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Also listen for changes to the tweets table to refresh the feed
  useEffect(() => {
    const tweetsChannel = supabase
      .channel('public:tweets:home')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('Home page detected tweet change:', payload);
        handleRefresh();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(tweetsChannel);
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
      setFeedKey(prevKey => prevKey + 1);
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast({
        title: "Tweet Error",
        description: "Failed to post your tweet. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleRefresh = () => {
    // Update feed by incrementing key
    console.log('Manually refreshing feed in Home component');
    setFeedKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      <Header />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        
        <div className="flex-1 border-x border-gray-800 overflow-y-auto">
          <main className="max-w-xl mx-auto">
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
              <div className="flex gap-3 items-center">
                <div className="rounded-lg bg-crypto-blue/10 p-1.5">
                  <ZapIcon className="text-crypto-blue h-5 w-5" />
                </div>
                <h1 className="text-xl font-display font-semibold crypto-gradient-text">Feed</h1>
                
                <CryptoButton 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto text-xs h-8 border-gray-800 hover:bg-gray-900 hover:border-gray-700"
                  onClick={handleRefresh}
                >
                  <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </CryptoButton>
              </div>
            </div>
            
            {/* Tweet Composer */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-black">
              <TweetComposer onTweetSubmit={handleTweetSubmit} />
            </div>
            
            {/* Tweet Feed with Tabs */}
            <div>
              <div className="border-b border-gray-800">
                <TweetFeedTabs />
              </div>
              <TweetFeed 
                key={feedKey} 
                limit={10} 
                onCommentAdded={handleRefresh} 
              />
            </div>
          </main>
        </div>
        
        <RightSidebar />
      </div>
    </div>
  );
};

export default Home;
