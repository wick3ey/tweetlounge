
import { useState, useEffect } from 'react';
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

  // Use React Query for data fetching with optimized caching and auto-refetching
  const { 
    data: tweets = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['tweets', userId, limit],
    queryFn: async () => {
      console.log('Fetching tweets with React Query');
      const rawTweets = await getTweets(limit, 0);
      return processTweets(rawTweets);
    },
    // Optimize data freshness settings
    staleTime: 10 * 1000, // Data considered fresh for 10 seconds
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Process tweets to ensure data quality and enhance with additional info
  const processTweets = async (rawTweets: TweetWithAuthor[]) => {
    try {
      // Pre-process tweets to catch any obvious issues before proceeding
      const preprocessedTweets = rawTweets.map(tweet => {
        if (tweet.is_retweet && !tweet.original_tweet_id) {
          console.log(`Fixing invalid retweet data for tweet ${tweet.id}. Setting is_retweet to false.`);
          return { ...tweet, is_retweet: false };
        }
        return tweet;
      });
      
      // Enhanced validation and processing for retweets
      const processedTweets = await Promise.all(preprocessedTweets.map(async (tweet) => {
        // Apply the enhanceTweetData function to fix common issues
        const enhancedTweet = enhanceTweetData(tweet);
        if (!enhancedTweet) return null;
        
        // Special handling for retweets to ensure all data is loaded
        if (enhancedTweet.is_retweet && enhancedTweet.original_tweet_id) {
          try {
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: enhancedTweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              return enhancedTweet;
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
              const originalTweet = originalTweetData[0];
              
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
        
        // Ensure accurate comment counts
        try {
          const { count } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('tweet_id', enhancedTweet.id);
          
          return {
            ...enhancedTweet,
            replies_count: typeof count === 'number' ? count : enhancedTweet.replies_count
          };
        } catch (err) {
          console.error(`Error updating count for tweet ${enhancedTweet.id}:`, err);
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

  // Enhanced realtime subscriptions with improved channel configuration
  useEffect(() => {
    const channel = supabase
      .channel('feed:realtime:tweets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('TweetFeed detected tweet change:', payload.eventType, payload);
        refetch();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const tweetId = payload.new.tweet_id as string;
          updateTweetCommentCount(tweetId).then(() => {
            // Update UI with new comment count
            updateTweetCommentCountInUI(tweetId);
          });
        }
      })
      .subscribe();
      
    return () => {
      console.log('Cleaning up realtime subscription in TweetFeed');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // New function to update a single tweet's comment count in the UI
  const updateTweetCommentCountInUI = async (tweetId: string) => {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('replies_count')
        .eq('id', tweetId)
        .single();
      
      if (error) {
        console.error('Error fetching updated tweet count:', error);
        return;
      }
      
      console.log(`Updating tweet ${tweetId} comment count in UI to ${data.replies_count}`);
      
      // Update the tweet in React Query cache
      queryClient.setQueryData(['tweets', userId, limit], (oldData: TweetWithAuthor[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, replies_count: data.replies_count } 
            : tweet
        );
      });
      
      // If the tweet is currently selected in the detail view, update it there too
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

  // Handle user manually refreshing the feed
  const handleRefresh = () => {
    console.log('Manually refreshing feed in TweetFeed component');
    refetch();
  };

  const handleTweetClick = (tweet: TweetWithAuthor) => {
    setSelectedTweet(tweet);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    
    if (selectedTweet) {
      // Force update the tweet's comment count before closing the detail
      updateTweetCommentCount(selectedTweet.id).then(() => {
        refetch();
      });
    }
    
    setSelectedTweet(null);
  };

  const handleCommentAdded = (tweetId: string) => {
    // Always update comment count in UI and database when a comment is added
    updateTweetCommentCount(tweetId).then(() => {
      refetch();
    });
    
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleTweetDeleted = (deletedTweetId: string) => {
    // Remove the tweet from the React Query cache
    queryClient.setQueryData(['tweets', userId, limit], (oldData: TweetWithAuthor[] | undefined) => {
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

  const handleRetweetRemoved = (originalTweetId: string) => {
    if (user) {
      queryClient.setQueryData(['tweets', userId, limit], (oldData: TweetWithAuthor[] | undefined) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
        <span className="ml-2 text-gray-400">Loading tweets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
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

  if (tweets.length === 0) {
    return (
      <div className="p-6 text-center border-b border-gray-800 bg-black">
        <p className="text-gray-400">No tweets yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <>
      <div className="tweet-feed bg-black">
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
