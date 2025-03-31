
import React from 'react';

/**
 * Utility functions for extracting and handling hashtags
 */

/**
 * Extracts hashtags from text
 * @param text The text to extract hashtags from
 * @returns Array of hashtag names without the # symbol
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  // Regex to find hashtags - matches # followed by word characters
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  
  // Return unique hashtags without the # symbol
  if (matches) {
    return [...new Set(matches)].map(tag => tag.substring(1).toLowerCase());
  }
  
  return [];
}

/**
 * Format text by converting hashtags into JSX elements
 */
export function formatTextWithHashtags(text: string, linkClassName: string = "text-crypto-blue hover:underline"): React.ReactNode[] {
  if (!text) return [];
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const hashtagRegex = /#(\w+)/g;
  let match;
  
  // Clone the text to avoid modifying the original
  const textString = String(text);
  
  while ((match = hashtagRegex.exec(textString)) !== null) {
    // Add text before the hashtag
    if (match.index > lastIndex) {
      parts.push(textString.substring(lastIndex, match.index));
    }
    
    // Add the hashtag as a link
    const hashtag = match[0]; // Complete hashtag (#example)
    const hashtagName = match[1]; // Just the name (example)
    
    parts.push(
      React.createElement("a", {
        key: `hashtag-${match.index}`,
        href: `/hashtag/${hashtagName}`,
        className: linkClassName,
        onClick: (e: React.MouseEvent) => e.stopPropagation()
      }, hashtag)
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add the remaining text
  if (lastIndex < textString.length) {
    parts.push(textString.substring(lastIndex));
  }
  
  return parts;
}
