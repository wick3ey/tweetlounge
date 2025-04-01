
import { supabase } from '@/lib/supabase';
import { TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { CACHE_DURATIONS } from './cacheService';

// In-memory cache for profile data
const profileMemoryCache = new Map<string, {
  data: any,
  expires: number,
  type: 'tweets' | 'comments' | 'media' | 'assets'
}>();

// Generate cache key for profile data
export const getProfileCacheKey = (userId: string, type: string, params: Record<string, any> = {}): string => {
  const sortedParams = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join('-');
  
  return `profile-${userId}-${type}${sortedParams ? `-${sortedParams}` : ''}`;
};

// Get data from memory cache
export const getFromProfileMemory = <T>(key: string): T | null => {
  try {
    const cached = profileMemoryCache.get(key);
    if (!cached) return null;
    
    if (cached.expires < Date.now()) {
      profileMemoryCache.delete(key);
      return null;
    }
    
    console.log(`Profile memory cache hit for: ${key}`);
    return cached.data as T;
  } catch (err) {
    console.error('Error accessing profile memory cache:', err);
    return null;
  }
};

// Store data in memory cache
export const setInProfileMemory = <T>(
  key: string, 
  data: T, 
  type: 'tweets' | 'comments' | 'media' | 'assets',
  duration: number = CACHE_DURATIONS.SHORT
): void => {
  try {
    const expires = Date.now() + duration;
    profileMemoryCache.set(key, { data, expires, type });
    console.log(`Stored profile data in memory cache: ${key} (expires in ${duration/1000}s)`);
  } catch (err) {
    console.error('Error setting profile memory cache:', err);
  }
};

// Get data from local storage
export const getFromProfileStorage = <T>(key: string): T | null => {
  try {
    const cachedData = localStorage.getItem(`profile-cache-${key}`);
    if (!cachedData) return null;
    
    const { data, expires } = JSON.parse(cachedData);
    
    if (expires < Date.now()) {
      localStorage.removeItem(`profile-cache-${key}`);
      return null;
    }
    
    console.log(`Profile localStorage cache hit for: ${key}`);
    return data as T;
  } catch (err) {
    console.error('Error accessing profile localStorage cache:', err);
    return null;
  }
};

// Store data in local storage
export const setInProfileStorage = <T>(key: string, data: T, duration: number = CACHE_DURATIONS.MEDIUM): void => {
  try {
    const expires = Date.now() + duration;
    localStorage.setItem(
      `profile-cache-${key}`, 
      JSON.stringify({ data, expires })
    );
    console.log(`Stored profile data in localStorage: ${key} (expires in ${duration/1000}s)`);
  } catch (err) {
    console.error('Error setting profile localStorage cache:', err);
  }
};

// Get data from database cache
export const getFromProfileDBCache = async <T>(key: string): Promise<T | null> => {
  try {
    console.log(`Checking DB cache for profile data: ${key}`);
    
    const { data, error } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', `profile-${key}`)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching from profile DB cache: ${error.message}`);
      return null;
    }
    
    if (!data) {
      console.log(`No valid DB cache for profile data: ${key}`);
      return null;
    }
    
    console.log(`DB cache hit for profile data: ${key}`);
    return data.data as T;
  } catch (err) {
    console.error(`Unexpected error in getFromProfileDBCache: ${err}`);
    return null;
  }
};

// Store data in database cache
export const setInProfileDBCache = async <T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATIONS.MEDIUM
): Promise<boolean> => {
  try {
    console.log(`Setting DB cache for profile data: ${key}, duration: ${duration}ms`);
    
    // Calculate expiration time
    const expires = new Date(Date.now() + duration);
    
    // First try to clear any existing entry to avoid duplicate key errors
    try {
      await supabase
        .from('market_cache')
        .delete()
        .eq('cache_key', `profile-${key}`);
    } catch (deleteError) {
      console.warn(`Error clearing existing profile cache (non-critical): ${deleteError}`);
    }
    
    // Insert the new cache entry
    const { error } = await supabase
      .from('market_cache')
      .insert({
        cache_key: `profile-${key}`,
        data: data as any,
        source: 'profile-service',
        expires_at: expires.toISOString()
      });
    
    if (error) {
      console.error(`Error setting profile DB cache: ${error.message}`);
      return false;
    }
    
    console.log(`Successfully cached profile data in DB for: ${key}, expires: ${expires.toISOString()}`);
    return true;
  } catch (err) {
    console.error(`Unexpected error in setInProfileDBCache: ${err}`);
    return false;
  }
};

