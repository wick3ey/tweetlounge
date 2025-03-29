
import { useState, useEffect } from 'react';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[TweetFeed] Starting to fetch tweets - feedType=${feedType}, userId=${userId}, limit=${limit}`);
        
        // Approach 1: Use the Supabase stored procedure directly
        // This is more reliable as it handles the join on the server side
        let tweetsData;
        let tweetsError;
        
        if (feedType === 'all') {
          // Use get_tweets_with_authors stored procedure
          const { data, error } = await supabase
            .rpc('get_tweets_with_authors', { limit_count: limit });
            
          tweetsData = data;
          tweetsError = error;
          
        } else if (feedType === 'user' && userId) {
          // Use get_user_tweets stored procedure
          const { data, error } = await supabase
            .rpc('get_user_tweets', { user_id: userId, limit_count: limit });
            
          tweetsData = data;
          tweetsError = error;
          
        } else if (feedType === 'user-retweets' && userId) {
          // Use get_user_retweets stored procedure
          const { data, error } = await supabase
            .rpc('get_user_retweets', { user_id: userId, limit_count: limit });
            
          tweetsData = data;
          tweetsError = error;
        }
        
        if (tweetsError) {
          console.error('[TweetFeed] Error fetching tweets with RPC:', tweetsError);
          throw tweetsError;
        }
        
        if (!tweetsData || tweetsData.length === 0) {
          console.log('[TweetFeed] No tweets found using RPC method');
          setTweets([]);
          setLoading(false);
          return;
        }
        
        console.log(`[TweetFeed] Fetched ${tweetsData.length} tweets with authors using RPC`);
        console.log(`[TweetFeed] Sample tweet:`, tweetsData[0]);
        
        // Transform the data to match our TweetWithAuthor type
        const tweetsWithAuthors = tweetsData.map(tweet => ({
          id: tweet.id,
          content: tweet.content,
          author_id: tweet.author_id,
          created_at: tweet.created_at,
          likes_count: tweet.likes_count,
          retweets_count: tweet.retweets_count,
          replies_count: tweet.replies_count,
          is_retweet: tweet.is_retweet,
          original_tweet_id: tweet.original_tweet_id,
          image_url: tweet.image_url,
          author: {
            id: tweet.author_id,
            username: tweet.username || 'unknown',
            display_name: tweet.display_name || tweet.username || 'Unknown User',
            avatar_url: tweet.avatar_url || '',
            avatar_nft_id: tweet.avatar_nft_id,
            avatar_nft_chain: tweet.avatar_nft_chain
          }
        }));
        
        console.log('[TweetFeed] First tweet with author after transform:', tweetsWithAuthors[0]);
        
        setTweets(tweetsWithAuthors);
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

    fetchTweets();
  }, [limit, toast, feedType, userId]);

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
          onClick={() => window.location.reload()}
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
          onLike={() => {}}
          onRetweet={() => {}}
          onReply={() => {}}
        />
      ))}
    </div>
  );
};

export default TweetFeed;
