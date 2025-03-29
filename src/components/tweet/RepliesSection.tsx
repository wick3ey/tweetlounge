
import { useState, useEffect } from 'react';
import { getTweetReplies } from '@/services/tweetService';
import ReplyComposer from './ReplyComposer';
import RenderRepliesTree from './RenderRepliesTree';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface RepliesSectionProps {
  tweetId: string;
  isOpen: boolean;
}

const RepliesSection = ({ tweetId, isOpen }: RepliesSectionProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOldestFirst, setSortOldestFirst] = useState(true);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Validate tweetId when component mounts
  useEffect(() => {
    if (!tweetId || tweetId.trim() === '') {
      console.error('Invalid tweetId provided to RepliesSection:', tweetId);
      setError('Invalid tweet reference');
    }
    
    // Set default sort order based on user preference if available
    if (profile?.replies_sort_order) {
      setSortOldestFirst(profile.replies_sort_order === 'oldest_first');
    }
  }, [tweetId, profile]);
  
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
        // Create a map for easy lookup of replies by ID
        const repliesMap = new Map();
        data.forEach(reply => {
          // Initialize children array if it doesn't exist
          reply.children = [];
          repliesMap.set(reply.id, reply);
        });
        
        // Organize into parent-child relationships
        const rootReplies: any[] = [];
        data.forEach(reply => {
          if (reply.parent_reply_id) {
            // This is a child reply, add it to its parent's children
            const parent = repliesMap.get(reply.parent_reply_id);
            if (parent) {
              parent.children.push(reply);
            } else {
              // If parent not found, treat as a root reply
              rootReplies.push(reply);
            }
          } else {
            // This is a root reply (directly to the tweet)
            rootReplies.push(reply);
          }
        });
        
        // Sort root replies by created_at
        const sortedReplies = sortOldestFirst 
          ? rootReplies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          : rootReplies.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
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
  }, [tweetId, isOpen, sortOldestFirst]);
  
  const toggleSortOrder = () => {
    setSortOldestFirst(!sortOldestFirst);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="border-t border-gray-800 bg-crypto-darkgray">
      {user ? (
        <ReplyComposer tweetId={tweetId} onReplySuccess={fetchReplies} />
      ) : (
        <div className="p-3 sm:p-4 text-center text-gray-400 text-sm sm:text-base">
          Please sign in to reply to this tweet.
        </div>
      )}
      
      {replies.length > 0 && (
        <div className="px-4 py-2 flex justify-between items-center border-t border-gray-800">
          <span className="text-sm font-medium text-gray-400">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <button 
            onClick={toggleSortOrder}
            className="text-xs sm:text-sm text-crypto-blue hover:underline"
          >
            Sort by: {sortOldestFirst ? 'Oldest first' : 'Latest first'}
          </button>
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
          <RenderRepliesTree replies={replies} onReplySuccess={fetchReplies} />
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
