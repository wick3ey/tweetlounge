import { supabase } from '@/lib/supabase';
import { TweetWithAuthor } from '@/types/Tweet';
import { CACHE_DURATIONS } from './cacheService';

// Cache keys
export const CACHE_KEYS = {
  HOME_FEED: 'home-feed',
  USER_TWEETS: 'user-tweets',
  TWEET_DETAIL: 'tweet-detail',
};

// In-memory cache layer for even faster access 
// Structure: { key: { data: any, expires: timestamp } }
const memoryCache = new Map<string, { data: any, expires: number }>();

// Local storage cache duration (shorter than DB cache)
const LS_CACHE_DURATION = CACHE_DURATIONS.SHORT; // 5 minutes

// Active requests tracker to prevent duplicate fetches
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Generates a cache key based on the type and parameters
 */
export const getTweetCacheKey = (type: string, params: Record<string, any> = {}): string => {
  const sortedParams = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join('-');
  
  return `${type}${sortedParams ? `-${sortedParams}` : ''}`;
};

/**
 * Get tweets from memory cache
 */
export const getFromMemoryCache = <T>(key: string): T | null => {
  try {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    if (cached.expires < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    
    console.log(`Memory cache hit for: ${key}`);
    return cached.data as T;
  } catch (err) {
    console.error('Error accessing memory cache:', err);
    return null;
  }
};

/**
 * Store tweets in memory cache
 */
export const setInMemoryCache = <T>(key: string, data: T, duration: number = CACHE_DURATIONS.SHORT): void => {
  try {
    const expires = Date.now() + duration;
    memoryCache.set(key, { data, expires });
    console.log(`Stored in memory cache: ${key} (expires in ${duration/1000}s)`);
  } catch (err) {
    console.error('Error setting memory cache:', err);
  }
};

/**
 * Get tweets from localStorage - with additional handling for resilient counts
 */
export const getFromLocalStorage = <T>(key: string): T | null => {
  try {
    const cachedData = localStorage.getItem(`tweet-cache-${key}`);
    if (!cachedData) return null;
    
    const { data, expires } = JSON.parse(cachedData);
    
    if (expires < Date.now()) {
      localStorage.removeItem(`tweet-cache-${key}`);
      return null;
    }
    
    // If we have tweet data, ensure each tweet has the most up-to-date counts
    // by checking our localStorage count cache
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item && item.id) {
          // Check if we have more recent count data for this tweet
          const countCache = localStorage.getItem(`tweet-count-${item.id}`);
          if (countCache) {
            try {
              const countData = JSON.parse(countCache);
              if (countData.timestamp > (item.countTimestamp || 0)) {
                // Update with the more recent counts
                item.replies_count = countData.replies_count ?? item.replies_count;
                item.likes_count = countData.likes_count ?? item.likes_count;
                item.retweets_count = countData.retweets_count ?? item.retweets_count;
                item.bookmarks_count = countData.bookmarks_count ?? item.bookmarks_count;
                item.countTimestamp = countData.timestamp;
                console.log(`Updated cached tweet ${item.id} with latest counts`);
              }
            } catch (e) {
              console.error(`Error parsing count cache for ${item.id}:`, e);
            }
          }
        }
      });
    }
    
    console.log(`LocalStorage cache hit for: ${key}`);
    return data as T;
  } catch (err) {
    console.error('Error accessing localStorage cache:', err);
    return null;
  }
};

/**
 * Store tweets in localStorage
 */
export const setInLocalStorage = <T>(key: string, data: T): void => {
  try {
    const expires = Date.now() + LS_CACHE_DURATION;
    localStorage.setItem(
      `tweet-cache-${key}`, 
      JSON.stringify({ data, expires })
    );
    console.log(`Stored in localStorage: ${key} (expires in ${LS_CACHE_DURATION/1000}s)`);
  } catch (err) {
    console.error('Error setting localStorage cache:', err);
  }
};

/**
 * Get tweets from database cache
 */
