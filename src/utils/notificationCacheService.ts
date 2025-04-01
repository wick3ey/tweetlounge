
import { CACHE_DURATIONS } from './cacheService';
import { Notification } from '@/types/Notification';

// In-memory LRU cache for microsecond access speed
const MAX_CACHE_SIZE = 1000; // Store up to 1000 notifications in memory
const notificationsCache = new Map<string, {
  data: Notification[];
  timestamp: number;
  expiry: number;
}>();

// Track cache hits/misses for performance analytics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Store notifications in memory cache with high-performance indexing
 * @param userId User ID
 * @param notifications Notifications to cache
 * @param duration Cache duration in milliseconds
 */
export const cacheNotifications = (
  userId: string,
  notifications: Notification[],
  duration: number = CACHE_DURATIONS.MEDIUM
): void => {
  if (!userId) return;
  
  const cacheKey = `notifications-${userId}`;
  const now = Date.now();
  
  // Performance optimization: maintain LRU cache
  if (notificationsCache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Number.MAX_SAFE_INTEGER;
    
    // Find and remove oldest entry when cache is full
    notificationsCache.forEach((value, key) => {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      notificationsCache.delete(oldestKey);
    }
  }
  
  // Store in memory (microsecond access)
  notificationsCache.set(cacheKey, {
    data: notifications,
    timestamp: now,
    expiry: now + duration
  });
  
  // Store in localStorage (persistent across page refreshes)
  try {
    // Use a worker if available for non-blocking storage
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: notifications,
          timestamp: now,
          expiry: now + duration
        }));
      });
    } else {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: notifications,
        timestamp: now,
        expiry: now + duration
      }));
    }
  } catch (error) {
    console.error('Failed to store notifications in localStorage:', error);
  }
};

/**
 * Get cached notifications with microsecond response time
 * @param userId User ID
 * @returns Cached notifications or null if not found/expired
 */
export const getCachedNotifications = (userId: string): Notification[] | null => {
  if (!userId) return null;
  
  const cacheKey = `notifications-${userId}`;
  const now = Date.now();
  
  // First check in-memory cache (microsecond speed)
  const memoryCache = notificationsCache.get(cacheKey);
  if (memoryCache && memoryCache.expiry > now) {
    cacheHits++;
    console.log(`✅ Memory cache hit for notifications (${cacheHits} hits / ${cacheHits + cacheMisses} total)`);
    return memoryCache.data;
  }
  
  // If not in memory, check localStorage (millisecond speed)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiry > now) {
        cacheMisses++;
        console.log(`⚠️ LocalStorage cache hit for notifications (memory cache miss)`);
        
        // Update memory cache with localStorage data for future requests
        notificationsCache.set(cacheKey, {
          data: parsed.data,
          timestamp: parsed.timestamp,
          expiry: parsed.expiry
        });
        
        return parsed.data;
      }
    }
  } catch (error) {
    console.error('Failed to retrieve notifications from localStorage:', error);
  }
  
  cacheMisses++;
  console.log(`❌ Complete cache miss for notifications (${cacheMisses} misses / ${cacheHits + cacheMisses} total)`);
  return null;
};

/**
 * Update a specific notification in the cache
 * @param userId User ID
 * @param notificationId Notification ID to update
 * @param updates Updates to apply
 */
export const updateCachedNotification = (
  userId: string,
  notificationId: string,
  updates: Partial<Notification>
): void => {
  if (!userId) return;
  
  const cached = getCachedNotifications(userId);
  if (!cached) return;
  
  const updated = cached.map(notification => 
    notification.id === notificationId 
      ? { ...notification, ...updates }
      : notification
  );
  
  cacheNotifications(userId, updated);
};

/**
 * Add a new notification to the cache
 * @param userId User ID
 * @param notification Notification to add
 */
export const addCachedNotification = (
  userId: string,
  notification: Notification
): void => {
  if (!userId) return;
  
  const cached = getCachedNotifications(userId) || [];
  // Add to the beginning of the array (newest first)
  cacheNotifications(userId, [notification, ...cached]);
};

/**
 * Mark all notifications as read in the cache
 * @param userId User ID
 */
export const markAllCachedNotificationsAsRead = (userId: string): void => {
  if (!userId) return;
  
  const cached = getCachedNotifications(userId);
  if (!cached) return;
  
  const updated = cached.map(notification => ({
    ...notification,
    read: true
  }));
  
  cacheNotifications(userId, updated);
};

/**
 * Clear the notifications cache for a user
 * @param userId User ID
 */
export const clearNotificationsCache = (userId: string): void => {
  if (!userId) return;
  
  const cacheKey = `notifications-${userId}`;
  notificationsCache.delete(cacheKey);
  
  try {
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Failed to remove notifications from localStorage:', error);
  }
};

/**
 * Pre-warm cache by loading data that will likely be needed soon
 * @param userId User ID
 */
export const prewarmNotificationsCache = async (userId: string): Promise<void> => {
  // This function will be implemented in the service layer
  // It pre-loads data while the user is on other pages
  return;
};

// Initialize cache prewarming when script loads
if (typeof window !== 'undefined') {
  // Setup periodic cache maintenance
  setInterval(() => {
    const now = Date.now();
    // Clean up expired entries from memory cache
    notificationsCache.forEach((value, key) => {
      if (value.expiry < now) {
        notificationsCache.delete(key);
      }
    });
  }, 60000); // Check every minute
}
