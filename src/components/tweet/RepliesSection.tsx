
import { useState, useEffect } from 'react';
import { getTweetReplies } from '@/services/tweetService';
import Reply from './Reply';
import ReplyComposer from './ReplyComposer';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface RepliesSectionProps {
  tweetId: string;
  isOpen: boolean;
}

const RepliesSection = ({ tweetId, isOpen }: RepliesSectionProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const fetchReplies = async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getTweetReplies(tweetId);
      setReplies(data);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
      setError('Could not load replies. Please try again later.');
      toast({
        title: "Error",
        description: "Failed to load replies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      fetchReplies();
    }
  }, [tweetId, isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="border-t border-gray-800 bg-crypto-darkgray">
      {user ? (
        <ReplyComposer tweetId={tweetId} onReplySuccess={fetchReplies} />
      ) : (
        <div className="p-4 text-center text-gray-400">
          Please sign in to reply to this tweet.
        </div>
      )}
      
      {loading ? (
        <div className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-crypto-blue mx-auto" />
          <p className="text-gray-400 mt-2">Loading replies...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">
          {error}
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
