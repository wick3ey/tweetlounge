
import React from 'react';
import { formatTextWithHashtags } from '@/utils/hashtagUtils';

interface TweetContentProps {
  content: string;
}

const TweetContent: React.FC<TweetContentProps> = ({ content }) => {
  return (
    <p className="text-white whitespace-pre-wrap break-words">
      {formatTextWithHashtags(content)}
    </p>
  );
};

export default TweetContent;