// Multi-level cache getter for profile data
export const getCachedProfileData = async <T>(key: string): Promise<T | null> => {
  // First check memory (fastest)
  const memoryResult = getFromProfileMemory<T>(key);
  if (memoryResult) return memoryResult;
  
  // Then check localStorage (fast)
  const localResult = getFromProfileStorage<T>(key);
  if (localResult) {
    // Cache back in memory for next access
    setInProfileMemory(key, localResult, getDataType(localResult));
    return localResult;
  }
  
  // Finally check database (slower but shared across users)
  const dbResult = await getFromProfileDBCache<T>(key);
  if (dbResult) {
    // Cache back in memory and localStorage for next access
    setInProfileMemory(key, dbResult, getDataType(dbResult));
    setInProfileStorage(key, dbResult);
    return dbResult;
  }
  
  return null;
};

// Helper to determine data type for caching
const getDataType = (data: any): 'tweets' | 'comments' | 'media' | 'assets' => {
  if (Array.isArray(data)) {
    if (data.length === 0) return 'tweets';
    
    const item = data[0];
    if (item.content && (item.author_id || item.profile_username)) return 'tweets';
    if (item.tweet_id && item.user_id) return 'comments';
    if (item.image_url) return 'media';
  }
  
  return 'assets';
};

// Store profile data in all cache layers
export const cacheProfileData = async <T>(
  key: string,
  data: T,
  type: 'tweets' | 'comments' | 'media' | 'assets',
  dbCacheDuration: number = CACHE_DURATIONS.MEDIUM
): Promise<void> => {
  // Store in all cache layers
  setInProfileMemory(key, data, type);
  setInProfileStorage(key, data);
  await setInProfileDBCache(key, data, dbCacheDuration);
};

// Function for fetching profile data with caching
export const fetchProfileDataWithCache = async <T>(
  userId: string,
  dataType: string,
  fetchFn: () => Promise<T>,
  params: Record<string, any> = {},
  cacheDuration: number = CACHE_DURATIONS.SHORT, // Changed from MEDIUM to SHORT
  forceRefresh: boolean = false
): Promise<T> => {
  const cacheKey = getProfileCacheKey(userId, dataType, params);
  
  try {
    // Try cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = await getCachedProfileData<T>(cacheKey);
      if (cachedData) {
        console.log(`Using cached profile ${dataType} data for user ${userId}`);
        return cachedData;
      }
    }
    
    console.log(`Cache miss or refresh forced for profile ${dataType}, fetching fresh data...`);
    
    // If not in cache or forcing refresh, fetch fresh data
    console.time(`fetchProfile${dataType}`);
    const freshData = await fetchFn();
    console.timeEnd(`fetchProfile${dataType}`);
    
    // Store in cache for next time
    if (freshData) {
      const type = getDataType(freshData) || ('tweets' as any);
      await cacheProfileData(cacheKey, freshData, type, cacheDuration);
    }
    
    return freshData;
  } catch (error) {
    console.error(`Error fetching profile ${dataType} data for ${userId}:`, error);
    
    // Try to get any cached version even if expired as fallback
    const staleKey = getProfileCacheKey(userId, dataType, params);
    
    try {
      // Try memory without expiry check
      const cachedEntry = profileMemoryCache.get(staleKey);
      if (cachedEntry?.data) {
        console.log(`Using stale memory cache as fallback for: ${staleKey}`);
        return cachedEntry.data as T;
      }
      
      // Try localStorage without expiry check
      const lsData = localStorage.getItem(`profile-cache-${staleKey}`);
      if (lsData) {
        const parsed = JSON.parse(lsData);
        console.log(`Using stale localStorage cache as fallback for: ${staleKey}`);
        return parsed.data as T;
      }
    } catch (fallbackError) {
      console.error('Error getting fallback cache:', fallbackError);
    }
    
    throw error;
  }
};

// Clear all profile caches for a user
export const clearProfileCache = async (userId: string): Promise<void> => {
  try {
    console.log(`Clearing all profile cache for user ${userId}`);
    
    // Clear from memory cache
    for (const [key, value] of profileMemoryCache.entries()) {
      if (key.includes(`profile-${userId}`)) {
        profileMemoryCache.delete(key);
      }
    }
    
    // Clear from localStorage
    for (const key in localStorage) {
      if (key.startsWith('profile-cache-') && key.includes(userId)) {
        localStorage.removeItem(key);
      }
    }
    
    // Additional cache clearing for profile posts
    try {
      localStorage.removeItem(`tweet-cache-profile-${userId}-posts-limit:20-offset:0`);
      localStorage.removeItem(`tweet-cache-profile-${userId}-media-limit:20-offset:0`);
    } catch (e) {
      console.error(`Error clearing additional profile caches: ${e}`);
    }
    
    // Clear from DB cache
    await supabase
      .from('market_cache')
      .delete()
      .like('cache_key', `profile-${userId}%`);
      
    console.log(`Successfully cleared all profile cache for user ${userId}`);
  } catch (err) {
    console.error(`Error clearing profile cache: ${err}`);
  }
};

// Periodically clean up memory cache
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, value] of profileMemoryCache.entries()) {
    if (value.expires < now) {
      profileMemoryCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`Profile memory cache cleanup: removed ${expiredCount} expired items`);
  }
}, 60000); // Every minute
