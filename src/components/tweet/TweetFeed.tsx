import React, { useState, useEffect } from 'react';
import { TweetWithAuthor } from '@/types/Tweet';
import TweetCard from './TweetCard';
import { getTweets } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';

interface TweetFeedProps {
  forceRefresh?: boolean;
  userId?: string;
  onAction?: () => void; // handler for tweet interactions
}

const TweetFeed: React.FC<TweetFeedProps> = ({ forceRefresh = false, userId, onAction }) => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        
        let fetchedTweets;
        
        // If userId is provided, we'll fetch tweets for that specific user
        if (userId) {
          const { getUserTweets } = await import('@/services/tweetService');
          fetchedTweets = await getUserTweets(userId, 20, 0, forceRefresh);
        } else {
          fetchedTweets = await getTweets(20, 0, forceRefresh);
        }
        
        setTweets(fetchedTweets);
      } catch (error) {
        console.error('Error fetching tweets:', error);
        toast({
          title: "Error",
          description: "Failed to load tweets. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, [forceRefresh, toast, userId]);

  const handleAction = () => {
    // Re-fetch tweets after an action (like, retweet, etc.)
    // This is simple but not optimal for large lists - a better solution would update the specific tweet
    getTweets(20, 0, true).then(setTweets);
    
    // If parent component provided an onAction handler, call it
    if (onAction) {
      onAction();
    }
  };

  const handleError = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive"
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <p className="text-xl font-semibold mb-2">No tweets yet</p>
        <p>Tweets will show up here once posted.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {tweets.map(tweet => (
        <TweetCard 
          key={tweet.id} 
          tweet={tweet} 
          onAction={handleAction}
          onError={handleError}
        />
      ))}
    </div>
  );
};

export default TweetFeed;
