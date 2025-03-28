
import { useState, useEffect } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
}

const TweetFeed = ({ userId, limit = 20 }: TweetFeedProps) => {
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
        
        const fetchedTweets = await getTweets(limit, 0);
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
  }, [limit, toast]);

  const handleLike = (tweetId: string) => {
    // This will be handled directly in the TweetCard component
  };

  const handleRetweet = (tweetId: string) => {
    // This will be handled directly in the TweetCard component
  };

  const handleReply = (tweetId: string) => {
    // This will be handled directly in the TweetCard component
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-twitter-blue" />
        <span className="ml-2 text-gray-500">Loading tweets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-twitter-blue text-white px-4 py-2 rounded-full hover:bg-twitter-blue/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="p-6 text-center border-b border-gray-200">
        <p className="text-gray-500">No tweets yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="tweet-feed">
      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          onLike={() => handleLike(tweet.id)}
          onRetweet={() => handleRetweet(tweet.id)}
          onReply={() => handleReply(tweet.id)}
        />
      ))}
    </div>
  );
};

export default TweetFeed;
