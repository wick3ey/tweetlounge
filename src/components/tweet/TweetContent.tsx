
import React from 'react';
import { formatTextWithHashtags } from '@/utils/hashtagUtils';

interface TweetContentProps {
  content: string;
}

const TweetContent: React.FC<TweetContentProps> = ({ content }) => {
  return (
    <p className="text-white whitespace-pre-wrap break-words">
      {formatTextWithHashtags(content, "text-crypto-blue hover:underline font-medium")}
    </p>
  );
};

export default TweetContent;
