
import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserTweets } from '@/services/tweetService';
import { getUserComments } from '@/services/commentService';
import { TweetWithAuthor, isValidTweet, enhanceTweetData, createPartialProfile } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { Loader, MessageSquare, Reply, FileImage, Coins, Sparkles, RefreshCw } from 'lucide-react';
import { CryptoButton } from '@/components/ui/crypto-button';
import TweetCard from '@/components/tweet/TweetCard';
import CommentCard from '@/components/comment/CommentCard';
import WalletAssets from '@/components/profile/WalletAssets';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  fetchProfileDataWithCache, 
  clearProfileCache 
} from '@/utils/profileCacheService';
import { CACHE_DURATIONS } from '@/utils/cacheService';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileTabsProps {
  userId: string;
  isCurrentUser: boolean;
  solanaAddress: string | null;
}

const ProfileTabs = ({ userId, isCurrentUser, solanaAddress }: ProfileTabsProps) => {
  const [activeTab, setActiveTab] = useState('posts');
  const [tweets, setTweets] = useState<TweetWithAuthor[]>([]);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [mediaTweets, setMediaTweets] = useState<TweetWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetsPreloaded, setAssetsPreloaded] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const refreshTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isInitialLoadRef = useRef(true);
  
  const processRetweetData = async (tweet: TweetWithAuthor): Promise<TweetWithAuthor | null> => {
    const enhancedTweet = enhanceTweetData(tweet);
    if (!enhancedTweet || !isValidTweet(enhancedTweet)) return null;
    
    if (enhancedTweet.is_retweet && enhancedTweet.original_tweet_id) {
      try {
        const { data: originalTweetData, error: originalTweetError } = await supabase
          .rpc('get_tweet_with_author_reliable', { tweet_id: enhancedTweet.original_tweet_id });
        
        if (originalTweetError) {
          console.error('Error fetching original tweet:', originalTweetError);
          return enhancedTweet;
        }
        
        if (originalTweetData && originalTweetData.length > 0) {
          const originalTweet = originalTweetData[0];
          
          return {
            ...enhancedTweet,
            content: originalTweet.content || enhancedTweet.content,
            image_url: originalTweet.image_url || enhancedTweet.image_url,
            original_author: {
              id: originalTweet.author_id,
              username: originalTweet.username || 'user',
              display_name: originalTweet.display_name || 'User',
              avatar_url: originalTweet.avatar_url || '',
              bio: null,
              cover_url: null,
              location: null,
              website: null,
              updated_at: null,
              created_at: new Date().toISOString(),
              ethereum_address: null,
              solana_address: null,
              avatar_nft_id: originalTweet.avatar_nft_id,
              avatar_nft_chain: originalTweet.avatar_nft_chain,
              followers_count: 0,
              following_count: 0,
              replies_sort_order: originalTweet.replies_sort_order
            }
          };
        }
      } catch (err) {
        console.error('Error processing retweet:', err);
      }
    }
    
    return enhancedTweet;
  };
  
  const processTweets = async (tweets: TweetWithAuthor[]): Promise<TweetWithAuthor[]> => {
    try {
      const processedTweets = await Promise.all(tweets.map(processRetweetData));
      
      return processedTweets
        .filter((tweet): tweet is TweetWithAuthor => tweet !== null)
        .filter(tweet => isValidTweet(tweet));
    } catch (err) {
      console.error('Error processing tweets:', err);
      return [];
    }
  };
  
  const fetchTweets = useCallback(async (forceRefresh = false): Promise<TweetWithAuthor[]> => {
    try {
      console.debug(`[ProfileTabs] Fetching tweets for user ${userId} with forceRefresh: ${forceRefresh}`);
      
      if (forceRefresh) {
        try {
          console.debug(`[ProfileTabs] Force clearing profile caches for user ${userId}`);
          localStorage.removeItem(`tweet-cache-profile-${userId}-posts-limit:20-offset:0`);
          localStorage.removeItem(`tweet-cache-profile-${userId}-media-limit:20-offset:0`);
          localStorage.removeItem(`profile-cache-profile-${userId}-posts-limit:20-offset:0`);
          localStorage.removeItem(`profile-cache-profile-${userId}-posts`);
        } catch (e) {
          console.error('[ProfileTabs] Error clearing profile cache:', e);
        }
      }
      
      return await fetchProfileDataWithCache<TweetWithAuthor[]>(
        userId,
        'posts',
        async () => {
          console.debug(`[ProfileTabs] Fetching fresh tweets for user ${userId}`);
          const fetchedTweets = await getUserTweets(userId);
          return processTweets(fetchedTweets);
        },
        { limit: 20, offset: 0 },
        CACHE_DURATIONS.SHORT,
        forceRefresh
      );
    } catch (err) {
      console.error('[ProfileTabs] Error fetching tweets:', err);
      return [];
    }
  }, [userId]);
  
  const fetchMediaTweets = useCallback(async (forceRefresh = false): Promise<TweetWithAuthor[]> => {
    try {
      return await fetchProfileDataWithCache<TweetWithAuthor[]>(
        userId,
        'media',
        async () => {
          const fetchedTweets = await getUserTweets(userId);
          const processedTweets = await processTweets(fetchedTweets);
          return processedTweets.filter(tweet => tweet.image_url);
        },
        { limit: 20, offset: 0 },
        CACHE_DURATIONS.SHORT,
        forceRefresh
      );
    } catch (err) {
      console.error('Error fetching media tweets:', err);
      return [];
    }
  }, [userId]);
  
  const fetchReplies = useCallback(async (forceRefresh = false): Promise<Comment[]> => {
    try {
      return await fetchProfileDataWithCache<Comment[]>(
        userId,
        'replies',
        async () => {
          return await getUserComments(userId);
        },
        { limit: 20, offset: 0 },
        CACHE_DURATIONS.SHORT,
        forceRefresh
      );
    } catch (err) {
      console.error('Error fetching replies:', err);
      return [];
    }
  }, [userId]);
  
  useEffect(() => {
    if (solanaAddress && !assetsPreloaded) {
      import('@/utils/tokenService').then(({ fetchWalletTokens }) => {
        fetchWalletTokens(solanaAddress)
          .then(() => {
            console.log('Preloaded wallet assets data');
            setAssetsPreloaded(true);
          })
          .catch(err => {
            console.warn('Failed to preload wallet assets:', err);
          });
      });
    }
  }, [solanaAddress, assetsPreloaded]);
  
  useEffect(() => {
    const handleCacheClear = (e: CustomEvent) => {
      if (e.detail?.userId === userId) {
        console.debug(`[ProfileTabs] Received cache clear event for user ${userId}`);
        setForceRefreshKey(prev => prev + 1);
        refreshProfileData(true);
      }
    };
    
    window.addEventListener('profile-cache-clear', handleCacheClear as EventListener);
    
    return () => {
      window.removeEventListener('profile-cache-clear', handleCacheClear as EventListener);
    };
  }, [userId]);
  
  const refreshProfileData = useCallback((forceRefresh = false) => {
    const refresh = async () => {
      if (activeTab === 'posts') {
        const freshTweets = await fetchTweets(forceRefresh);
        setTweets(freshTweets);
      } else if (activeTab === 'media') {
        const freshMedia = await fetchMediaTweets(forceRefresh);
        setMediaTweets(freshMedia);
      } else if (activeTab === 'replies') {
        const freshReplies = await fetchReplies(forceRefresh);
        setReplies(freshReplies);
      }
    };

    refresh();
    
    refreshTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    refreshTimeoutsRef.current = [];
    
    const timeouts = [
      setTimeout(() => refresh(), 300),
      setTimeout(() => refresh(), 1000),
      setTimeout(() => refresh(), 2000),
      setTimeout(() => refresh(), 5000)
    ];
    
    refreshTimeoutsRef.current = timeouts;
  }, [activeTab, fetchTweets, fetchMediaTweets, fetchReplies]);
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        const shouldForceRefresh = isInitialLoadRef.current || forceRefreshKey > 0;
        
        if (activeTab === 'posts') {
          console.time('fetchProfileTweets');
          console.debug(`[ProfileTabs] Fetching profile tweets with force refresh key: ${forceRefreshKey}`);
          const tweets = await fetchTweets(shouldForceRefresh);
          setTweets(tweets);
          console.timeEnd('fetchProfileTweets');
        } else if (activeTab === 'replies') {
          console.time('fetchProfileReplies');
          const replies = await fetchReplies(shouldForceRefresh);
          setReplies(replies);
          console.timeEnd('fetchProfileReplies');
        } else if (activeTab === 'media') {
          console.time('fetchProfileMedia');
          const mediaTweets = await fetchMediaTweets(shouldForceRefresh);
          setMediaTweets(mediaTweets);
          console.timeEnd('fetchProfileMedia');
        } else if (activeTab === 'assets' && !assetsPreloaded && solanaAddress) {
          try {
            const { fetchWalletTokens } = await import('@/utils/tokenService');
            await fetchWalletTokens(solanaAddress);
            setAssetsPreloaded(true);
          } catch (err) {
            console.error('Error preloading assets data:', err);
          }
        }
        
        isInitialLoadRef.current = false;
      } catch (error) {
        console.error(`Error fetching ${activeTab}:`, error);
        toast({
          title: "Error",
          description: `Failed to load ${activeTab}. Please try again.`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [userId, activeTab, toast, fetchTweets, fetchReplies, fetchMediaTweets, solanaAddress, assetsPreloaded, forceRefreshKey]);
  
  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'posts') {
        const freshTweets = await fetchTweets(true);
        setTweets(freshTweets);
      } else if (activeTab === 'replies') {
        const freshReplies = await fetchReplies(true);
        setReplies(freshReplies);
      } else if (activeTab === 'media') {
        const freshMediaTweets = await fetchMediaTweets(true);
        setMediaTweets(freshMediaTweets);
      } else if (activeTab === 'assets' && solanaAddress) {
        try {
          const { fetchWalletTokens } = await import('@/utils/tokenService');
          await fetchWalletTokens(solanaAddress);
        } catch (err) {
          console.error('Error refreshing assets data:', err);
        }
      }
    } catch (error) {
      console.error(`Error refreshing ${activeTab}:`, error);
      toast({
        title: "Error",
        description: `Failed to refresh ${activeTab}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetCache = async () => {
    try {
      setLoading(true);
      toast({
        title: "Resetting cache",
        description: "Clearing cached profile data..."
      });
      
      await clearProfileCache(userId);
      
      await handleRefresh();
      
      toast({
        title: "Cache cleared",
        description: "Profile data has been refreshed"
      });
    } catch (error) {
      console.error('Error resetting cache:', error);
      toast({
        title: "Error",
        description: "Failed to reset cache. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: user ? `id=eq.${user.id}` : undefined
      }, (payload) => {
        console.debug(`[ProfileTabs] Detected change in profiles table:`, payload);
        refreshProfileData(true);
      })
      .subscribe();
      
    const tweetsChannel = supabase
      .channel('profile-tweets-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tweets',
        filter: `author_id=eq.${userId}`
      }, (payload) => {
        console.debug(`[ProfileTabs] Detected change in tweets for user ${userId}, refreshing cache...`);
        
        try {
          localStorage.removeItem(`tweet-cache-profile-${userId}-posts-limit:20-offset:0`);
          localStorage.removeItem(`tweet-cache-profile-${userId}-media-limit:20-offset:0`);
          localStorage.removeItem(`profile-cache-profile-${userId}-posts-limit:20-offset:0`);
          localStorage.removeItem(`profile-cache-profile-${userId}-posts`);
          console.debug(`[ProfileTabs] Cleared profile caches for user ${userId}`);
        } catch (e) {
          console.error('[ProfileTabs] Error clearing profile cache:', e);
        }
        
        setForceRefreshKey(prevKey => prevKey + 1);
        refreshProfileData(true);
      })
      .subscribe();
      
    const broadcastChannel = supabase
      .channel('custom-broadcast-profile')
      .on('broadcast', { event: 'tweet-created' }, (payload) => {
        if (payload.payload && payload.payload.userId === userId) {
          console.debug(`[ProfileTabs] Received broadcast about new tweet from user ${userId}`);
          
          try {
            localStorage.removeItem(`tweet-cache-profile-${userId}-posts-limit:20-offset:0`);
            localStorage.removeItem(`tweet-cache-profile-${userId}-media-limit:20-offset:0`);
            localStorage.removeItem(`profile-cache-profile-${userId}-posts-limit:20-offset:0`);
            localStorage.removeItem(`profile-cache-profile-${userId}-posts`);
            console.debug(`[ProfileTabs] Cleared profile caches for user ${userId}`);
          } catch (e) {
            console.error('[ProfileTabs] Error clearing profile cache:', e);
          }
          
          setForceRefreshKey(prevKey => prevKey + 1);
          refreshProfileData(true);
        }
      })
      .subscribe();
      
    const profileUpdateChannel = supabase
      .channel('profile-update-channel')
      .on('broadcast', { event: 'profile-posts-updated' }, (payload) => {
        if (payload.payload && payload.payload.userId === userId) {
          console.debug(`[ProfileTabs] Received profile-posts-updated broadcast for user ${userId}`);
          setForceRefreshKey(prevKey => prevKey + 1);
          refreshProfileData(true);
        }
      })
      .subscribe();
      
    const priorityChannel = supabase
      .channel('priority-refresh-channel')
      .on('broadcast', { event: 'force-profile-refresh' }, (payload) => {
        console.debug(`[ProfileTabs] Received force-profile-refresh broadcast:`, payload);
        if (payload.payload && payload.payload.userId === userId) {
          console.debug(`[ProfileTabs] Processing priority refresh for user ${userId}`);
          setForceRefreshKey(prevKey => prevKey + 1);
          refreshProfileData(true);
        }
      })
      .subscribe();
      
    const commentsChannel = supabase
      .channel('profile-comments-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `user_id=eq.${userId}`
      }, () => {
        console.log(`Detected change in comments for user ${userId}, refreshing cache...`);
        if (activeTab === 'replies') {
          fetchReplies(true).then(setReplies);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(tweetsChannel);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(profileUpdateChannel);
      supabase.removeChannel(priorityChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [userId, activeTab, refreshProfileData, user?.id]);
  
  return (
    <div className="border-b border-crypto-gray">
      <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="w-full flex justify-between bg-transparent border-b border-crypto-gray px-0 h-auto">
          <TabsTrigger 
            value="posts" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <MessageSquare className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="replies" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <Reply className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Replies</span>
          </TabsTrigger>
          <TabsTrigger 
            value="media" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <FileImage className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assets" 
            className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
          >
            <Coins className="mr-2 h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="flex justify-end pt-2 px-4">
          <CryptoButton 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 border-gray-800 hover:bg-gray-900 hover:border-gray-700"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </CryptoButton>
          
          {isCurrentUser && (
            <CryptoButton 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 ml-2 text-crypto-gray hover:text-crypto-text hover:bg-transparent"
              onClick={handleResetCache}
              disabled={loading}
            >
              <span className="sr-only">Reset Cache</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            </CryptoButton>
          )}
        </div>
        
        <TabsContent value="posts" className="mt-0 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : tweets.length > 0 ? (
            <div className="space-y-4">
              {tweets.map((tweet) => (
                <TweetCard 
                  key={tweet.id} 
                  tweet={tweet} 
                  onAction={handleRefresh}
                  onError={(title, description) => {
                    toast({
                      title,
                      description,
                      variant: "destructive"
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <div className="text-xl font-bold mb-2 text-crypto-text">No posts yet</div>
                <p className="text-crypto-lightgray text-center mb-6">When you post, your tweets will show up here</p>
                {isCurrentUser && (
                  <CryptoButton className="px-6 py-2">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create your first post
                  </CryptoButton>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="replies" className="mt-0 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : replies.length > 0 ? (
            <div className="space-y-4">
              {replies.map((reply) => (
                <CommentCard 
                  key={reply.id} 
                  comment={reply} 
                  onAction={handleRefresh}
                  tweetId={reply.tweet_id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Reply className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No replies yet</div>
                <p className="text-crypto-lightgray text-center">When you reply to someone, it will show up here</p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="media" className="mt-0 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          ) : mediaTweets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {mediaTweets.map((tweet) => (
                <div key={tweet.id} className="bg-crypto-darkgray border border-crypto-gray rounded-xl overflow-hidden">
                  {tweet.image_url && (
                    <img 
                      src={tweet.image_url} 
                      alt="Tweet media" 
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-sm text-crypto-lightgray line-clamp-2">{tweet.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <FileImage className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No media yet</div>
                <p className="text-crypto-lightgray text-center">When you post photos or videos, they will show up here</p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="assets" className="mt-0 pt-2">
          {solanaAddress ? (
            <div className="px-4">
              <div className="mb-4">
                <h2 className="font-bold text-lg text-crypto-blue">Wallet Assets</h2>
              </div>
              <WalletAssets solanaAddress={solanaAddress} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Coins className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No wallet connected</div>
                <p className="text-crypto-lightgray text-center mb-4">Connect your Solana wallet to view your assets</p>
                {isCurrentUser && (
                  <CryptoButton 
                    variant="outline" 
                    className="group border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text"
                    onClick={() => toast({
                      title: "Connect Wallet",
                      description: "Please connect your Solana wallet in the profile section above.",
                    })}
                  >
                    <Coins className="h-4 w-4 mr-2 group-hover:text-crypto-blue" />
                    Connect Solana Wallet
                  </CryptoButton>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileTabs;
