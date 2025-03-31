
import React from 'react';
import { Link } from 'react-router-dom';

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
 * Format text by converting hashtags into clickable links
 */
export function formatTextWithHashtags(text: string, linkClassName: string = "text-crypto-blue hover:underline font-medium"): React.ReactNode[] {
  if (!text) return [];
  
  const parts: React.ReactNode[] = [];
  const hashtagRegex = /#(\w+)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before the hashtag
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Create a clickable link for the hashtag using React.createElement instead of JSX
    const hashtag = match[0]; // Full hashtag with #
    const hashtagName = match[1]; // Hashtag name without #
    
    parts.push(
      React.createElement(
        Link, 
        {
          key: `hashtag-${match.index}`,
          to: `/hashtag/${hashtagName}`,
          className: linkClassName,
          onClick: (e: React.MouseEvent) => e.stopPropagation()
        },
        hashtag
      )
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last hashtag
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}
