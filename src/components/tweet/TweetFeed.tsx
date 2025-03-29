
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
        
        // First fetch tweets
        let tweetsQuery = supabase.from('tweets').select('*');
        
        if (feedType === 'user' && userId) {
          tweetsQuery = tweetsQuery.eq('author_id', userId);
        } else if (feedType === 'user-retweets' && userId) {
          tweetsQuery = tweetsQuery.eq('author_id', userId).eq('is_retweet', true);
        }
        
        const { data: tweetsData, error: tweetsError } = await tweetsQuery
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (tweetsError) {
          console.error('[TweetFeed] Error fetching tweets:', tweetsError);
          throw tweetsError;
        }
        
        if (!tweetsData || tweetsData.length === 0) {
          console.log('[TweetFeed] No tweets found');
          setTweets([]);
          setLoading(false);
          return;
        }
        
        console.log(`[TweetFeed] Fetched ${tweetsData.length} tweets`);
        
        // Now fetch author information for each tweet
        const authorIds = [...new Set(tweetsData.map(tweet => tweet.author_id))];
        console.log('[TweetFeed] Fetching profiles for author IDs:', authorIds);
        
        const { data: authorsData, error: authorsError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
          .in('id', authorIds);
          
        if (authorsError) {
          console.error('[TweetFeed] Error fetching authors:', authorsError);
          throw authorsError;
        }
        
        // Create a map of author IDs to author data for easy lookup
        const authorsMap = new Map();
        authorsData?.forEach(author => {
          authorsMap.set(author.id, author);
        });
        
        console.log('[TweetFeed] Authors map created with', authorsMap.size, 'entries');
        
        // Combine tweet data with author data
        const tweetsWithAuthors = tweetsData.map(tweet => {
          const author = authorsMap.get(tweet.author_id);
          
          if (!author) {
            console.warn(`[TweetFeed] No author found for tweet ${tweet.id} with author_id ${tweet.author_id}`);
          }
          
          return {
            id: tweet.id,
            content: tweet.content,
            author_id: tweet.author_id,
            created_at: tweet.created_at,
            likes_count: tweet.likes_count || 0,
            retweets_count: tweet.retweets_count || 0,
            replies_count: tweet.replies_count || 0,
            is_retweet: tweet.is_retweet || false,
            original_tweet_id: tweet.original_tweet_id,
            image_url: tweet.image_url,
            author: {
              id: author?.id || tweet.author_id,
              username: author?.username || 'unknown',
              display_name: author?.display_name || 'Unknown User',
              avatar_url: author?.avatar_url || '',
              avatar_nft_id: author?.avatar_nft_id,
              avatar_nft_chain: author?.avatar_nft_chain
            }
          };
        });
        
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
