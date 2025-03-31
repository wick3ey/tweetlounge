
import React, { useState, useEffect } from 'react';
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
  
  // Use React Query for fetching comments
  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ['comments', tweetId],
    queryFn: async () => {
      if (!tweetId) return [];
      return fetchComments();
    },
    enabled: !!tweetId,
    staleTime: 5 * 1000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false
  });
  
  // Set up real-time updates for comments
  useEffect(() => {
    if (tweetId) {
      // Setup realtime subscription with a unique channel name
      const channel = supabase
        .channel(`rt:comments:${tweetId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `tweet_id=eq.${tweetId}`
        }, (payload) => {
          console.log('CommentList detected realtime comment update:', payload);
          
          // Invalidate React Query cache for this tweet's comments
          queryClient.invalidateQueries({ queryKey: ['comments', tweetId] });
          
          // Also update the tweet's comment count in the database
          updateTweetCommentCount(tweetId).then((success) => {
            console.log(`CommentList: updated tweet ${tweetId} comment count in database: ${success}`);
            
            // Force refresh the comments count in the UI immediately
            getExactCommentCount();
            
            // Also invalidate parent tweet's data in the cache
            queryClient.invalidateQueries({ queryKey: ['tweet', tweetId] });
            queryClient.invalidateQueries({ queryKey: ['tweets'] });
          });
        })
        .subscribe(status => {
          console.log(`Comment subscription for tweet ${tweetId} status:`, status);
        });
        
      return () => {
        console.log(`Cleaning up comment subscription for tweet ${tweetId}`);
        supabase.removeChannel(channel);
      };
    }
  }, [tweetId, queryClient]);

  const getExactCommentCount = async () => {
    if (!tweetId) return;
    
    try {
      // Get the TOTAL count of ALL comments for this tweet (including replies)
      const { count, error: countError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('tweet_id', tweetId);
        
      if (countError) {
        console.error('Error counting comments:', countError);
      } else {
        // Ensure count is always a number
        const commentCount = typeof count === 'number' ? count : 0;
        console.log(`Tweet ${tweetId} has ${commentCount} total comments (from CommentList)`);
        setTotalComments(commentCount);
        
        // Notify parent component about the updated comment count
        if (onCommentCountUpdated) {
          onCommentCountUpdated(commentCount);
        }
        
        // Update tweet replies_count in the database for consistency
        await supabase
          .from('tweets')
          .update({ replies_count: commentCount })
          .eq('id', tweetId);
          
        // Update the tweet data in the React Query cache
        queryClient.setQueryData(['tweet', tweetId], (oldTweet: any) => {
          if (!oldTweet) return oldTweet;
          return { ...oldTweet, replies_count: commentCount };
        });
      }
    } catch (err) {
      console.error('Failed to get exact comment count:', err);
    }
  };

  const fetchComments = async (): Promise<Comment[]> => {
    if (!tweetId) return [];
    
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
        return [];
      }
      
      // Get exact comment count
      await getExactCommentCount();
      
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

  // Refresh comments when an action occurs (like a like)
  const handleCommentAction = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', tweetId] });
    if (onAction) {
      onAction();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
