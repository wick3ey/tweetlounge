
import { useState, useEffect } from 'react';
import { getTweets, getUserTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fetchedTweets: TweetWithAuthor[] = [];
        
        if (feedType === 'all') {
          // Fetch global feed
          fetchedTweets = await getTweets(limit, 0);
        } else if (feedType === 'user' && userId) {
          // Fetch user's posts only
          fetchedTweets = await getUserTweets(userId, limit, 0);
        } else if (feedType === 'user-retweets' && userId) {
          // Fetch user's retweets
          fetchedTweets = await getUserTweets(userId, limit, 0, true);
        } else {
          // Default to global feed
          fetchedTweets = await getTweets(limit, 0);
        }
        
        setTweets(fetchedTweets);
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

    fetchTweets();
  }, [limit, toast, feedType, userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4 sm:p-8 bg-crypto-darkgray rounded-lg">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-crypto-blue" />
        <span className="ml-2 text-sm sm:text-base text-gray-400">Loading tweets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 text-center bg-crypto-darkgray rounded-lg">
        <p className="text-red-500 mb-4 text-sm sm:text-base">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-crypto-blue text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm hover:bg-crypto-blue/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center border-b border-gray-800 rounded-lg bg-crypto-darkgray">
        <p className="text-gray-400 text-sm sm:text-base">
          {feedType === 'user' ? 'No tweets yet. Post something to get started!' : 
           feedType === 'user-retweets' ? 'No retweets yet.' : 
           'No tweets yet. Be the first to post!'}
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
          onLike={() => {}}
          onRetweet={() => {}}
          onReply={() => {}}
        />
      ))}
    </div>
  );
};

export default TweetFeed;
