import { supabase } from '@/integrations/supabase/client';
import { TweetWithAuthor, enhanceTweetData } from '@/types/Tweet';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchTweetsWithCache, 
  getTweetCacheKey, 
  CACHE_KEYS,
  invalidateTweetCache,
  cacheTweets,
  getCachedTweets
} from '@/utils/tweetCacheService';
import { extractHashtags, storeHashtags } from '@/utils/hashtagService';
import { Profile } from '@/lib/supabase';
import { CACHE_DURATIONS } from '@/utils/cacheService';

// Helper function to create a Profile object from profile data
const createPartialProfile = (profileData: any): Profile => {
  return {
    id: profileData.id,
    username: profileData.username || 'unknown',
    display_name: profileData.display_name || profileData.username || 'Unknown User',
    avatar_url: profileData.avatar_url || '',
    bio: profileData.bio || null,
    cover_url: profileData.cover_url || null,
    location: profileData.location || null,
    website: profileData.website || null,
    updated_at: profileData.updated_at || null,
    created_at: profileData.created_at || new Date().toISOString(),
    ethereum_address: profileData.ethereum_address || null,
    solana_address: profileData.solana_address || null,
    avatar_nft_id: profileData.avatar_nft_id || null,
    avatar_nft_chain: profileData.avatar_nft_chain || null,
    followers_count: profileData.followers_count || 0,
    following_count: profileData.following_count || 0,
    replies_sort_order: profileData.replies_sort_order || null
  };
};

