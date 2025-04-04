import { useState, useEffect, useRef, useCallback } from 'react';
import { getTweets } from '@/services/tweetService';
import TweetCard from '@/components/tweet/TweetCard';
import TweetDetail from '@/components/tweet/TweetDetail';
import { TweetWithAuthor, isValidTweet, isValidRetweet, getSafeTweetId, enhanceTweetData, createPartialProfile } from '@/types/Tweet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { updateTweetCommentCount } from '@/services/commentService';
import { getFromLocalStorage, setInLocalStorage } from '@/utils/tweetCacheService';

interface TweetFeedProps {
  userId?: string;
  limit?: number;
  onCommentAdded?: () => void;
  forceRefresh?: boolean;
}

const TWEETS_PER_PAGE = 10;
const LOCAL_STATE_KEY = 'tweet-feed-state';

const TweetFeed = ({ userId, limit = TWEETS_PER_PAGE, onCommentAdded, forceRefresh = false }: TweetFeedProps) => {
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAuthor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({title: '', description: ''});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const isMounted = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastTweetElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreTweets();
      }
    }, { rootMargin: '200px' });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    const savedState = getFromLocalStorage<{
      tweets: TweetWithAuthor[],
      page: number,
      hasMore: boolean
    }>(LOCAL_STATE_KEY);
    
    if (savedState && savedState.tweets.length > 0) {
      setTweets(savedState.tweets);
      setPage(savedState.page);
      setHasMore(savedState.hasMore);
      setLoading(false);
      setInitialLoadComplete(true);
      
      refreshTimeoutRef.current = setTimeout(() => fetchTweets(false), 200);
    } else {
      fetchTweets(true);
    }
  }, []);

  useEffect(() => {
    if (initialLoadComplete && tweets.length > 0) {
      setInLocalStorage(LOCAL_STATE_KEY, {
        tweets,
        page,
        hasMore
      });
    }
  }, [tweets, page, hasMore, initialLoadComplete]);

  useEffect(() => {
    isMounted.current = true;
    
    const tweetsChannel = supabase
      .channel('public:tweets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets'
      }, (payload) => {
        console.log('Realtime update on tweets:', payload);
        
        if (payload.eventType === 'INSERT') {
          if (debounceTimeRef.current) {
            clearTimeout(debounceTimeRef.current);
          }
          debounceTimeRef.current = setTimeout(() => {
            fetchNewTweets();
          }, 1000);
        } else {
          if (debounceTimeRef.current) {
            clearTimeout(debounceTimeRef.current);
          }
          debounceTimeRef.current = setTimeout(() => {
            refreshCurrentTweets();
          }, 1000);
        }
      })
      .subscribe();
      
    const commentsChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, (payload) => {
        console.log('Realtime update on comments:', payload);
        if (payload.new && typeof payload.new === 'object' && 'tweet_id' in payload.new) {
          const commentedTweetId = payload.new.tweet_id as string;
          if (debounceTimeRef.current) {
            clearTimeout(debounceTimeRef.current);
          }
          debounceTimeRef.current = setTimeout(() => {
            updateTweetCommentCount(commentedTweetId).then(() => {
              updateTweetCommentCountInUI(commentedTweetId);
            });
          }, 1000);
        }
      })
      .subscribe();
      
    return () => {
      isMounted.current = false;
      supabase.removeChannel(tweetsChannel);
      supabase.removeChannel(commentsChannel);
      
      if (observer.current) observer.current.disconnect();
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (debounceTimeRef.current) {
        clearTimeout(debounceTimeRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (forceRefresh) {
      console.debug('[TweetFeed] Force refresh triggered');
      fetchTweets(true, true);
    }
  }, [forceRefresh]);

  const fetchNewTweets = async () => {
    if (!isMounted.current) return;
    
    try {
      const newestTweetDate = tweets.length > 0 ? tweets[0].created_at : new Date().toISOString();
      
      const { data, error } = await supabase
        .rpc('get_tweets_with_authors_reliable', { 
          limit_count: 5,
          offset_count: 0 
        });
        
      if (error) throw error;
      
      if (!data || data.length === 0 || !isMounted.current) return;
      
      const newTweets = (data as any[])
        .map(transformTweetData)
        .filter(tweet => tweet && new Date(tweet.created_at) > new Date(newestTweetDate));
        
      if (newTweets.length === 0 || !isMounted.current) return;
      
      setTweets(prev => [...newTweets, ...prev]);
      
    } catch (err) {
      console.error('Error fetching new tweets:', err);
    }
  };

  const refreshCurrentTweets = async () => {
    if (tweets.length === 0 || !isMounted.current) return;
    
    try {
      const ids = tweets.slice(0, 10).map(t => t.id);
      
      const freshTweets = await Promise.all(
        ids.map(async (id) => {
          try {
            const { data, error } = await supabase
              .rpc('get_tweet_with_author_reliable', { tweet_id: id });
              
            if (error || !data || data.length === 0) return null;
            
            return transformTweetData(data[0]);
          } catch (err) {
            console.error(`Error refreshing tweet ${id}:`, err);
            return null;
          }
        })
      );
      
      if (!isMounted.current) return;
      
      const validFreshTweets = freshTweets.filter(t => t !== null) as TweetWithAuthor[];
      
      if (validFreshTweets.length > 0) {
        setTweets(prev => {
          const updatedTweets = [...prev];
          
          validFreshTweets.forEach(freshTweet => {
            const index = updatedTweets.findIndex(t => t.id === freshTweet.id);
            if (index !== -1) {
              updatedTweets[index] = freshTweet;
            }
          });
          
          return updatedTweets;
        });
      }
    } catch (err) {
      console.error('Error refreshing tweets:', err);
    }
  };

  const transformTweetData = (item: any): TweetWithAuthor | null => {
    if (!item) return null;
    
    const transformedTweet = {
      id: item.id,
      content: item.content,
      author_id: item.author_id,
      created_at: item.created_at,
      likes_count: item.likes_count || 0,
      retweets_count: item.retweets_count || 0,
      replies_count: item.replies_count || 0,
      is_retweet: item.is_retweet === true,
      original_tweet_id: item.original_tweet_id,
      image_url: item.image_url,
      profile_username: item.profile_username || item.username,
      profile_display_name: item.profile_display_name || item.display_name,
      profile_avatar_url: item.profile_avatar_url || item.avatar_url,
      profile_avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
      profile_avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain,
      author: createPartialProfile({
        id: item.author_id,
        username: item.profile_username || item.username,
        display_name: item.profile_display_name || item.display_name || item.username,
        avatar_url: item.profile_avatar_url || item.avatar_url || '',
        avatar_nft_id: item.profile_avatar_nft_id || item.avatar_nft_id,
        avatar_nft_chain: item.profile_avatar_nft_chain || item.avatar_nft_chain
      })
    };
    
    return enhanceTweetData(transformedTweet);
  };

  const updateTweetCommentCountInUI = async (tweetId: string) => {
    if (!isMounted.current) return;
    
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('replies_count')
        .eq('id', tweetId)
        .single();
      
      if (error) {
        console.error('Error fetching updated tweet count:', error);
        return;
      }
      
      if (!isMounted.current) return;
      
      console.log(`Updating tweet ${tweetId} comment count in UI to ${data.replies_count}`);
      
      setTweets(prevTweets => 
        prevTweets.map(tweet => 
          tweet.id === tweetId 
            ? { ...tweet, replies_count: data.replies_count } 
            : tweet
        )
      );
    } catch (err) {
      console.error('Failed to update tweet comment count in UI:', err);
    }
  };

  const loadMoreTweets = async () => {
    if (loadingMore || !hasMore || !isMounted.current) return;
    
    const nextPage = page + 1;
    setLoadingMore(true);
    setPage(nextPage);
    
    try {
      const offset = nextPage * TWEETS_PER_PAGE;
      const fetchedTweets = await getTweets(TWEETS_PER_PAGE, offset);
      
      if (!isMounted.current) return;
      
      if (fetchedTweets.length === 0) {
        setHasMore(false);
      } else {
        setTweets(prev => [...prev, ...fetchedTweets]);
      }
    } catch (err) {
      console.error('Error loading more tweets:', err);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to load more tweets. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  };

  const fetchTweets = async (showLoading = true, forceRefresh = false) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    try {
      if (showLoading && isMounted.current) {
        setLoading(true);
      }
      if (isMounted.current) {
        setError(null);
        setPage(0);
      }
      
      console.debug('[TweetFeed] Fetching tweets with force refresh:', forceRefresh);
      
      const freshTweets = await getTweets(TWEETS_PER_PAGE, 0, forceRefresh);
      
      if (!isMounted.current) return;
      
      if (freshTweets.length === 0) {
        setTweets([]);
        setHasMore(false);
      } else {
        setTweets(freshTweets);
        setHasMore(freshTweets.length === TWEETS_PER_PAGE);
      }
      
      setInitialLoadComplete(true);
      
      fetchTimeoutRef.current = setTimeout(() => {
        prefetchNextBatch();
      }, 1000);
      
    } catch (err) {
      console.error('[TweetFeed] Failed to fetch tweets:', err);
      if (isMounted.current) {
        setError('Failed to load tweets. Please try again later.');
        
        toast({
          title: "Error",
          description: "Failed to load tweets. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const prefetchNextBatch = async () => {
    try {
      await supabase
        .rpc('get_tweets_with_authors_reliable', { 
          limit_count: TWEETS_PER_PAGE, 
          offset_count: TWEETS_PER_PAGE 
        });
      
      console.log(`Prefetched tweets for faster loading`);
    } catch (err) {
      console.error('Error prefetching tweets:', err);
    }
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    fetchTweets(false).finally(() => {
      setIsRefreshing(false);
    });
  };

  const handleTweetClick = (tweet: TweetWithAuthor) => {
    setSelectedTweet(tweet);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    
    if (selectedTweet) {
      updateTweetCommentCount(selectedTweet.id);
    }
    
    setSelectedTweet(null);
    handleRefresh();
  };

  const handleCommentAdded = (tweetId: string) => {
    updateTweetCommentCount(tweetId);
    
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleTweetDeleted = (deletedTweetId: string) => {
    setTweets(prevTweets => prevTweets.filter(tweet => tweet.id !== deletedTweetId));
    
    setTweets(prevTweets => prevTweets.filter(tweet => 
      !(tweet.is_retweet && tweet.original_tweet_id === deletedTweetId)
    ));
    
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
    if (user) {
      setTweets(prevTweets => prevTweets.filter(tweet => 
        !(tweet.is_retweet && 
          tweet.original_tweet_id === originalTweetId && 
          tweet.author_id === user.id)
      ));
    }
  };

  const handleError = (title: string, description: string) => {
    setErrorDetails({ title, description });
    setIsErrorDialogOpen(true);
  };

  if (loading && tweets.length === 0) {
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
        {tweets.map((tweet, index) => {
          if (tweets.length === index + 1) {
            return (
              <div key={tweet.id} ref={lastTweetElementRef}>
                <TweetCard
                  tweet={tweet}
                  onClick={() => handleTweetClick(tweet)}
                  onAction={handleRefresh}
                  onDelete={handleTweetDeleted}
                  onRetweetRemoved={handleRetweetRemoved}
                  onError={handleError}
                />
              </div>
            );
          } else {
            return (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                onClick={() => handleTweetClick(tweet)}
                onAction={handleRefresh}
                onDelete={handleTweetDeleted}
                onRetweetRemoved={handleRetweetRemoved}
                onError={handleError}
              />
            );
          }
        })}

        {loadingMore && (
          <div className="flex justify-center items-center py-4" ref={loaderRef}>
            <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
            <span className="ml-2 text-gray-400">Loading more tweets...</span>
          </div>
        )}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-black border-gray-800 p-0 max-h-[90vh] overflow-hidden">
          <VisuallyHidden asChild>
            <DialogTitle>Tweet Detail</DialogTitle>
          </VisuallyHidden>
          
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
      
      <ErrorDialog 
        open={isErrorDialogOpen}
        onOpenChange={setIsErrorDialogOpen}
        title={errorDetails.title}
        description={errorDetails.description}
        variant="error"
      />
    </>
  );
};

export default TweetFeed;
