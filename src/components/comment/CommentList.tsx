import React, { useState, useEffect } from 'react';
import { Comment } from '@/types/Comment';
import CommentCard from './CommentCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommentListProps {
  tweetId?: string;
  onCommentCountUpdated?: (count: number) => void;
  onAction?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({ tweetId, onCommentCountUpdated, onAction }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    if (tweetId) {
      fetchComments();
      
      // Setup realtime subscription for comments
      const channel = supabase
        .channel(`comments_for_tweet_${tweetId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `tweet_id=eq.${tweetId}`
        }, (payload) => {
          console.log('Realtime comment update:', payload);
          fetchComments();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tweetId]);

  const fetchComments = async () => {
    if (!tweetId) return;
    
    setLoading(true);
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
        return;
      }
      
      // Get the TOTAL count of ALL comments for this tweet (including replies)
      const { count, error: countError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('tweet_id', tweetId);
        
      if (countError) {
        console.error('Error counting comments:', countError);
      } else {
        const commentCount = typeof count === 'number' ? count : 0;
        console.log(`Tweet ${tweetId} has ${commentCount} total comments`);
        setTotalComments(commentCount);
        
        // Notify parent component about the updated comment count
        if (onCommentCountUpdated) {
          onCommentCountUpdated(commentCount);
        }
        
        // Update the tweet's replies_count if it doesn't match the actual count
        await updateTweetRepliesCount(tweetId, commentCount);
      }
      
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
        
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update the tweet's replies_count to match the actual comment count
  const updateTweetRepliesCount = async (tweetId: string, commentCount: number) => {
    try {
      // First get the current replies_count
      const { data: tweetData, error: tweetError } = await supabase
        .from('tweets')
        .select('replies_count')
        .eq('id', tweetId)
        .single();
        
      if (tweetError) {
        console.error('Error fetching tweet:', tweetError);
        return;
      }
      
      // Only update if the count doesn't match
      if (tweetData && tweetData.replies_count !== commentCount) {
        console.log(`Updating tweet ${tweetId} replies_count from ${tweetData.replies_count} to ${commentCount}`);
        
        const { error: updateError } = await supabase
          .from('tweets')
          .update({ replies_count: commentCount })
          .eq('id', tweetId);
          
        if (updateError) {
          console.error('Error updating tweet replies count:', updateError);
        } else {
          console.log(`Updated tweet ${tweetId} replies_count to ${commentCount}`);
        }
      }
    } catch (err) {
      console.error('Failed to update tweet replies count:', err);
    }
  };

  // Refresh comments when an action occurs (like a like)
  const handleCommentAction = () => {
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
