
import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '@/types/Comment';
import CommentCard from './CommentCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToCommentCountUpdates, hasActiveCommentCountSubscription } from '@/services/commentCountService';

interface CommentListProps {
  tweetId?: string;
  onCommentCountUpdated?: (count: number) => void;
  onAction?: () => void;
}

// Cache for comment data
const commentCache = new Map<string, { 
  comments: Comment[], 
  timestamp: number, 
  expiryTime: number 
}>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const CommentList: React.FC<CommentListProps> = ({ tweetId, onCommentCountUpdated, onAction }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!tweetId) return;
    
    // Initial data load
    fetchComments();
    
    // Initialize subscription once
    if (!hasInitialized) {
      setHasInitialized(true);
      
      // Set up realtime subscriptions for comment count updates only if not already active
      const cleanup = !hasActiveCommentCountSubscription(tweetId) 
        ? subscribeToCommentCountUpdates(tweetId, (count) => {
            if (!isMounted.current) return;
            
            console.log(`[CommentList] Received updated comment count: ${count}`);
            setCommentCount(count);
            
            // Propagate count update to parent components if needed
            if (onCommentCountUpdated) {
              onCommentCountUpdated(count);
            }
          })
        : () => console.log(`[CommentList] Using existing comment count subscription for ${tweetId}`);
      
      return cleanup;
    }
  }, [tweetId, onCommentCountUpdated]);

  const fetchComments = async () => {
    if (!tweetId) return;

    setLoading(true);
    
    // Check if we have a valid cache entry
    const now = Date.now();
    const cacheKey = `comments-${tweetId}`;
    const cachedData = commentCache.get(cacheKey);
    
    // Use cached data if available and not expired
    if (cachedData && now < cachedData.expiryTime) {
      console.log(`[CommentList] Using cached comments for tweet ${tweetId}`);
      setComments(cachedData.comments);
      setLoading(false);
      return;
    }
    
    try {
      // Fetch parent comments
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          user_id,
          tweet_id,
          parent_reply_id,
          created_at,
          likes_count,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            avatar_nft_id,
            avatar_nft_chain
          )
        `)
        .eq('tweet_id', tweetId)
        .is('parent_reply_id', null)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching comments:', error);
        setLoading(false);
        return;
      }
      
      if (data && isMounted.current) {
        const formattedComments: Comment[] = data.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          tweet_id: comment.tweet_id,
          parent_comment_id: comment.parent_reply_id,
          created_at: comment.created_at,
          likes_count: comment.likes_count || 0,
          author: {
            username: comment.profiles.username,
            display_name: comment.profiles.display_name,
            avatar_url: comment.profiles.avatar_url || '',
            avatar_nft_id: comment.profiles.avatar_nft_id,
            avatar_nft_chain: comment.profiles.avatar_nft_chain
          }
        }));
        
        // Store in cache
        commentCache.set(cacheKey, {
          comments: formattedComments,
          timestamp: now,
          expiryTime: now + CACHE_EXPIRY
        });
        
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Refresh comments when an action occurs (like a like)
  const handleCommentAction = () => {
    // Force refresh the cache by removing the cached entry
    if (tweetId) {
      commentCache.delete(`comments-${tweetId}`);
    }
    
    fetchComments();
    if (onAction) {
      onAction();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-gray-500 font-medium py-2 border-b border-gray-800">
        {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
      </div>
      
      {comments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentCard 
              key={comment.id} 
              comment={comment} 
              tweetId={tweetId || ''} 
              onAction={handleCommentAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Clean up expired entries from the comment cache every minute
setInterval(() => {
  const now = Date.now();
  commentCache.forEach((value, key) => {
    if (now > value.expiryTime) {
      commentCache.delete(key);
    }
  });
}, 60000);

export default CommentList;
