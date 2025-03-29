
import { cleanupExpiredCache } from './cacheService';

/**
 * This service periodically cleans up expired cache entries
 * It should be initialized when the app starts
 */

let cleanupInterval: number | null = null;

/**
 * Initialize the cache cleanup service
 * @param intervalMs Time between cleanup operations in milliseconds, defaults to 30 minutes
 */
export const initCacheCleanupService = (intervalMs: number = 30 * 60 * 1000) => {
  // Only initialize once
  if (cleanupInterval !== null) return;
  
  console.log(`Initializing cache cleanup service with interval of ${intervalMs}ms`);
  
  // Run once immediately
  cleanupExpiredCache();
  
  // Then set up the interval
  cleanupInterval = window.setInterval(() => {
    console.log('Running scheduled cache cleanup');
    cleanupExpiredCache();
  }, intervalMs);
  
  return () => {
    if (cleanupInterval !== null) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  };
};

/**
 * Stop the cache cleanup service
 */
export const stopCacheCleanupService = () => {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Cache cleanup service stopped');
  }
};
