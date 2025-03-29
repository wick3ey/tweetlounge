
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createComment } from '@/services/commentService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface CommentFormProps {
  tweetId?: string;
  parentCommentId?: string;
  onSubmit?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ tweetId, parentCommentId, onSubmit }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to comment",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Empty Comment",
        description: "Please write something before posting",
        variant: "destructive"
      });
      return;
    }
    
    if (!tweetId) {
      toast({
        title: "Error",
        description: "Invalid tweet ID",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const comment = await createComment(tweetId, content, parentCommentId);
      
      if (comment) {
        toast({
          title: "Comment Posted",
          description: "Your comment has been added successfully"
        });
        
        setContent('');
        if (onSubmit) onSubmit();
      } else {
        toast({
          title: "Error",
          description: "Failed to post comment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3 p-2 border-t border-b border-gray-800">
      <Avatar className="h-10 w-10 border border-crypto-gray">
        <AvatarImage src={profile?.avatar_url || ''} />
        <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
          {profile?.display_name ? getInitials(profile.display_name) : user?.email?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add your comment..."
          rows={2}
          className="w-full bg-black border border-gray-800 rounded-md p-2 text-white focus:border-crypto-blue focus:outline-none focus:ring-1 focus:ring-crypto-blue resize-none"
          maxLength={280}
          disabled={isSubmitting}
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-crypto-blue hover:bg-crypto-blue/80" 
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting</>
            ) : (
              'Comment'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
