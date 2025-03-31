import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { ZapIcon, RefreshCwIcon } from 'lucide-react'
import { CryptoButton } from '@/components/ui/crypto-button'
import TweetComposer from '@/components/tweet/TweetComposer'
import TweetFeed from '@/components/tweet/TweetFeed'
import { createTweet } from '@/services/tweetService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import TweetFeedTabs from '@/components/tweet/TweetFeedTabs'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { updateTweetCommentCount } from '@/services/commentService'
import { useQueryClient } from '@tanstack/react-query'
import { useMediaQuery } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedKey, setFeedKey] = useState<number>(0);
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    if (!isMobile) return;
    
    let touchStartY = 0;
    let touchMoveY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY > 0) {
        touchMoveY = e.touches[0].clientY;
      }
    };
    
    const handleTouchEnd = () => {
      if (touchStartY > 0 && touchMoveY > 0 && touchMoveY - touchStartY > 100) {
        handleRefresh();
      }
      touchStartY = 0;
      touchMoveY = 0;
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

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
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['tweets'] }).then(() => {
      setTimeout(() => setRefreshing(false), 800); // Add some delay for visual feedback
    });
  };

  return (
    <Layout>
      <div className="max-w-full">
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm pt-3 px-4 pb-2 border-b border-gray-800">
          <div className="flex gap-3 items-center pl-8 md:pl-3">
            <div className="rounded-lg bg-crypto-blue/10 p-1.5">
              <ZapIcon className="text-crypto-blue h-5 w-5" />
            </div>
            <h1 className="text-xl font-display font-semibold crypto-gradient-text">Feed</h1>
            
            <CryptoButton 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              className={cn(
                "ml-auto text-xs h-8 border-gray-800 hover:bg-gray-900 hover:border-gray-700",
                refreshing && "animate-spin text-primary"
              )}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
              {!isMobile && "Refresh"}
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
          {refreshing && (
            <div className="flex justify-center items-center py-4 text-primary">
              <div className="crypto-loader">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          )}
          <TweetFeed 
            key={feedKey} 
            limit={10} 
            onCommentAdded={handleRefresh} 
          />
        </div>
        
        {isMobile && <div className="h-16"></div>}
      </div>
    </Layout>
  );
};

export default Home;
