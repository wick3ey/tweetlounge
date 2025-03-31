
// This is a simplified cache service 
// to replace the previous one we've removed

/**
 * Cache durations in milliseconds for different types of data
 */
export const CACHE_DURATIONS = {
  VERY_SHORT: 5 * 60 * 1000, // 5 minutes
  SHORT: 15 * 60 * 1000, // 15 minutes
  MEDIUM: 60 * 60 * 1000, // 1 hour
  LONG: 6 * 60 * 60 * 1000, // 6 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

// In-memory cache as a fallback
const memoryCache: { [key: string]: { data: any; expiry: number } } = {};

/**
 * Store data in the cache
 * @param key The cache key
 * @param data The data to cache
 * @param duration How long to keep the data in milliseconds
 * @param tags Optional tags for categorizing cache entries
 */
export async function setCachedData<T>(
  key: string, 
  data: T, 
  duration: number = CACHE_DURATIONS.MEDIUM,
  tags?: string | string[]
): Promise<void> {
  try {
    // Since we've removed the actual implementation, 
    // we'll just use in-memory cache as a fallback
    memoryCache[key] = {
      data,
      expiry: Date.now() + duration
    };
    
    console.log(`Cached data for key: ${key} in memory`);
  } catch (error) {
    console.error(`Error setting cached data for key ${key}:`, error);
  }
}

/**
 * Retrieve data from the cache
 * @param key The cache key
 * @returns The cached data, or null if not found or expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    // Check memory cache first
    const cachedItem = memoryCache[key];
    
    if (cachedItem && cachedItem.expiry > Date.now()) {
      console.log(`Retrieved cached data for key: ${key} from memory`);
      return cachedItem.data as T;
    }
    
    // If expired or not found in memory, remove it
    if (cachedItem) {
      delete memoryCache[key];
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting cached data for key ${key}:`, error);
    return null;
  }
}

/**
 * Remove a specific entry from the cache
 * @param key The cache key to remove
 */
export async function removeCachedData(key: string): Promise<void> {
  try {
    delete memoryCache[key];
    console.log(`Removed cached data for key: ${key} from memory`);
  } catch (error) {
    console.error(`Error removing cached data for key ${key}:`, error);
  }
}

/**
 * Remove all expired cache entries
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const now = Date.now();
    let count = 0;
    
    // Clean up memory cache
    Object.keys(memoryCache).forEach(key => {
      if (memoryCache[key].expiry <= now) {
        delete memoryCache[key];
        count++;
      }
    });
    
    if (count > 0) {
      console.log(`Removed ${count} expired cache entries from memory`);
    }
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
  }
}

/**
 * Remove all cache entries with a specific tag
 * @param tag The tag to filter by
 */
export async function invalidateCacheByTag(tag: string): Promise<void> {
  // Since we've removed the actual implementation with tagging, 
  // this is just a stub function
  console.log(`Cache invalidation by tag is not implemented in this simplified version`);
}
