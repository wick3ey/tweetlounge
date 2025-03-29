
import { useState, useEffect } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
}

const TweetFeed = ({ userId, limit = 20 }: TweetFeedProps) => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAuthor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedTweets = await getTweets(limit, 0);
        
        // Log a sample tweet for debugging
        if (fetchedTweets.length > 0) {
          console.log('Sample tweet data:', fetchedTweets[0]);
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
  }, [limit, toast]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const freshTweets = await getTweets(limit, 0);
      setTweets(freshTweets);
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
    // Refresh the feed when closing the detail view to show updated likes/comments
    handleRefresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
        <span className="ml-2 text-gray-400">Loading tweets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-black">
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
          />
        ))}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-black border-gray-800 p-0 max-h-[90vh] overflow-auto">
          {selectedTweet && (
            <TweetDetail 
              tweet={selectedTweet} 
              onClose={handleCloseDetail}
              onAction={handleRefresh}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TweetFeed;
