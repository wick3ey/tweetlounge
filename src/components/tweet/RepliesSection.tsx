
import { useState, useEffect } from 'react';
import { getTweetReplies } from '@/services/tweetService';
import Reply from './Reply';
import ReplyComposer from './ReplyComposer';
import { Loader2 } from 'lucide-react';

interface RepliesSectionProps {
  tweetId: string;
  isOpen: boolean;
}

const RepliesSection = ({ tweetId, isOpen }: RepliesSectionProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchReplies = async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      const data = await getTweetReplies(tweetId);
      setReplies(data);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchReplies();
  }, [tweetId, isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="border-t border-gray-800 bg-gray-900/30">
      <ReplyComposer tweetId={tweetId} onReplySuccess={fetchReplies} />
      
      {loading ? (
        <div className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-crypto-blue mx-auto" />
          <p className="text-gray-400 mt-2">Loading replies...</p>
        </div>
      ) : replies.length > 0 ? (
        <div>
          {replies.map(reply => (
            <Reply key={reply.id} reply={reply} />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-400">
          No replies yet. Be the first to reply!
        </div>
      )}
    </div>
  );
};

export default RepliesSection;
