
import { CACHE_DURATIONS } from './cacheService';
import { Notification } from '@/types/Notification';

// In-memory cache for even faster access
const notificationsCache = new Map<string, {
  data: Notification[];
  timestamp: number;
  expiry: number;
}>();

/**
 * Store notifications in memory cache
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
  
  notificationsCache.set(cacheKey, {
    data: notifications,
    timestamp: now,
    expiry: now + duration
  });
  
  // Also store in localStorage for persistence across page refreshes
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data: notifications,
      timestamp: now,
      expiry: now + duration
    }));
  } catch (error) {
    console.error('Failed to store notifications in localStorage:', error);
  }
};

/**
 * Get cached notifications
 * @param userId User ID
 * @returns Cached notifications or null if not found/expired
 */
export const getCachedNotifications = (userId: string): Notification[] | null => {
  if (!userId) return null;
  
  const cacheKey = `notifications-${userId}`;
  
  // First check in-memory cache (fastest)
  const memoryCache = notificationsCache.get(cacheKey);
  if (memoryCache && memoryCache.expiry > Date.now()) {
    console.log('Using in-memory cached notifications');
    return memoryCache.data;
  }
  
  // If not in memory, check localStorage
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiry > Date.now()) {
        console.log('Using localStorage cached notifications');
        
        // Update memory cache with localStorage data
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
