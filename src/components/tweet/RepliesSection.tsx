import { useState, useEffect } from 'react';
import { getTweetReplies } from '@/services/tweetService';
import Reply from './Reply';
import ReplyComposer from './ReplyComposer';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TweetCard from './TweetCard';
import { createSafeDate } from '@/utils/dateUtils';

interface RepliesSectionProps {
  tweetId: string;
  isOpen: boolean;
  onClose?: () => void;
  showFullScreen?: boolean;
}

const RepliesSection = ({ 
  tweetId, 
  isOpen,
  onClose,
  showFullScreen = false
}: RepliesSectionProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Validate tweetId when component mounts
  useEffect(() => {
    if (!tweetId || tweetId.trim() === '') {
      console.error('Invalid tweetId provided to RepliesSection:', tweetId);
      setError('Invalid tweet reference');
    }
  }, [tweetId]);
  
  const fetchReplies = async () => {
    if (!isOpen) return;
    if (!tweetId || tweetId.trim() === '') {
      setError('Invalid tweet reference');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getTweetReplies(tweetId);
      
      if (Array.isArray(data)) {
        // Enhanced validation for each reply's created_at date
        const validatedReplies = data.map(reply => {
          // Return reply with safe date - if date is invalid, our utility will handle it
          return {
            ...reply,
            created_at: reply.created_at || new Date().toISOString(),
            safe_date: createSafeDate(reply.created_at)
          };
        });
        
        // Sort by the safe date (newest first)
        const sortedReplies = validatedReplies.sort((a, b) => 
          b.safe_date.getTime() - a.safe_date.getTime()
        );
        
        setReplies(sortedReplies);
      } else {
        console.error('Unexpected response format:', data);
        setReplies([]);
        setError('Error loading replies: Unexpected data format');
      }
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
    if (isOpen && tweetId && tweetId.trim() !== '') {
      fetchReplies();
    }
  }, [tweetId, isOpen]);
  
  if (!isOpen) return null;

  // For full screen mode (separate page-like view)
  if (showFullScreen) {
    return (
      <div className="fixed inset-0 bg-crypto-darkgray z-50 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-crypto-darkgray p-4 border-b border-gray-800 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-6"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Post</h1>
        </div>

        <div className="p-0 divide-y divide-gray-800">
          {/* Original Tweet */}
          <TweetCard 
            tweet={{id: tweetId} as any} 
            hideActions={true}
            expandedView={true}
          />
          
          {/* Reply Composer */}
          {user ? (
            <ReplyComposer tweetId={tweetId} onReplySuccess={fetchReplies} fullScreen={true} />
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              Please sign in to reply to this tweet.
            </div>
          )}
          
          {/* Replies Section */}
          {loading ? (
            <div className="p-6 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
              <p className="text-gray-400 mt-2 text-sm">Loading replies...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500 text-sm">
              {error}
            </div>
          ) : replies.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {replies.map(reply => (
                <Reply key={reply.id} reply={reply} expanded={true} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400 text-sm">
              No replies yet. Be the first to reply!
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Regular embedded view
  return (
    <div className="border-t border-gray-800 bg-crypto-darkgray">
      {user ? (
        <ReplyComposer tweetId={tweetId} onReplySuccess={fetchReplies} />
      ) : (
        <div className="p-3 sm:p-4 text-center text-gray-400 text-sm sm:text-base">
          Please sign in to reply to this tweet.
        </div>
      )}
      
      {loading ? (
        <div className="p-3 sm:p-6 flex flex-col items-center justify-center">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-crypto-blue" />
          <p className="text-gray-400 mt-2 text-xs sm:text-sm">Loading replies...</p>
        </div>
      ) : error ? (
        <div className="p-3 sm:p-6 text-center text-red-500 text-xs sm:text-sm">
          {error}
        </div>
      ) : replies.length > 0 ? (
        <div className="max-w-full overflow-hidden">
          {replies.map(reply => (
            <Reply key={reply.id} reply={reply} />
          ))}
        </div>
      ) : (
        <div className="p-3 sm:p-6 text-center text-gray-400 text-xs sm:text-sm">
          No replies yet. Be the first to reply!
        </div>
      )}
    </div>
  );
};

export default RepliesSection;
