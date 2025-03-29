
import { formatDistanceToNow } from 'date-fns';

/**
 * Verifies if a date string can be parsed into a valid Date object
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
    return formatDistanceToNow(date, { addSuffix: true });
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
