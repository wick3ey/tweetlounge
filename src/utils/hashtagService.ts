
/**
 * Utility functions for handling hashtags in tweets
 */

/**
 * Extracts hashtags from the content of a tweet
 * @param content - Tweet content to extract hashtags from
 * @returns Array of hashtags found in the content
 */
export const extractHashtags = (content: string): string[] => {
  // Basic regex to match hashtags
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Remove the # symbol and convert to lowercase for consistency
  return matches.map(tag => tag.substring(1).toLowerCase());
};

/**
 * Stores hashtags in the database linked to a tweet
 * @param hashtags - Array of hashtags to store
 * @param tweetId - The ID of the tweet the hashtags belong to
 */
export const storeHashtags = async (hashtags: string[], tweetId: string): Promise<void> => {
  if (!hashtags.length) return;
  
  try {
    console.debug(`[hashtagService] Storing ${hashtags.length} hashtags for tweet ${tweetId}`);
    
    // In an actual implementation, this would save to a database
    // For now, we'll just log them as this is not critical functionality
    console.debug(`[hashtagService] Hashtags: ${hashtags.join(', ')}`);
    
    // Future implementation would store these properly in a hashtags table
  } catch (error) {
    console.error(`[hashtagService] Error storing hashtags:`, error);
  }
};
