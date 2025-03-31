
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
      .gt('expires_at', new Date().toISOString()) // Only get non-expired data
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching from cache: ${error.message}`);
      return null;
    }
    
    if (!data) {
      console.log(`No valid cache found for key: ${key}`);
      return null;
    }
    
    console.log(`Cache hit for key: ${key}, expires at: ${data.expires_at}`);
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
  try {
    console.log(`Setting cache for key: ${key}, duration: ${duration}ms`);
    
    // Calculate expiration time
    const expires = new Date(Date.now() + duration);
    
    // First, remove any existing entries with this key
    const { error: deleteError } = await supabase
      .from('market_cache')
      .delete()
      .eq('cache_key', key);
    
    if (deleteError) {
      console.error(`Error clearing existing cache: ${deleteError.message}`);
    }
    
    // Then insert the new cache entry
    const { error } = await supabase
      .from('market_cache')
      .insert({
        cache_key: key,
        data: data as any, // Cast to any to bypass TypeScript error
        source,
        expires_at: expires.toISOString()
      });
    
    if (error) {
      console.error(`Error setting cache: ${error.message}`);
      return false;
    }
    
    console.log(`Successfully cached data for key: ${key}, expires: ${expires.toISOString()}`);
    return true;
  } catch (err) {
    console.error(`Unexpected error in setCachedData: ${err}`);
    return false;
  }
};

/**
 * Get a cached image URL or null if not found
 * @param symbol Token symbol
 * @returns The cached image URL or null
 */
export const getCachedImageUrl = async (symbol: string): Promise<string | null> => {
  try {
    if (!symbol) return null;
    
    const fileName = `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
    
    // Check if image exists in storage
    const { data: fileExists, error } = await supabase
      .storage
      .from('token-logos')
      .list('', {
        search: fileName
      });
      
    if (error) {
      console.error(`Error checking cached image for ${symbol}:`, error);
      return null;
    }
    
    if (fileExists && fileExists.length > 0) {
      const { data } = supabase
        .storage
        .from('token-logos')
        .getPublicUrl(fileName);
        
      return data.publicUrl;
    }
    
    return null;
  } catch (err) {
    console.error(`Error getting cached image for ${symbol}:`, err);
    return null;
  }
};

/**
 * Delete expired cache entries
 * This can be called periodically to clean up the cache
 */
export const cleanupExpiredCache = async (): Promise<void> => {
  try {
    // Clean up market_cache table
    const { error } = await supabase
      .from('market_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error(`Error cleaning up cache: ${error.message}`);
    } else {
      console.log('Successfully cleaned up expired cache entries');
    }
    
    // Clean up token-logos storage (files older than 30 minutes)
    // Note: This requires a more complex implementation with a metadata table
    // or using the list function to find files by created_at
    // For now, we'll let the images accumulate as they don't take much space
    
  } catch (err) {
    console.error(`Unexpected error in cleanupExpiredCache: ${err}`);
  }
};
