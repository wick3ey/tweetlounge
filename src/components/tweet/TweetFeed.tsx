
import { useState, useEffect } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor, isValidTweet, isValidRetweet } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTweets();
    
    // Setup realtime subscription for new tweets
    const channel = supabase
      .channel('public:tweets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('Realtime update:', payload);
        // Refresh tweets when we get a notification about changes
        fetchTweets(false); // Don't show loading indicator for realtime updates
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, userId]);

  const fetchTweets = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const fetchedTweets = await getTweets(limit, 0);
      
      // First, filter out any tweets with corrupted data using our type guard
      const validTweets = fetchedTweets.filter(tweet => {
        if (!isValidTweet(tweet)) {
          // Fix: Check if tweet exists before accessing its id
          const tweetId = tweet?.id ? tweet.id : 'unknown';
          console.error('Filtered out invalid tweet:', tweetId);
          return false;
        }
        
        // Special validation for retweets
        if (tweet.is_retweet && !isValidRetweet(tweet)) {
          console.error('Filtered out invalid retweet with null original_tweet_id:', tweet.id);
          // Log details to help debug
          console.log('Invalid retweet details:', JSON.stringify(tweet, null, 2));
          return false;
        }
        return true;
      });
      
      // Process tweets to get original tweet information for retweets (only for valid retweets)
      const processedTweets = await Promise.all(validTweets.map(async (tweet) => {
        if (tweet.is_retweet && tweet.original_tweet_id) {
          try {
            // Get the original tweet with author information
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: tweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              // Skip this retweet
              return null;
            }
            
            if (!originalTweetData || originalTweetData.length === 0) {
              console.error('Original tweet not found for retweet:', tweet.id, 'original_id:', tweet.original_tweet_id);
              // Skip this retweet since the original was likely deleted
              return null;
            }
            
            const originalTweet = originalTweetData[0];
            
            // IMPORTANT: Copy both the original author AND the content
            return {
              ...tweet,
              // Use the original tweet's content
              content: originalTweet.content,
              image_url: originalTweet.image_url,
              // Add the original author information
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
          } catch (err) {
            console.error('Error processing retweet:', err);
            return null;
          }
        }
        
        return tweet;
      }));
      
      // Filter out any null entries (retweets with missing originals)
      // Fix: Add type assertion to handle null values properly
      const filteredTweets = processedTweets
        .filter((tweet): tweet is TweetWithAuthor => tweet !== null);
      
      // One more validation pass to ensure no invalid retweets
      const finalTweets = filteredTweets.filter(tweet => {
        if (!isValidTweet(tweet)) {
          // Fix: Check if tweet exists before accessing its id
          const tweetId = tweet?.id ? tweet.id : 'unknown';
          console.error('Removing invalid tweet after processing:', tweetId);
          return false;
        }
        return true;
      });
      
      // Log a sample tweet for debugging
      if (finalTweets.length > 0) {
        console.log('Sample tweet data:', finalTweets[0]);
      }
      
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
      
      // Process the tweets just like in fetchTweets
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
      
      setTweets(processedTweets);
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
    setSelectedTweet(null); // Clear selected tweet to prevent stale references
    // Refresh the feed when closing the detail view to show updated likes/comments
    handleRefresh();
  };

  const handleCommentAdded = (tweetId: string) => {
    // Update the comment count for a specific tweet in the state
    setTweets(prevTweets => 
      prevTweets.map(tweet => 
        tweet.id === tweetId 
          ? { ...tweet, replies_count: (tweet.replies_count || 0) + 1 } 
          : tweet
      )
    );
    
    // Also trigger parent callback if provided
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleTweetDeleted = (deletedTweetId: string) => {
    // Remove the deleted tweet from the state without needing a full refresh
    setTweets(prevTweets => prevTweets.filter(tweet => tweet.id !== deletedTweetId));
    
    // Also filter out any retweets of the deleted tweet
    setTweets(prevTweets => prevTweets.filter(tweet => 
      !(tweet.is_retweet && tweet.original_tweet_id === deletedTweetId)
    ));
    
    // Close the detail dialog if the deleted tweet was being viewed
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
    // Remove any retweets of this original tweet made by the current user
    if (user) {
      setTweets(prevTweets => prevTweets.filter(tweet => 
        !(tweet.is_retweet && 
          tweet.original_tweet_id === originalTweetId && 
          tweet.author_id === user.id)
      ));
    }
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
          />
        ))}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-black border-gray-800 p-0 max-h-[90vh] overflow-hidden">
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
    </>
  );
};

export default TweetFeed;
