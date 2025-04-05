import React, { useState, useEffect } from 'react';
import { Comment } from '@/types/Comment';
import CommentCard from './CommentCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { countTweetComments } from '@/services/commentService';
import { updateTweetCount } from '@/utils/tweetCacheService';

interface CommentListProps {
  tweetId?: string;
  onCommentCountUpdated?: (count: number) => void;
  onAction?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({ tweetId, onCommentCountUpdated, onAction }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (!tweetId) return;
    
    // Initial data load
    fetchComments();
    
    // Get the exact comment count from the database
    countTweetComments(tweetId).then(count => {
      setCommentCount(count);
      
      // Update the count cache
      updateTweetCount(tweetId, { replies_count: count });
      
      // Propagate count update to parent components if needed
      if (onCommentCountUpdated) {
        onCommentCountUpdated(count);
      }
    });
    
    // Set up realtime subscriptions
    const commentsChannel = supabase
      .channel(`comments-for-tweet-${tweetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `tweet_id=eq.${tweetId}`
      }, (payload) => {
        console.log('Realtime update on comments:', payload);
        
        // Refresh comments
        fetchComments();
        
        // Get updated count
        countTweetComments(tweetId).then(count => {
          setCommentCount(count);
          
          // Update the count cache
          updateTweetCount(tweetId, { replies_count: count });
          
          // Propagate count update to parent components if needed
          if (onCommentCountUpdated) {
            onCommentCountUpdated(count);
          }
        });
      })
      .subscribe();
      
    const broadcastChannel = supabase
      .channel('custom-all-channel')
      .on('broadcast', { event: 'comment-count-updated' }, (payload) => {
        console.log('Broadcast received for comment count update:', payload);
        if (payload.payload && payload.payload.tweetId === tweetId) {
          const count = payload.payload.count || payload.payload.commentCount;
          if (count !== undefined) {
            setCommentCount(count);
            
            // Update the count cache
            updateTweetCount(tweetId, { replies_count: count });
            
            if (onCommentCountUpdated) {
              onCommentCountUpdated(count);
            }
          }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [tweetId, onCommentCountUpdated]);

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
      
      if (data) {
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
        
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
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

export default CommentList;