export const createTweet = async (content: string, imageFile?: File): Promise<TweetWithAuthor | null> => {
  console.debug('[createTweet] Starting tweet creation with content length:', content.length, 'Has image:', !!imageFile);
  
  try {
    console.debug('[createTweet] Getting current user');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('[createTweet] User authentication error:', userError?.message || 'No user data');
      return null;
    }
    
    console.debug('[createTweet] User authenticated:', !!userData.user);
    
    const tweetId = uuidv4();
    let imageUrl: string | null = null;
    
    if (imageFile) {
      console.debug('[createTweet] Uploading image:', imageFile.name, 'Size:', (imageFile.size / 1024).toFixed(2) + 'KB');
      
      const filePath = `public/${userData.user.id}/${tweetId}/${imageFile.name}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('tweets')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('[createTweet] Image upload error:', uploadError.message);
        return null;
      }
      
      console.debug('[createTweet] Image uploaded successfully');
      
      const { data: urlData } = supabase.storage
        .from('tweets')
        .getPublicUrl(filePath);
      
      imageUrl = urlData.publicUrl;
      console.debug('[createTweet] Image public URL:', imageUrl);
    }
    
    const hashtags = extractHashtags(content);
    if (hashtags.length > 0) {
      console.debug('[createTweet] Extracted hashtags:', hashtags);
    }
    
    console.debug('[createTweet] Creating tweet in database');
    
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .insert({
        id: tweetId,
        content,
        author_id: userData.user.id,
        image_url: imageUrl,
        is_retweet: false
      })
      .select()
      .single();
    
    if (tweetError || !tweetData) {
      console.error('[createTweet] Tweet creation error:', tweetError?.message || 'No tweet data returned');
      return null;
    }
    
    console.debug('[createTweet] Tweet created successfully with ID:', tweetData.id);
    
    if (hashtags.length > 0) {
      await storeHashtags(hashtags, tweetData.id);
    }
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError || !profileData) {
      console.error('[createTweet] Profile fetch error:', profileError?.message || 'No profile data');
      return null;
    }
    
    const createdTweet: TweetWithAuthor = {
      ...tweetData,
      author: profileData as Profile,
      likes_count: 0,
      retweets_count: 0,
      replies_count: 0,
      is_retweet: false
    };
    
    const enhancedTweet = enhanceTweetData(createdTweet);
    
    console.debug('[createTweet] Force invalidating all tweet caches to ensure immediate update');
    
    // More aggressive cache invalidation to ensure immediate updates everywhere
    // For home feed
    await invalidateTweetCache(CACHE_KEYS.HOME_FEED);
    await invalidateTweetCache(getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit: 10, offset: 0 }));
    await invalidateTweetCache(getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit: 20, offset: 0 }));
    
    // For user profile feeds
    await invalidateTweetCache(CACHE_KEYS.USER_TWEETS);
    await invalidateTweetCache(getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { limit: 20, offset: 0, userId: userData.user.id }));
    
    // Clear profile cache for current user
    try {
      // Clear all possible cache keys for profile posts
      localStorage.removeItem(`tweet-cache-profile-${userData.user.id}-posts-limit:20-offset:0`);
      localStorage.removeItem(`profile-cache-profile-${userData.user.id}-posts-limit:20-offset:0`);
      localStorage.removeItem(`profile-cache-profile-${userData.user.id}-posts`);
      console.debug('[createTweet] Cleared profile posts cache');
    } catch (e) {
      console.error('[createTweet] Error clearing profile cache:', e);
    }
    
    // Forcibly clear more precise localStorage caches for immediate updates
    try {
      localStorage.removeItem(`tweet-cache-home-feed-limit:10-offset:0`);
      localStorage.removeItem(`tweet-cache-home-feed-limit:20-offset:0`);
      console.debug('[createTweet] Forcibly cleared home feed cache from localStorage');
    } catch (e) {
      console.error('[createTweet] Error clearing home feed cache:', e);
    }
    
    console.debug('[createTweet] Tweet creation completed successfully');
    return enhancedTweet;
  } catch (error) {
    console.error('[createTweet] Unexpected error in tweet creation:', error);
    return null;
  }
};

export const transformTweetData = (item: any): TweetWithAuthor | null => {
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

export const getTweets = async (
  limit = 20, 
  offset = 0,
  forceRefresh = false
): Promise<TweetWithAuthor[]> => {
  console.debug(`[getTweets] Fetching tweets with limit: ${limit}, offset: ${offset}, forceRefresh: ${forceRefresh}`);
  
  const cacheKey = getTweetCacheKey(CACHE_KEYS.HOME_FEED, { limit, offset });
  
  try {
    const shouldForceRefresh = forceRefresh || offset === 0;
    
    if (shouldForceRefresh) {
      console.debug('[getTweets] Force refresh requested or initial load, bypassing all caches');
      
      const { data, error } = await supabase
        .rpc('get_tweets_with_authors_reliable', { 
          limit_count: limit, 
          offset_count: offset 
        });
      
      if (error) {
        console.error('[getTweets] Error fetching tweets:', error.message);
        throw error;
      }
      
      if (!data) {
        console.debug('[getTweets] No tweets found');
        return [];
      }
      
      console.debug(`[getTweets] Got ${data.length} tweets directly from database`);
      
      const tweets = (data as any[]).map(tweet => {
        return enhanceTweetData({
          id: tweet.id,
          content: tweet.content,
          author_id: tweet.author_id,
          created_at: tweet.created_at,
          likes_count: tweet.likes_count || 0,
          retweets_count: tweet.retweets_count || 0,
          replies_count: tweet.replies_count || 0,
          is_retweet: tweet.is_retweet === true,
          original_tweet_id: tweet.original_tweet_id,
          image_url: tweet.image_url,
          author: {
            id: tweet.author_id,
            username: tweet.profile_username || 'user',
            display_name: tweet.profile_display_name || 'User',
            avatar_url: tweet.profile_avatar_url || '',
            bio: null,
            cover_url: null,
            location: null,
            website: null,
            updated_at: null,
            created_at: new Date().toISOString(),
            ethereum_address: null,
            solana_address: null,
            avatar_nft_id: tweet.profile_avatar_nft_id,
            avatar_nft_chain: tweet.profile_avatar_nft_chain,
            followers_count: 0,
            following_count: 0,
            replies_sort_order: null
          }
        });
      });
      
      await cacheTweets(cacheKey, tweets);
      
      return tweets;
    }
    
    return await fetchTweetsWithCache<TweetWithAuthor[]>(
      cacheKey,
      async () => {
        console.debug('[getTweets] Cache miss, fetching from database');
        
        const { data, error } = await supabase
          .rpc('get_tweets_with_authors_reliable', { 
            limit_count: limit, 
            offset_count: offset 
          });
        
        if (error) {
          console.error('[getTweets] Error fetching tweets:', error.message);
          throw error;
        }
        
        if (!data) {
          console.debug('[getTweets] No tweets found');
          return [];
        }
        
        console.debug(`[getTweets] Got ${data.length} tweets from database`);
        
        return (data as any[]).map(tweet => {
          return enhanceTweetData({
            id: tweet.id,
            content: tweet.content,
            author_id: tweet.author_id,
            created_at: tweet.created_at,
            likes_count: tweet.likes_count || 0,
            retweets_count: tweet.retweets_count || 0,
            replies_count: tweet.replies_count || 0,
            is_retweet: tweet.is_retweet === true,
            original_tweet_id: tweet.original_tweet_id,
            image_url: tweet.image_url,
            author: {
              id: tweet.author_id,
              username: tweet.profile_username || 'user',
              display_name: tweet.profile_display_name || 'User',
              avatar_url: tweet.profile_avatar_url || '',
              bio: null,
              cover_url: null,
              location: null,
              website: null,
              updated_at: null,
              created_at: new Date().toISOString(),
              ethereum_address: null,
              solana_address: null,
              avatar_nft_id: tweet.profile_avatar_nft_id,
              avatar_nft_chain: tweet.profile_avatar_nft_chain,
              followers_count: 0,
              following_count: 0,
              replies_sort_order: null
            }
          });
        });
      },
      CACHE_DURATIONS.MEDIUM,
      forceRefresh
    );
  } catch (error) {
    console.error('[getTweets] Error fetching tweets:', error);
    return [];
  }
};

/**
 * Fetch tweets for a specific user
 */
export const getUserTweets = async (userId: string, limit = 20, offset = 0, forceRefresh = false): Promise<TweetWithAuthor[]> => {
  try {
    console.log(`[getUserTweets] Fetching tweets for user ${userId} with limit: ${limit}, offset: ${offset}`);
    
    // If not forcing a refresh, try to get from cache first
    if (!forceRefresh) {
      const cacheKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId, limit, offset });
      const cachedTweets = await getCachedTweets<TweetWithAuthor[]>(cacheKey);
      
      if (cachedTweets && cachedTweets.length > 0) {
        console.log(`[getUserTweets] Found ${cachedTweets.length} tweets in cache for user ${userId}`);
        return cachedTweets;
      }
    }
    
    console.log(`[getUserTweets] Cache miss, fetching from database`);
    
    try {
      // First try to use the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_tweets_reliable', { 
          user_id: userId,
          limit_count: limit,
          offset_count: offset
        });
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        // RPC call succeeded, process the data
        const tweetsWithAuthor: TweetWithAuthor[] = rpcData.map((tweet: any) => {
          return {
            id: tweet.id,
            content: tweet.content,
            author_id: tweet.author_id,
            created_at: tweet.created_at,
            likes_count: tweet.likes_count || 0,
            retweets_count: tweet.retweets_count || 0,
            replies_count: tweet.replies_count || 0,
            is_retweet: tweet.is_retweet === true,
            original_tweet_id: tweet.original_tweet_id,
            image_url: tweet.image_url,
            author: createPartialProfile({
              id: tweet.author_id,
              username: tweet.username,
              display_name: tweet.display_name,
              avatar_url: tweet.avatar_url,
              avatar_nft_id: tweet.avatar_nft_id,
              avatar_nft_chain: tweet.avatar_nft_chain
            })
          };
        });
        
        // Enrich data with additional display properties
        const enrichedTweets = tweetsWithAuthor.map(tweet => enhanceTweetData(tweet));
        
        // Cache the results
        if (enrichedTweets.length > 0) {
          const cacheKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId, limit, offset });
          await cacheTweets(cacheKey, enrichedTweets);
        }
        
        return enrichedTweets;
      }
      
      // If RPC failed, fall back to separate queries approach
      console.log('[getUserTweets] RPC function failed, falling back to separate queries');
    } catch (rpcCallError) {
      console.warn('[getUserTweets] Error calling RPC function, falling back to separate queries:', rpcCallError);
    }
    
    // Fallback: Get tweets and profiles separately
    // First get the tweets
    const { data: tweetsData, error: tweetsError } = await supabase
      .from('tweets')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (tweetsError) {
      throw tweetsError;
    }
    
    if (!tweetsData || tweetsData.length === 0) {
      return [];
    }
    
    // Now get the author profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.warn('[getUserTweets] Error fetching profile, using placeholder:', profileError);
    }
    
    // Combine the tweets with the profile
    const tweetsWithAuthor: TweetWithAuthor[] = tweetsData.map(tweet => {
      return {
        ...tweet,
        author: profileData ? createPartialProfile(profileData) : createPartialProfile({
          id: userId,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: '',
        })
      };
    });
    
    // Enrich data with additional display properties
    const enrichedTweets = tweetsWithAuthor.map(tweet => enhanceTweetData(tweet));
    
    // Cache the results
    if (enrichedTweets.length > 0) {
      const cacheKey = getTweetCacheKey(CACHE_KEYS.USER_TWEETS, { userId, limit, offset });
      await cacheTweets(cacheKey, enrichedTweets);
    }
    
    return enrichedTweets;
  } catch (error) {
    console.error(`[getUserTweets] Error fetching user tweets:`, error);
    return []; // Return empty array instead of throwing to prevent UI from breaking
  }
};

export const getUserRetweets = async (
  userId: string,
  limit = 20,
  offset = 0
): Promise<TweetWithAuthor[]> => {
  console.debug(`[getUserRetweets] Fetching retweets for user ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:profiles(*)
      `)
      .eq('author_id', userId)
      .eq('is_retweet', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[getUserRetweets] Error:', error.message);
      return [];
    }
    
    return (data as any[] || []).map(item => enhanceTweetData({
      ...item,
      author: item.author,
      likes_count: item.likes_count || 0,
      retweets_count: item.retweets_count || 0,
      replies_count: item.replies_count || 0
    }));
  } catch (error) {
    console.error('[getUserRetweets] Error:', error);
    return [];
  }
};

export const checkIfUserLikedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: false })
      .eq('tweet_id', tweetId)
      .eq('user_id', userData.user.id);
    
    if (error) {
      console.error('[checkIfUserLikedTweet] Error:', error.message);
      return false;
    }
    
    return count ? count > 0 : false;
  } catch (error) {
    console.error('[checkIfUserLikedTweet] Error:', error);
    return false;
  }
};

export const likeTweet = async (tweetId: string, unlike = false): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    if (unlike) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('tweet_id', tweetId)
        .eq('user_id', userData.user.id);
      
      if (error) {
        console.error('[likeTweet] Error unliking tweet:', error.message);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({
          tweet_id: tweetId,
          user_id: userData.user.id
        });
      
      if (error) {
        console.error('[likeTweet] Error liking tweet:', error.message);
        return false;
      }
    }
    
    // Update likes count using a direct SQL query
    const countDirection = unlike ? -1 : 1;
    
    // First get the current count
    const { data: tweetData, error: getError } = await supabase
      .from('tweets')
      .select('likes_count')
      .eq('id', tweetId)
      .single();
    
    if (getError) {
      console.error('[likeTweet] Error getting tweet data:', getError.message);
    } else {
      // Then update with the new value
      const currentCount = tweetData?.likes_count || 0;
      const newCount = Math.max(0, currentCount + countDirection);
      
      const { error: updateError } = await supabase
        .from('tweets')
        .update({ likes_count: newCount })
        .eq('id', tweetId);
      
      if (updateError) {
        console.error('[likeTweet] Error updating likes count:', updateError.message);
      }
    }
    
    await invalidateTweetCache(tweetId);
    
    return true;
  } catch (error) {
    console.error('[likeTweet] Error:', error);
    return false;
  }
};

export const checkIfUserRetweetedTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    const { count, error } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: false })
      .eq('original_tweet_id', tweetId)
      .eq('author_id', userData.user.id)
      .eq('is_retweet', true);
    
    if (error) {
      console.error('[checkIfUserRetweetedTweet] Error:', error.message);
      return false;
    }
    
    return count ? count > 0 : false;
  } catch (error) {
    console.error('[checkIfUserRetweetedTweet] Error:', error);
    return false;
  }
};

export const retweet = async (tweetId: string, undo = false): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    if (undo) {
      const { data: retweetData, error: findError } = await supabase
        .from('tweets')
        .select('id')
        .eq('original_tweet_id', tweetId)
        .eq('author_id', userData.user.id)
        .eq('is_retweet', true)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error('[retweet] Error finding retweet to undo:', findError.message);
        return false;
      }
      
      if (!retweetData) {
        console.error('[retweet] No retweet found to undo');
        return false;
      }
      
      const { error: deleteError } = await supabase
        .from('tweets')
        .delete()
        .eq('id', retweetData.id);
      
      if (deleteError) {
        console.error('[retweet] Error deleting retweet:', deleteError.message);
        return false;
      }
    } else {
      const { error: insertError } = await supabase
        .from('tweets')
        .insert({
          id: uuidv4(),
          content: '',
          author_id: userData.user.id,
          is_retweet: true,
          original_tweet_id: tweetId
        });
      
      if (insertError) {
        console.error('[retweet] Error creating retweet:', insertError.message);
        return false;
      }
    }
    
    // Update retweets count
    const countDirection = undo ? -1 : 1;
    
    // First get the current count
    const { data: tweetData, error: getError } = await supabase
      .from('tweets')
      .select('retweets_count')
      .eq('id', tweetId)
      .single();
    
    if (getError) {
      console.error('[retweet] Error getting tweet data:', getError.message);
    } else {
      // Then update with the new value
      const currentCount = tweetData?.retweets_count || 0;
      const newCount = Math.max(0, currentCount + countDirection);
      
      const { error: updateError } = await supabase
        .from('tweets')
        .update({ retweets_count: newCount })
        .eq('id', tweetId);
      
      if (updateError) {
        console.error('[retweet] Error updating retweets count:', updateError.message);
      }
    }
    
    await invalidateTweetCache(tweetId);
    
    return true;
  } catch (error) {
    console.error('[retweet] Error:', error);
    return false;
  }
};

export const deleteTweet = async (tweetId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    const { data: tweetData, error: fetchError } = await supabase
      .from('tweets')
      .select('author_id')
      .eq('id', tweetId)
      .single();
    
    if (fetchError) {
      console.error('[deleteTweet] Error fetching tweet:', fetchError.message);
      return false;
    }
    
    if (tweetData.author_id !== userData.user.id) {
      console.error('[deleteTweet] User is not the author of this tweet');
      return false;
    }
    
    const { error: deleteError } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);
    
    if (deleteError) {
      console.error('[deleteTweet] Error deleting tweet:', deleteError.message);
      return false;
    }
    
    await invalidateTweetCache(tweetId);
    await invalidateTweetCache(CACHE_KEYS.HOME_FEED);
    await invalidateTweetCache(`${CACHE_KEYS.USER_TWEETS}-userId:${userData.user.id}`);
    
    return true;
  } catch (error) {
    console.error('[deleteTweet] Error:', error);
    return false;
  }
};
