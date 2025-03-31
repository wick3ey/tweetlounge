
import { supabase } from '@/integrations/supabase/client';

// Cache durations
export const CACHE_DURATIONS = {
  SHORT: 5 * 60, // 5 minutes (in seconds)
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 24 * 60 * 60, // 24 hours
  VERY_LONG: 7 * 24 * 60 * 60, // 7 days
};

// Get cached data by key
export const getCachedData = async <T>(cacheKey: string): Promise<T | null> => {
  try {
    const { data, error } = await supabase
      .from('market_cache')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .single();
      
    if (error) {
      console.error(`Error fetching cached data for ${cacheKey}:`, error);
      return null;
    }
    
    if (!data) return null;
    
    return data.data as T;
  } catch (error) {
    console.error(`Error in getCachedData for ${cacheKey}:`, error);
    return null;
  }
};

// Set cached data by key
export const setCachedData = async <T>(
  cacheKey: string,
  data: T,
  expirySeconds = CACHE_DURATIONS.MEDIUM
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('market_cache')
      .upsert(
        {
          cache_key: cacheKey,
          data: data as any, // Cast to any to resolve type conflict
          expires_at: new Date(Date.now() + expirySeconds * 1000).toISOString(),
        },
        { onConflict: 'cache_key' }
      );
      
    if (error) {
      console.error(`Error setting cached data for ${cacheKey}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in setCachedData for ${cacheKey}:`, error);
    return false;
  }
};

// Clear cached data by key
export const clearCachedData = async (cacheKey: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('market_cache')
      .delete()
      .eq('cache_key', cacheKey);
      
    if (error) {
      console.error(`Error clearing cached data for ${cacheKey}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in clearCachedData for ${cacheKey}:`, error);
    return false;
  }
};

// Cleanup expired cache entries
export const cleanupExpiredCache = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('market_cache')
      .delete()
      .lt('expires_at', now);
      
    if (error) {
      console.error('Error cleaning up expired cache:', error);
    } else {
      console.log('Successfully cleaned up expired cache entries');
    }
  } catch (error) {
    console.error('Error in cleanupExpiredCache:', error);
  }
};