export const getFromDBCache = async <T>(key: string): Promise<T | null> => {
  try {
    console.log(`Checking DB cache for: ${key}`);
    
    const { data, error } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', `tweet-${key}`)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching from DB cache: ${error.message}`);
      return null;
    }
    
    if (!data) {
      console.log(`No valid DB cache for: ${key}`);
      return null;
    }
    
    console.log(`DB cache hit for: ${key}`);
    return data.data as T;
  } catch (err) {
    console.error(`Unexpected error in getFromDBCache: ${err}`);
    return null;
  }
};

/**
 * Store tweets in database cache
 */
export const setInDBCache = async <T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATIONS.MEDIUM
): Promise<boolean> => {
  // If there's already a pending operation for this key, wait for it
  if (pendingRequests.has(`db-set-${key}`)) {
    try {
      await pendingRequests.get(`db-set-${key}`);
      return true;
    } catch (err) {
      console.warn(`Previous cache operation for ${key} failed:`, err);
    }
  }

  const cacheOperation = (async () => {
    try {
      console.log(`Setting DB cache for: ${key}, duration: ${duration}ms`);
      
      // Calculate expiration time
      const expires = new Date(Date.now() + duration);
      
      // First try to clear any existing entry to avoid duplicate key errors
      try {
        await supabase
          .from('market_cache')
          .delete()
          .eq('cache_key', `tweet-${key}`);
      } catch (deleteError) {
        console.warn(`Error clearing existing cache (non-critical): ${deleteError}`);
      }
      
      // Insert the new cache entry
      const { error } = await supabase
        .from('market_cache')
        .insert({
          cache_key: `tweet-${key}`,
          data: data as any,
          source: 'tweet-service',
          expires_at: expires.toISOString()
        });
      
      if (error) {
        // Some error handling for duplicate keys
        if (error.message.includes('duplicate key')) {
          console.log(`Cache entry for ${key} was created by another process`);
          return true;
        }
        
        console.error(`Error setting DB cache: ${error.message}`);
        return false;
      }
      
      console.log(`Successfully cached tweets in DB for: ${key}, expires: ${expires.toISOString()}`);
      return true;
    } catch (err) {
      console.error(`Unexpected error in setInDBCache: ${err}`);
      throw err;
    } finally {
      pendingRequests.delete(`db-set-${key}`);
    }
  })();
  
  pendingRequests.set(`db-set-${key}`, cacheOperation);
  
  try {
    return await cacheOperation;
  } catch (err) {
    return false;
  }
};

/**
 * Multi-level cache getter for tweets
 * Tries memory -> localStorage -> DB in sequence
 */
export const getCachedTweets = async <T>(key: string): Promise<T | null> => {
  // First check memory (fastest)
  const memoryResult = getFromMemoryCache<T>(key);
  if (memoryResult) return memoryResult;
  
  // Then check localStorage (fast)
  const localResult = getFromLocalStorage<T>(key);
  if (localResult) {
    // Cache back in memory for next access
    setInMemoryCache(key, localResult);
    return localResult;
  }
  
  // Finally check database (slower but shared across users)
  const dbResult = await getFromDBCache<T>(key);
  if (dbResult) {
    // Cache back in memory and localStorage for next access
    setInMemoryCache(key, dbResult);
    setInLocalStorage(key, dbResult);
    return dbResult;
  }
  
  return null;
};

/**
 * Store tweets in all cache layers
 */
export const cacheTweets = async <T>(
  key: string,
  data: T,
  dbCacheDuration: number = CACHE_DURATIONS.MEDIUM
): Promise<void> => {
  // Store in all cache layers
  setInMemoryCache(key, data);
  setInLocalStorage(key, data);
  await setInDBCache(key, data, dbCacheDuration);
};

/**
 * Cached tweet fetcher with circuit breaker pattern
 * Will try cache first, then fetch from source if needed
 */
