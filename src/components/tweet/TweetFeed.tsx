import { useState, useEffect, useMemo } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor, isValidTweet, isValidRetweet, getSafeTweetId, enhanceTweetData } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { updateTweetCommentCount } from '@/services/commentService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
  onCommentAdded?: () => void;
}

const TweetFeed = ({ userId, limit = 20, onCommentAdded }: TweetFeedProps) => {
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAuthor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({title: '', description: ''});
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimize query key for better cache management
  const queryKey = useMemo(() => ['tweets', userId, limit], [userId, limit]);

  // Optimized React Query configuration for tweets
  const { 
    data: tweets = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const rawTweets = await getTweets(limit, 0);
      return processTweets(rawTweets);
    },
    // Performance tuning
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds (increased from 10)
    refetchOnWindowFocus: false,
    refetchInterval: false,
    // Add placeholderData for instant loading when switching tabs
    placeholderData: (previous) => previous || [],
    // Improved error handling
    retry: (failureCount, error) => {
      return failureCount < 2; // Only retry once
    }
  });

  // Optimized tweet processing with memoization
  const processTweets = async (rawTweets: TweetWithAuthor[]) => {
    try {
      // Pre-process tweets in batch operations
      const preprocessedTweets = rawTweets.map(tweet => {
        if (tweet.is_retweet && !tweet.original_tweet_id) {
          return { ...tweet, is_retweet: false };
        }
        return tweet;
      });
      
      // Process in batches to avoid blocking the main thread
      const processedTweets = await Promise.all(preprocessedTweets.map(async (tweet) => {
        const enhancedTweet = enhanceTweetData(tweet);
        if (!enhancedTweet) return null;
        
        if (enhancedTweet.is_retweet && enhancedTweet.original_tweet_id) {
          try {
            // Use cached data if available
            const cachedOriginalTweet = queryClient.getQueryData(['tweet', enhancedTweet.original_tweet_id]);
            if (cachedOriginalTweet && 
                typeof cachedOriginalTweet === 'object' && 
                'content' in cachedOriginalTweet && 
                'image_url' in cachedOriginalTweet && 
                'author' in cachedOriginalTweet) {
              const typedCachedTweet = cachedOriginalTweet as TweetWithAuthor;
              return {
                ...enhancedTweet,
                content: typedCachedTweet.content,
                image_url: typedCachedTweet.image_url,
                original_author: typedCachedTweet.author
              };
            }
            
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: enhancedTweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              return enhancedTweet;
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
              const originalTweet = originalTweetData[0];
              
              // Cache the original tweet data
              queryClient.setQueryData(['tweet', enhancedTweet.original_tweet_id], originalTweet);
              
              return {
                ...enhancedTweet,
                content: originalTweet.content,
                image_url: originalTweet.image_url,
                original_author: {
                  id: originalTweet.author_id,
                  username: originalTweet.username || 'user',
                  display_name: originalTweet.display_name || 'User',
                  avatar_url: originalTweet.avatar_url || '',
                  avatar_nft_id: originalTweet.avatar_nft_id,
                  avatar_nft_chain: originalTweet.avatar_nft_chain,
                  replies_sort_order: originalTweet.replies_sort_order
                }
              };
            }
          } catch (err) {
            console.error('Error processing retweet:', err);
          }
        }
        
        // Use cached comment counts when possible
        const cachedCount = queryClient.getQueryData(['tweet-comments-count', enhancedTweet.id]);
        if (cachedCount !== undefined) {
          return {
            ...enhancedTweet,
            replies_count: cachedCount
          };
        }
        
        try {
          const { count } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('tweet_id', enhancedTweet.id);
          
          // Cache the count for future use
          queryClient.setQueryData(['tweet-comments-count', enhancedTweet.id], count);
          
          return {
            ...enhancedTweet,
            replies_count: typeof count === 'number' ? count : enhancedTweet.replies_count
          };
        } catch (err) {
          return enhancedTweet;
        }
      }));
      
      // Filter out any nulls and validate all tweets
      return processedTweets
        .filter((tweet): tweet is TweetWithAuthor => 
          tweet !== null && isValidTweet(tweet)
        );
    } catch (err) {
      console.error('Error processing tweets:', err);
      return [];
    }
  };

  // Optimized realtime subscriptions
  useEffect(() => {
    // Single channel for multiple events - more efficient
    const channel = supabase
      .channel('feed:realtime:combined')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        // Only invalidate the whole cache on critical changes
        if (payload.eventType === 'INSERT') {
          queryClient.invalidateQueries({ queryKey: ['tweets'] });
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          // For updates, just update the specific tweet in the cache
          const tweetId = payload.new.id;
          queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(tweet => tweet.id === tweetId ? { ...tweet, ...payload.new } : tweet);
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          
          // Use optimistic updates for better UX
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.map(tweet => {
                if (tweet.id === tweetId) {
                  return { ...tweet, replies_count: (tweet.replies_count || 0) + 1 };
                }
                return tweet;
              });
            });
          }
          
          // Only update the database in the background
          updateTweetCommentCount(tweetId).then(() => {
            updateTweetCommentCountInUI(tweetId);
          });
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey]);

  // Optimized comment count update
  const updateTweetCommentCountInUI = async (tweetId: string) => {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('replies_count')
        .eq('id', tweetId)
        .single();
      
      if (error) return;
      
      // Cache the count
      queryClient.setQueryData(['tweet-comments-count', tweetId], data.replies_count);
      
      // Update tweet in cache
      queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, replies_count: data.replies_count } 
            : tweet
        );
      });
      
      // Update selected tweet if needed
      if (selectedTweet && selectedTweet.id === tweetId) {
        setSelectedTweet(prevTweet => {
          if (!prevTweet) return null;
          return { ...prevTweet, replies_count: data.replies_count };
        });
      }
    } catch (err) {
      console.error('Failed to update tweet comment count in UI:', err);
    }
  };

  // More responsive refresh handling
  const handleRefresh = () => {
    refetch();
  };

  // More efficient click handling
  const handleTweetClick = (tweet: TweetWithAuthor) => {
    // Pre-cache the tweet data for detail view
    queryClient.setQueryData(['tweet', tweet.id], tweet);
    setSelectedTweet(tweet);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    
    if (selectedTweet) {
      updateTweetCommentCount(selectedTweet.id).then(() => {
        refetch();
      });
    }
    
    // Delayed clearing for smoother transitions
    setTimeout(() => setSelectedTweet(null), 300);
  };

  const handleCommentAdded = (tweetId: string) => {
    // Optimistic update for faster UI
    queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(tweet => {
        if (tweet.id === tweetId) {
          return { ...tweet, replies_count: (tweet.replies_count || 0) + 1 };
        }
        return tweet;
      });
    });
    
    // Update in background
    updateTweetCommentCount(tweetId).then(() => {
      refetch();
    });
    
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  // More efficient tweet deletion logic
  const handleTweetDeleted = (deletedTweetId: string) => {
    queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter(tweet => tweet.id !== deletedTweetId && 
        !(tweet.is_retweet && tweet.original_tweet_id === deletedTweetId));
    });
    
    if (selectedTweet && selectedTweet.id === deletedTweetId) {
      setIsDetailOpen(false);
      setSelectedTweet(null);
    }
    
    toast({
      title: "Tweet Deleted",
      description: "Your tweet has been successfully deleted."
    });
  };

  // Optimized retweet removal
  const handleRetweetRemoved = (originalTweetId: string) => {
    if (user) {
      queryClient.setQueryData(queryKey, (oldData: TweetWithAuthor[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(tweet => 
          !(tweet.is_retweet && 
            tweet.original_tweet_id === originalTweetId && 
            tweet.author_id === user.id)
        );
      });
    }
  };

  const handleError = (title: string, description: string) => {
    setErrorDetails({ title, description });
    setIsErrorDialogOpen(true);
  };

  // Better loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in-50 duration-300 ease-in-out">
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="p-4 border-b border-gray-800 bg-black">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-gray-800 rounded animate-pulse" />
                <div className="h-20 bg-gray-800 rounded animate-pulse mt-2" />
                <div className="flex space-x-6 mt-2">
                  <div className="h-4 w-10 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-10 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-10 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="p-6 text-center animate-in fade-in-50 duration-300 ease-in-out">
        <p className="text-red-500 mb-4">Failed to load tweets. Please try again later.</p>
        <button 
          onClick={() => refetch()}
          className="bg-crypto-blue text-white px-4 py-2 rounded-full hover:bg-crypto-blue/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state handling
  if (tweets.length === 0) {
    return (
      <div className="p-6 text-center border-b border-gray-800 bg-black animate-in fade-in-50 duration-300 ease-in-out">
        <p className="text-gray-400">No tweets yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <>
      <div className="tweet-feed bg-black animate-in fade-in-50 duration-300 ease-in-out">
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            onClick={() => handleTweetClick(tweet)}
            onAction={handleRefresh}
            onDelete={handleTweetDeleted}
            onRetweetRemoved={handleRetweetRemoved}
            onError={handleError}
          />
        ))}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-black border-gray-800 p-0 max-h-[90vh] overflow-hidden">
          <VisuallyHidden asChild>
            <DialogTitle>Tweet Detail</DialogTitle>
          </VisuallyHidden>
          
          {selectedTweet && (
            <TweetDetail 
              tweet={selectedTweet} 
              onClose={handleCloseDetail}
              onAction={handleRefresh}
              onDelete={handleTweetDeleted}
              onCommentAdded={handleCommentAdded}
              onRetweetRemoved={handleRetweetRemoved}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <ErrorDialog 
        open={isErrorDialogOpen}
        onOpenChange={setIsErrorDialogOpen}
        title={errorDetails.title}
        description={errorDetails.description}
        variant="error"
      />
    </>
  );
};

export default TweetFeed;
