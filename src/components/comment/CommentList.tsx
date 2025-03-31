
import React, { useState, useEffect, useMemo } from 'react';
import { Comment } from '@/types/Comment';
import CommentCard from './CommentCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { updateTweetCommentCount } from '@/services/commentService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface CommentListProps {
  tweetId?: string;
  onCommentCountUpdated?: (count: number) => void;
  onAction?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({ tweetId, onCommentCountUpdated, onAction }) => {
  const [totalComments, setTotalComments] = useState(0);
  const queryClient = useQueryClient();
  
  // Create stable query key
  const commentsQueryKey = useMemo(() => ['comments', tweetId], [tweetId]);
  
  // Optimized React Query configuration
  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      if (!tweetId) return [];
      return fetchComments();
    },
    enabled: !!tweetId,
    staleTime: 15 * 1000, // Keep data fresh longer (15 seconds)
    refetchOnWindowFocus: false,
    // Add placeholderData to avoid empty states during refetches
    placeholderData: keepPreviousData => keepPreviousData
  });
  
  // Optimized real-time updates
  useEffect(() => {
    if (tweetId) {
      // Setup realtime subscription with a unique channel name
      const channelName = `rt:comments:${tweetId.substring(0, 8)}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `tweet_id=eq.${tweetId}`
        }, (payload) => {
          // Use optimistic updates for immediate UI feedback
          if (payload.eventType === 'INSERT') {
            // Just increment count for immediate feedback
            setTotalComments(prev => prev + 1);
            
            // Queue invalidation for actual data refresh
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: commentsQueryKey });
              
              // Update the tweet's comment count in the database asynchronously
              updateTweetCommentCount(tweetId).then(() => {
                getExactCommentCount();
                queryClient.invalidateQueries({ queryKey: ['tweet', tweetId] });
                queryClient.invalidateQueries({ queryKey: ['tweets'] });
              });
            }, 50);
          } else {
            // For other events, refresh data normally
            queryClient.invalidateQueries({ queryKey: commentsQueryKey });
            
            // Update count in database
            updateTweetCommentCount(tweetId).then(() => {
              getExactCommentCount();
              queryClient.invalidateQueries({ queryKey: ['tweet', tweetId] });
            });
          }
        })
        .subscribe(status => {
          console.log(`Comment subscription for tweet ${tweetId} status:`, status);
        });
        
      // Initial count fetch
      getExactCommentCount();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tweetId, queryClient, commentsQueryKey]);

  // Optimized comment count retrieval
  const getExactCommentCount = async () => {
    if (!tweetId) return;
    
    try {
      // Check cache first
      const cachedCount = queryClient.getQueryData(['tweet-comments-count', tweetId]);
      if (cachedCount !== undefined) {
        setTotalComments(cachedCount as number);
        
        // Notify parent component
        if (onCommentCountUpdated) {
          onCommentCountUpdated(cachedCount as number);
        }
        return;
      }
      
      // If not in cache, fetch from database
      const { count, error: countError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('tweet_id', tweetId);
        
      if (countError) {
        console.error('Error counting comments:', countError);
      } else {
        // Ensure count is always a number
        const commentCount = typeof count === 'number' ? count : 0;
        setTotalComments(commentCount);
        
        // Cache the count
        queryClient.setQueryData(['tweet-comments-count', tweetId], commentCount);
        
        // Notify parent component
        if (onCommentCountUpdated) {
          onCommentCountUpdated(commentCount);
        }
        
        // Update tweet replies_count in the database asynchronously
        supabase
          .from('tweets')
          .update({ replies_count: commentCount })
          .eq('id', tweetId)
          .then(() => {
            // Update the tweet data in the React Query cache
            queryClient.setQueryData(['tweet', tweetId], (oldTweet: any) => {
              if (!oldTweet) return oldTweet;
              return { ...oldTweet, replies_count: commentCount };
            });
          });
      }
    } catch (err) {
      console.error('Failed to get exact comment count:', err);
    }
  };

  // Optimized comment fetching
  const fetchComments = async (): Promise<Comment[]> => {
    if (!tweetId) return [];
    
    try {
      // Try to get from cache first for instant loading
      const cachedComments = queryClient.getQueryData(commentsQueryKey);
      if (cachedComments) {
        // Still update count in background
        getExactCommentCount();
        return cachedComments as Comment[];
      }
      
      // Fetch parent comments with optimized query
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
        return [];
      }
      
      // Get exact comment count in background
      getExactCommentCount();
      
      if (data) {
        const formattedComments: Comment[] = data.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          tweet_id: comment.tweet_id,
          parent_comment_id: comment.parent_reply_id,
          created_at: comment.created_at,
          likes_count: comment.likes_count,
          author: {
            username: comment.profiles.username,
            display_name: comment.profiles.display_name,
            avatar_url: comment.profiles.avatar_url || '',
            avatar_nft_id: comment.profiles.avatar_nft_id,
            avatar_nft_chain: comment.profiles.avatar_nft_chain
          }
        }));
        
        return formattedComments;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return [];
    }
  };

  // Refresh comments when an action occurs
  const handleCommentAction = () => {
    queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    if (onAction) {
      onAction();
    }
  };

  // Optimized loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in-50 duration-300">
        <div className="text-gray-500 font-medium py-2 border-b border-gray-800 animate-pulse">
          Loading comments...
        </div>
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex space-x-3 p-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-gray-800 rounded" />
              <div className="h-3 w-3/4 bg-gray-800 rounded" />
              <div className="h-10 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in-50 duration-300">
      <div className="text-gray-500 font-medium py-2 border-b border-gray-800">
        {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
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

export default CommentList;