export const fetchTweetsWithCache = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheDuration: number = CACHE_DURATIONS.MEDIUM,
  forceRefresh: boolean = false
): Promise<T> => {
  // If already fetching this data, wait for that promise instead of duplicating
  if (pendingRequests.has(cacheKey)) {
    try {
      return await pendingRequests.get(cacheKey) as T;
    } catch (error) {
      console.error(`Error with pending request for ${cacheKey}:`, error);
      // Continue with a fresh request
    }
  }
  
  const fetchOperation = (async () => {
    try {
      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await getCachedTweets<T>(cacheKey);
        if (cachedData) return cachedData;
      }
      
      console.log(`Cache miss or refresh forced for: ${cacheKey}, fetching fresh data...`);
      
      // If not in cache or forcing refresh, fetch fresh data
      const freshData = await fetchFn();
      
      // Store in cache for next time
      await cacheTweets(cacheKey, freshData, cacheDuration);
      
      return freshData;
    } catch (error) {
      console.error(`Error fetching data for ${cacheKey}:`, error);
      
      // Last resort: try to get any cached version even if expired
      try {
        // Try memory without expiry check
        const cachedEntry = memoryCache.get(cacheKey);
        if (cachedEntry?.data) {
          console.log(`Using stale memory cache as fallback for: ${cacheKey}`);
          return cachedEntry.data as T;
        }
        
        // Try localStorage without expiry check
        const lsData = localStorage.getItem(`tweet-cache-${cacheKey}`);
        if (lsData) {
          const parsed = JSON.parse(lsData);
          console.log(`Using stale localStorage cache as fallback for: ${cacheKey}`);
          return parsed.data as T;
        }
      } catch (fallbackError) {
        console.error('Error getting fallback cache:', fallbackError);
      }
      
      throw error; // Re-throw if even fallbacks fail
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  pendingRequests.set(cacheKey, fetchOperation);
  return fetchOperation;
};

/**
 * Clear specific tweet from all cache layers
 */
export const invalidateTweetCache = async (tweetId: string): Promise<void> => {
  try {
    // Clear from memory cache
    for (const [key] of memoryCache.entries()) {
      if (key.includes(tweetId)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear from localStorage
    for (const key in localStorage) {
      if (key.startsWith('tweet-cache-') && key.includes(tweetId)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear from DB cache
    await supabase
      .from('market_cache')
      .delete()
      .like('cache_key', `%${tweetId}%`);
      
    console.log(`Invalidated cache for tweet: ${tweetId}`);
  } catch (err) {
    console.error(`Error invalidating tweet cache: ${err}`);
  }
};

/**
 * Update tweet count information in a separate count-specific cache
 * This ensures counts are preserved across page refreshes
 */
export const updateTweetCount = (
  tweetId: string, 
  counts: {
    replies_count?: number;
    likes_count?: number;
    retweets_count?: number;
    bookmarks_count?: number;
  }
): void => {
  try {
    // Get existing count data if any
    const existingData = localStorage.getItem(`tweet-count-${tweetId}`);
    let countData = existingData ? JSON.parse(existingData) : {};
    
    // Update with new counts, preserving any existing ones
    countData = {
      ...countData,
      ...counts,
      timestamp: Date.now()
    };
    
    // Store the updated counts
    localStorage.setItem(`tweet-count-${tweetId}`, JSON.stringify(countData));
    console.log(`Updated count cache for tweet ${tweetId}:`, counts);
  } catch (err) {
    console.error(`Error updating count cache for tweet ${tweetId}:`, err);
  }
};

/**
 * Partial cache update for a specific tweet with improved count tracking
 */
export const updateTweetInCache = async (
  tweetId: string, 
  updater: (tweet: TweetWithAuthor) => TweetWithAuthor
): Promise<void> => {
  try {
    // Track the counts separately for resilience across page refreshes
    const beforeUpdate: Record<string, any> = {};
    const afterUpdate: Record<string, any> = {};
    
    // Update in memory cache
    for (const [key, cacheEntry] of memoryCache.entries()) {
      if (key.includes('home-feed') || key.includes('user-tweets') || key.includes('tweet-detail')) {
        const data = cacheEntry.data;
        if (Array.isArray(data)) {
          const updatedData = data.map(tweet => {
            if (tweet.id === tweetId) {
              // Store counts before update
              beforeUpdate.replies_count = tweet.replies_count;
              beforeUpdate.likes_count = tweet.likes_count;
              beforeUpdate.retweets_count = tweet.retweets_count;
              beforeUpdate.bookmarks_count = tweet.bookmarks_count;
              
              // Apply the update
              const updated = updater(tweet);
              
              // Store counts after update
              afterUpdate.replies_count = updated.replies_count;
              afterUpdate.likes_count = updated.likes_count;
              afterUpdate.retweets_count = updated.retweets_count;
              afterUpdate.bookmarks_count = updated.bookmarks_count;
              
              return updated;
            }
            return tweet;
          });
          memoryCache.set(key, { ...cacheEntry, data: updatedData });
          console.log(`Updated tweet ${tweetId} in memory cache for key ${key}`);
        }
      }
    }
    
    // Update in localStorage
    for (const key in localStorage) {
      if (key.startsWith('tweet-cache-') && 
          (key.includes('home-feed') || key.includes('user-tweets') || key.includes('tweet-detail'))) {
        try {
          const cachedData = JSON.parse(localStorage.getItem(key) || '{}');
          if (cachedData.data && Array.isArray(cachedData.data)) {
            cachedData.data = cachedData.data.map((tweet: any) => 
              tweet.id === tweetId ? updater(tweet) : tweet
            );
            localStorage.setItem(key, JSON.stringify(cachedData));
            console.log(`Updated tweet ${tweetId} in localStorage cache for key ${key}`);
          }
        } catch (e) {
          console.error(`Error updating localStorage cache: ${e}`);
        }
      }
    }
    
    // Update the separate count cache if any counts changed
    const countsToUpdate: any = {};
    
    if (afterUpdate.replies_count !== undefined && afterUpdate.replies_count !== beforeUpdate.replies_count) {
      countsToUpdate.replies_count = afterUpdate.replies_count;
    }
    
    if (afterUpdate.likes_count !== undefined && afterUpdate.likes_count !== beforeUpdate.likes_count) {
      countsToUpdate.likes_count = afterUpdate.likes_count;
    }
    
    if (afterUpdate.retweets_count !== undefined && afterUpdate.retweets_count !== beforeUpdate.retweets_count) {
      countsToUpdate.retweets_count = afterUpdate.retweets_count;
    }
    
    if (afterUpdate.bookmarks_count !== undefined && afterUpdate.bookmarks_count !== beforeUpdate.bookmarks_count) {
      countsToUpdate.bookmarks_count = afterUpdate.bookmarks_count;
    }
    
    if (Object.keys(countsToUpdate).length > 0) {
      updateTweetCount(tweetId, countsToUpdate);
    }
    
    // Try to also update in DB cache if it exists
    try {
      const { data: cacheEntries, error } = await supabase
        .from('market_cache')
        .select('cache_key, data')
        .like('cache_key', `%tweet-%`)
        .contains('data', [{ id: tweetId }]);
        
      if (!error && cacheEntries && cacheEntries.length > 0) {
        for (const entry of cacheEntries) {
          if (Array.isArray(entry.data)) {
            const updatedData = entry.data.map(tweet => 
              tweet.id === tweetId ? updater(tweet) : tweet
            );
            
            await supabase
              .from('market_cache')
              .update({ data: updatedData })
              .eq('cache_key', entry.cache_key);
              
            console.log(`Updated tweet ${tweetId} in DB cache for key ${entry.cache_key}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error updating tweet in DB cache: ${err}`);
    }
    
    console.log(`Updated tweet ${tweetId} in all available caches`);
  } catch (err) {
    console.error(`Error updating tweet in cache: ${err}`);
  }
};

// Periodically clean up memory cache
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, value] of memoryCache.entries()) {
    if (value.expires < now) {
      memoryCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`Memory cache cleanup: removed ${expiredCount} expired items`);
  }
}, 60000); // Every minute
