import { useState, useEffect } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor, isValidTweet, isValidRetweet, getSafeTweetId } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ErrorDialog } from '@/components/ui/error-dialog';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
  onCommentAdded?: () => void;
}

const TweetFeed = ({ userId, limit = 20, onCommentAdded }: TweetFeedProps) => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAuthor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({title: '', description: ''});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTweets();
    
    const channel = supabase
      .channel('public:tweets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('Realtime update on tweets:', payload);
        fetchTweets(false);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('Realtime update on comments:', payload);
        if (payload.eventType === 'INSERT' && payload.new) {
          const commentedTweetId = payload.new.tweet_id;
          updateTweetCommentCount(commentedTweetId);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, userId]);

  const updateTweetCommentCount = async (tweetId: string) => {
    try {
      const { count, error } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('tweet_id', tweetId);
      
      if (error) {
        console.error('Error counting comments for tweet update:', error);
        return;
      }
      
      const commentCount = typeof count === 'number' ? count : 0;
      console.log(`Updating tweet ${tweetId} comment count to ${commentCount} in UI`);
      
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, replies_count: commentCount } 
            : tweet
        )
      );
      
      await supabase
        .from('tweets')
        .update({ replies_count: commentCount })
        .eq('id', tweetId);
    } catch (err) {
      console.error('Failed to update tweet comment count:', err);
    }
  };

  const fetchTweets = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const fetchedTweets = await getTweets(limit, 0);
      
      const validTweets = fetchedTweets.filter(tweet => {
        if (!isValidTweet(tweet)) {
          const tweetId = getSafeTweetId(tweet);
          console.error('Filtered out invalid tweet:', tweetId);
          return false;
        }
        
        if (tweet.is_retweet && !isValidRetweet(tweet)) {
          const tweetId = getSafeTweetId(tweet);
          console.error('Filtered out invalid retweet with null original_tweet_id:', tweetId);
          console.log('Invalid retweet details:', JSON.stringify(tweet, null, 2));
          return false;
        }
        return true;
      });
      
      const processedTweets = await Promise.all(validTweets.map(async (tweet) => {
        if (tweet.is_retweet && tweet.original_tweet_id) {
          try {
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: tweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              return null;
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
              const originalTweet = originalTweetData[0];
              
              return {
                ...tweet,
                content: originalTweet.content,
                image_url: originalTweet.image_url,
                original_author: {
                  id: originalTweet.author_id,
                  username: originalTweet.username,
                  display_name: originalTweet.display_name,
                  avatar_url: originalTweet.avatar_url || '',
                  avatar_nft_id: originalTweet.avatar_nft_id,
                  avatar_nft_chain: originalTweet.avatar_nft_chain,
                  replies_sort_order: originalTweet.replies_sort_order
                }
              };
            }
          } catch (err) {
            console.error('Error processing retweet:', err);
            return null;
          }
        }
        
        return tweet;
      }));
      
      const filteredTweets = processedTweets
        .filter((tweet): tweet is TweetWithAuthor => tweet !== null);
      
      const finalTweets = filteredTweets.filter(tweet => {
        if (!isValidTweet(tweet)) {
          const tweetId = getSafeTweetId(tweet);
          console.error('Removing invalid tweet after processing:', tweetId);
          return false;
        }
        return true;
      });
      
      setTweets(finalTweets);
    } catch (err) {
      console.error('Failed to fetch tweets:', err);
      setError('Failed to load tweets. Please try again later.');
      
      toast({
        title: "Error",
        description: "Failed to load tweets. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const freshTweets = await getTweets(limit, 0);
      
      const processedTweets = await Promise.all(freshTweets.map(async (tweet) => {
        if (tweet.is_retweet && tweet.original_tweet_id) {
          try {
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: tweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet during refresh:', originalTweetError);
              return tweet;
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
              const originalTweet = originalTweetData[0];
              
              return {
                ...tweet,
                content: originalTweet.content,
                image_url: originalTweet.image_url,
                original_author: {
                  id: originalTweet.author_id,
                  username: originalTweet.username,
                  display_name: originalTweet.display_name,
                  avatar_url: originalTweet.avatar_url || '',
                  avatar_nft_id: originalTweet.avatar_nft_id,
                  avatar_nft_chain: originalTweet.avatar_nft_chain,
                  replies_sort_order: originalTweet.replies_sort_order
                }
              };
            }
          } catch (err) {
            console.error('Error refreshing retweet:', err);
          }
        }
        
        return tweet;
      }));
      
      const validTweets = processedTweets
        .filter((tweet): tweet is TweetWithAuthor => 
          tweet !== null && isValidTweet(tweet)
        );
      
      setTweets(validTweets);
    } catch (err) {
      console.error('Failed to refresh tweets:', err);
      toast({
        title: 'Error',
        description: 'Failed to refresh tweets.',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTweetClick = (tweet: TweetWithAuthor) => {
    setSelectedTweet(tweet);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedTweet(null);
    
    if (selectedTweet) {
      updateTweetCommentCount(selectedTweet.id);
    }
    
    handleRefresh();
  };

  const handleCommentAdded = (tweetId: string) => {
    updateTweetCommentCount(tweetId);
    
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleTweetDeleted = (deletedTweetId: string) => {
    setTweets(prevTweets => prevTweets.filter(tweet => tweet.id !== deletedTweetId));
    
    setTweets(prevTweets => prevTweets.filter(tweet => 
      !(tweet.is_retweet && tweet.original_tweet_id === deletedTweetId)
    ));
    
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
      setTweets(prevTweets => prevTweets.filter(tweet => 
        !(tweet.is_retweet && 
          tweet.original_tweet_id === originalTweetId && 
          tweet.author_id === user.id)
      ));
    }
  };

  const handleError = (title: string, description: string) => {
    setErrorDetails({ title, description });
    setIsErrorDialogOpen(true);
  };

  if (loading) {
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
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
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
