
import React, { useState, useEffect, useCallback } from 'react'
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
import { supabase } from '@/lib/supabase'
import { updateTweetCommentCount } from '@/services/commentService'
import { useQueryClient } from '@tanstack/react-query'
import { useMediaQuery } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [refreshing, setRefreshing] = useState(false);

  // Optimize realtime subscriptions with reduced scope
  useEffect(() => {
    const channel = supabase
      .channel('realtime:feed:home')
      .on('postgres_changes', {
        event: 'INSERT',  // Only listen for new tweets
        schema: 'public',
        table: 'tweets'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tweets'] });
        queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',  // Only listen for new comments
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          
          // Update in background for better performance
          updateTweetCommentCount(tweetId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['tweet', tweetId] });
          });
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Optimize mobile pull to refresh
  useEffect(() => {
    if (!isMobile) return;
    
    let touchStartY = 0;
    let touchMoveY = 0;
    let isRefreshing = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop <= 5) {
        touchStartY = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY > 0) {
        touchMoveY = e.touches[0].clientY;
        
        // Add visual pull indicator
        if (touchMoveY - touchStartY > 50 && !isRefreshing) {
          const indicator = document.getElementById('pull-refresh-indicator');
          if (indicator) {
            indicator.style.transform = `translateY(${Math.min(touchMoveY - touchStartY, 100)}px)`;
            indicator.style.opacity = `${Math.min((touchMoveY - touchStartY) / 100, 1)}`;
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (touchStartY > 0 && touchMoveY > 0 && touchMoveY - touchStartY > 70) {
        isRefreshing = true;
        handleRefresh();
        
        // Reset indicator with animation
        const indicator = document.getElementById('pull-refresh-indicator');
        if (indicator) {
          indicator.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
          indicator.style.transform = 'translateY(0)';
          indicator.style.opacity = '0';
          
          setTimeout(() => {
            if (indicator) {
              indicator.style.transition = '';
              isRefreshing = false;
            }
          }, 300);
        }
      }
      touchStartY = 0;
      touchMoveY = 0;
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Add pull indicator element
    const indicator = document.createElement('div');
    indicator.id = 'pull-refresh-indicator';
    indicator.className = 'fixed top-0 left-0 right-0 z-50 flex justify-center items-center h-16 pointer-events-none';
    indicator.innerHTML = '<div class="h-6 w-6 rounded-full border-2 border-crypto-blue border-t-transparent animate-spin"></div>';
    indicator.style.transform = 'translateY(0)';
    indicator.style.opacity = '0';
    document.body.appendChild(indicator);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    };
  }, [isMobile]);

  // Memoize to prevent re-renders
  const handleTweetSubmit = useCallback(async (content: string, imageFile?: File) => {
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
      // Use optimistic updates for faster UI response
      // Show temporary tweet immediately
      const tempId = `temp-${Date.now()}`;
      const tempTweet = {
        id: tempId,
        content,
        author_id: user.id,
        created_at: new Date().toISOString(),
        likes_count: 0,
        retweets_count: 0,
        replies_count: 0,
        is_retweet: false,
        author: {
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          display_name: user.email?.split('@')[0] || 'User',
          avatar_url: '',
        }
      };
      
      // Add to cache optimistically
      queryClient.setQueryData(['tweets'], (old: any) => {
        if (!old || !old.pages) return { pages: [[tempTweet]], pageParams: [0] };
        return {
          ...old,
          pages: [
            [tempTweet, ...old.pages[0]],
            ...old.pages.slice(1)
          ]
        };
      });
      
      // Create actual tweet in background
      const result = await createTweet(content, imageFile);
      
      if (!result) {
        // Remove temp tweet on failure
        queryClient.setQueryData(['tweets'], (old: any) => {
          if (!old || !old.pages) return { pages: [], pageParams: [] };
          return {
            ...old,
            pages: old.pages.map((page: any[], pageIndex: number) => 
              pageIndex === 0 
                ? page.filter(t => t.id !== tempId)
                : page
            )
          };
        });
        throw new Error("Failed to create tweet");
      }
      
      // Replace temp with real tweet
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
  }, [user, toast, navigate, queryClient]);

  // Optimized refresh function
  const handleRefresh = useCallback(() => {
    console.log('Manually refreshing feed in Home component');
    setRefreshing(true);
    
    // Invalidate only what's needed
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tweets'] }),
      queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] })
    ]).then(() => {
      // Add slight delay for visual feedback
      setTimeout(() => setRefreshing(false), 600);
    });
  }, [queryClient]);

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
