
import React, { useState, useEffect } from 'react';
import { Comment } from '@/types/Comment';
import CommentCard from './CommentCard';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommentListProps {
  tweetId?: string;
}

const CommentList: React.FC<CommentListProps> = ({ tweetId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tweetId) {
      fetchComments();
    }
  }, [tweetId]);

  const fetchComments = async () => {
    if (!tweetId) return;
    
    setLoading(true);
    try {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      {comments.map((comment) => (
        <CommentCard 
          key={comment.id} 
          comment={comment} 
          tweetId={tweetId || ''} 
        />
      ))}
    </div>
  );
};

export default CommentList;
