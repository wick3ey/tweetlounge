
import { useState, useEffect } from 'react';
import TweetCard from '@/components/tweet/TweetCard';
import { TweetWithAuthor } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

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
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[TweetFeed] Starting to fetch tweets - feedType=${feedType}, userId=${userId}, limit=${limit}`);
        
        // Step 1: Fetch tweets based on feed type
        let tweetsQuery = supabase
          .from('tweets')
          .select(`
            id,
            content,
            author_id,
            created_at,
            likes_count,
            retweets_count,
            replies_count,
            is_retweet,
            original_tweet_id,
            image_url
          `)
          .order('created_at', { ascending: false });
        
        // Apply filters based on feedType
        if (feedType === 'user' && userId) {
          tweetsQuery = tweetsQuery.eq('author_id', userId);
        } else if (feedType === 'user-retweets' && userId) {
          tweetsQuery = tweetsQuery.eq('author_id', userId).eq('is_retweet', true);
        }
        
        // Apply limit
        tweetsQuery = tweetsQuery.limit(limit);
        
        // Execute the query
        const { data: tweetsData, error: tweetsError } = await tweetsQuery;
        
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
        
        // Step 2: Get all unique author IDs from tweets
        const authorIds = [...new Set(tweetsData.map(tweet => tweet.author_id))];
        
        console.log(`[TweetFeed] Found ${authorIds.length} unique authors, IDs:`, authorIds);
        
        // Step 3: Fetch all authors using a different approach with "in" filter
        const { data: authorsData, error: authorsError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds);
        
        if (authorsError) {
          console.error('[TweetFeed] Error fetching authors:', authorsError);
          throw authorsError;
        }
        
        console.log(`[TweetFeed] Fetched ${authorsData?.length || 0} authors`, authorsData);
        
        // Create a map of author IDs to author data for quick lookup
        const authorsMap = {};
        if (authorsData) {
          authorsData.forEach(author => {
            console.log(`[TweetFeed] Adding author to map: id=${author.id}, username=${author.username}`);
            authorsMap[author.id] = author;
          });
        }
        
        // Step 4: Combine tweets with their authors
        const tweetsWithAuthors = tweetsData.map(tweet => {
          const author = authorsMap[tweet.author_id];
          
          if (!author) {
            console.warn(`[TweetFeed] Author not found for tweet ${tweet.id}, author_id: ${tweet.author_id}`);
          }
          
          // Use the RPC function to get the profile data if not found in the map
          const tweetWithAuthor = {
            ...tweet,
            author: author ? {
              id: author.id,
              username: author.username || 'unknown',
              display_name: author.display_name || 'Unknown User',
              avatar_url: author.avatar_url || '',
              avatar_nft_id: author.avatar_nft_id,
              avatar_nft_chain: author.avatar_nft_chain
            } : {
              id: tweet.author_id,
              username: 'unknown',
              display_name: 'Unknown User',
              avatar_url: '',
              avatar_nft_id: null,
              avatar_nft_chain: null
            }
          };
          
          return tweetWithAuthor;
        });
        
        console.log('[TweetFeed] First tweet with author:', tweetsWithAuthors[0]);
        
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
