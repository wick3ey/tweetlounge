
import { formatDistanceToNow } from 'date-fns';

/**
 * Robust function to check if a string can be safely parsed as a valid date
 */
export const isValidDateString = (dateString: unknown): boolean => {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  try {
    const cleanedDateString = dateString.trim();
    const date = new Date(cleanedDateString);
    
    // Check if date is valid
    if (isNaN(date.getTime()) || date.toString() === "Invalid Date") {
      return false;
    }
    
    // Extra validation for reasonable date ranges (10 years past to 1 year future)
    const now = new Date();
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    const tenYearsInMs = 10 * oneYearInMs;
    
    if (date > new Date(now.getTime() + oneYearInMs) || 
        date < new Date(now.getTime() - tenYearsInMs)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Formats a date string to a relative time (e.g., "2 hours ago")
 * With multiple layers of validation and fallbacks
 */
export const formatRelativeTime = (dateString: unknown, fallback: string = 'recently'): string => {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  
  try {
    const date = new Date(dateString as string);
    
    // Extra protection around date-fns calls
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (formatError) {
      console.warn("Error in formatDistanceToNow:", formatError);
      
      // Fallback to manual formatting if date-fns fails
      const now = new Date();
      const diffInMilliseconds = now.getTime() - date.getTime();
      
      if (diffInMilliseconds < 0) return fallback;
      
      const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
      
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
  } catch (error) {
    console.warn("Error formatting date:", error, "for date string:", dateString);
    return fallback;
  }
};

/**
 * Creates a safe date object with fallback to current date if invalid
 */
export const createSafeDate = (dateString: unknown): Date => {
  if (isValidDateString(dateString)) {
    return new Date(dateString as string);
  }
  
  // Return current date as fallback
  return new Date();
};

/**
 * Safely formats a date for display with a specified format
 */
export const formatSafeDate = (dateString: unknown, format: string = 'relative', fallback: string = 'recently'): string => {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  
  const date = new Date(dateString as string);
  
  try {
    if (format === 'relative') {
      return formatRelativeTime(dateString, fallback);
    }
    
    // Simple date formatting fallbacks in case date-fns fails
    if (format === 'short') {
      return date.toLocaleDateString();
    }
    
    if (format === 'long') {
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Default to basic date string
    return date.toDateString();
  } catch (error) {
    console.warn("Error in formatSafeDate:", error);
    return fallback;
  }
};

/**
 * Safe wrapper for date-fns formatDistanceToNow
 * Returns fallback string if date is invalid
 */
export const safeFormatDistanceToNow = (dateString: unknown, fallback: string = 'recently'): string => {
  if (!isValidDateString(dateString)) {
    return fallback;
  }
  
  try {
    const date = new Date(dateString as string);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn("Error in safeFormatDistanceToNow:", error, "for date string:", dateString);
    return fallback;
  }
};
