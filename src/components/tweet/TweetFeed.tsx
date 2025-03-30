import { useState, useEffect } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor } from '@/types/Tweet';
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTweets();
  }, [limit, userId]);

  const fetchTweets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedTweets = await getTweets(limit, 0);
      
      // Process tweets to get original tweet information for retweets
      const processedTweets = await Promise.all(fetchedTweets.map(async (tweet) => {
        if (tweet.is_retweet && tweet.original_tweet_id) {
          try {
            // Get the original tweet with author information
            const { data: originalTweetData, error: originalTweetError } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: tweet.original_tweet_id });
            
            if (originalTweetError) {
              console.error('Error fetching original tweet:', originalTweetError);
              return {
                ...tweet,
                // Keep original information intact but mark that we failed to get original
                error_fetching_original: true
              };
            }
            
            if (originalTweetData && originalTweetData.length > 0) {
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
            } else {
              console.error('Original tweet not found for tweet:', tweet.id, 'original_id:', tweet.original_tweet_id);
              // Return the tweet with a flag indicating the original was not found
              return {
                ...tweet,
                original_tweet_not_found: true
              };
            }
          } catch (err) {
            console.error('Error processing retweet:', err);
            return tweet;
          }
        } else if (tweet.is_retweet && !tweet.original_tweet_id) {
          // Handle case where is_retweet is true but original_tweet_id is null
          console.error('Found retweet with null original_tweet_id:', tweet.id);
          return {
            ...tweet,
            invalid_retweet: true
          };
        }
        
        return tweet;
      }));
      
      // Log a sample tweet for debugging
      if (processedTweets.length > 0) {
        console.log('Sample tweet data:', processedTweets[0]);
      }
      
      setTweets(processedTweets);
    } catch (err) {
      console.error('Failed to fetch tweets:', err);
      setError('Failed to load tweets. Please try again later.');
      
      toast({
        title: 'Error',
        description: 'Failed to load tweets. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TweetFeed;
