import { supabase } from '@/integrations/supabase/client';

/**
 * Generic cache service for storing and retrieving data from the database
 * This creates a shared cache across all users to reduce API calls
 */

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

// Keep track of active cache operations to prevent duplicates
const pendingCacheOperations = new Map<string, Promise<any>>();

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    console.log(`Checking cache for key: ${key}`);
    
    const { data, error } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching from cache: ${error.message}`);
      return null;
    }
    
    if (!data) {
      console.log(`No valid cache found for key: ${key}`);
      return null;
    }
    
    console.log(`Cache hit for key: ${key}`);
    return data.data as T;
  } catch (err) {
    console.error(`Unexpected error in getCachedData: ${err}`);
    return null;
  }
};

/**
 * Store data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param duration Cache duration in milliseconds
 * @param source Optional source identifier
 * @returns Success status
 */
export const setCachedData = async <T>(
  key: string,
  data: T,
  duration: number = CACHE_DURATIONS.MEDIUM,
  source?: string
): Promise<boolean> => {
  // If there's already a pending operation for this key, wait for it to complete
  if (pendingCacheOperations.has(key)) {
    try {
      await pendingCacheOperations.get(key);
      return true; // The other operation has already handled this key
    } catch (err) {
      console.warn(`Previous cache operation for ${key} failed:`, err);
      // Continue with our own attempt
    }
  }

  const cacheOperation = (async () => {
    try {
      console.log(`Setting cache for key: ${key}, duration: ${duration}ms`);
      
      // Calculate expiration time
      const expires = new Date(Date.now() + duration);
      
      // First, try to update any existing entry with this key
      const { error: updateError, data: updateData } = await supabase
        .from('market_cache')
        .update({
          data: data as any, // Cast to any to bypass the TypeScript error
          source,
          expires_at: expires.toISOString()
        })
        .eq('cache_key', key)
        .select('id');
      
      // If update succeeded and found a row, we're done
      if (!updateError && updateData && updateData.length > 0) {
        console.log(`Successfully updated cache for key: ${key}, expires: ${expires.toISOString()}`);
        return true;
      }
      
      // If there's nothing to update, or we hit a constraint error, try an insert 
      // But first delete any existing entry to avoid constraint errors
      try {
        await supabase
          .from('market_cache')
          .delete()
          .eq('cache_key', key);
      } catch (deleteError) {
        console.warn(`Error clearing existing cache (non-critical): ${deleteError}`);
        // Continue despite delete error
      }
      
      // Then insert the new cache entry
      const { error } = await supabase
        .from('market_cache')
        .insert({
          cache_key: key,
          data: data as any, // Cast to any to bypass the TypeScript error
          source,
          expires_at: expires.toISOString()
        });
      
      if (error) {
        // If it's a duplicate key error, that probably means another process inserted it
        // between our delete and insert. That's fine, as long as there's a valid entry.
        if (error.message.includes('duplicate key')) {
          console.log(`Cache entry for ${key} was created by another process.`);
          return true;
        }
        
        console.error(`Error setting cache: ${error.message}`);
        return false;
      }
      
      console.log(`Successfully cached data for key: ${key}, expires: ${expires.toISOString()}`);
      return true;
    } catch (err) {
      console.error(`Unexpected error in setCachedData: ${err}`);
      throw err; // Rethrow to signal failure to waiting operations
    } finally {
      // Clean up the pending operation
      pendingCacheOperations.delete(key);
    }
  })();
  
  // Store the promise so other calls can wait for it
  pendingCacheOperations.set(key, cacheOperation);
  
  // Execute the operation
  try {
    return await cacheOperation;
  } catch (err) {
    return false;
  }
};

/**
 * Delete expired cache entries
 * This can be called periodically to clean up the cache
 */
export const cleanupExpiredCache = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('market_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error(`Error cleaning up cache: ${error.message}`);
    } else {
      console.log('Successfully cleaned up expired cache entries');
    }
  } catch (err) {
    console.error(`Unexpected error in cleanupExpiredCache: ${err}`);
  }
};
