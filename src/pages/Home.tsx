import React, { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
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
import { useQueryClient } from '@tanstack/react-query'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime:feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('Home page detected tweet change:', payload);
        
        queryClient.invalidateQueries({ queryKey: ['tweets'] });
        queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('Home page detected comment change:', payload);
        
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          console.log(`Updating comment count for tweet ${tweetId} in Home page`);
          
          updateTweetCommentCount(tweetId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['tweet', tweetId] });
            queryClient.invalidateQueries({ queryKey: ['tweets'] });
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['tweets'] });
        }
      })
      .subscribe(status => {
        console.log('Realtime subscription status:', status);
      });
      
    return () => {
      console.log('Cleaning up realtime subscription in Home');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      
      queryClient.invalidateQueries({ queryKey: ['tweets'] });
      queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      
      toast({
        title: "Tweet Posted",
        description: "Your tweet has been posted successfully.",
        variant: "default"
      });
      
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
    console.log('Manually refreshing feed in Home component');
    queryClient.invalidateQueries({ queryKey: ['tweets'] });
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      <Header />
      <div className="hidden sm:block">
        <CryptoTicker />
      </div>
      
      <div className="flex flex-1 w-full max-w-[1400px] mx-auto">
        <LeftSidebar />
        
        <main className="flex-1 max-w-[600px] border-x border-gray-800 overflow-y-auto">
          <div className="max-w-full">
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
            
            <div className="px-4 pt-3 pb-2 border-b border-gray-800 bg-black">
              <TweetComposer onTweetSubmit={handleTweetSubmit} />
            </div>
            
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
          </div>
        </main>
        
        <RightSidebar />
      </div>
    </div>
  );
};

export default Home;
