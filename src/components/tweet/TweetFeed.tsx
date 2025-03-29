
import { useState, useEffect } from 'react';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getTweets, getUserTweets } from '@/services/tweetService';
import { useProfile } from '@/contexts/ProfileContext';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
  feedType?: 'all' | 'user' | 'following' | 'user-retweets';
}

const TweetFeed = ({ userId, limit = 20, feedType = 'all' }: TweetFeedProps) => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchTweets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[TweetFeed] Starting to fetch tweets - feedType=${feedType}, userId=${userId}, limit=${limit}`);
      
      let tweetsData: TweetWithAuthor[] = [];
      
      if (feedType === 'user' && userId) {
        // Fetch user-specific tweets
        tweetsData = await getUserTweets(userId, limit, 0, false);
      } else if (feedType === 'user-retweets' && userId) {
        // Fetch user's retweets
        tweetsData = await getUserTweets(userId, limit, 0, true);
      } else {
        // Fetch all tweets
        tweetsData = await getTweets(limit);
      }
      
      // Filter out tweets that don't have proper author information
      const validTweets = tweetsData.filter(tweet => {
        if (!tweet.author || !tweet.author.username) {
          console.warn(`[TweetFeed] Tweet ${tweet.id} has invalid author data, skipping`, tweet);
          return false;
        }
        return true;
      });
      
      console.log(`[TweetFeed] Fetched ${validTweets.length} valid tweets out of ${tweetsData.length} total`);
      
      if (validTweets.length > 0) {
        console.log('[TweetFeed] First tweet with author:', validTweets[0]);
      }
      
      setTweets(validTweets);
    } catch (err) {
      console.error('[TweetFeed] Failed to fetch tweets:', err);
      setError('Failed to load tweets. Please try again later.');
      
      toast({
        title: "Error",
        description: 'Failed to load tweets. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, [limit, feedType, userId, user]);

  const handleTweetAction = () => {
    // Refresh the feed when actions like like, retweet, etc. happen
    fetchTweets();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-3 sm:p-8 bg-crypto-darkgray rounded-lg">
        <Loader2 className="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-crypto-blue" />
        <span className="ml-2 text-xs sm:text-base text-gray-400">Loading tweets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-6 text-center bg-crypto-darkgray rounded-lg">
        <p className="text-red-500 mb-4 text-xs sm:text-base">{error}</p>
        <button 
          onClick={fetchTweets}
          className="bg-crypto-blue text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm hover:bg-crypto-blue/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="p-3 sm:p-6 text-center border-b border-gray-800 rounded-lg bg-crypto-darkgray">
        <p className="text-gray-400 text-xs sm:text-base">
          {feedType === 'user' ? 'No tweets yet. Post something to get started!' : 
           feedType === 'user-retweets' ? 'No retweets yet.' : 
           'No tweets found in the database. Please post something to get started!'}
        </p>
      </div>
    );
  }

  return (
    <div className="tweet-feed rounded-lg overflow-hidden bg-crypto-darkgray border border-gray-800">
      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          onLike={handleTweetAction}
          onRetweet={handleTweetAction}
          onReply={handleTweetAction}
          onDelete={handleTweetAction}
        />
      ))}
    </div>
  );
};

export default TweetFeed;
