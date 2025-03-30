
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '@/types/Comment';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MoreHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { checkIfUserLikedComment, likeComment } from '@/services/commentService';
import { VerifiedBadge } from '@/components/ui/badge';

interface CommentCardProps {
  comment: Comment;
  tweetId: string;
  onAction?: () => void;
}

const CommentCard = ({ comment, tweetId, onAction }: CommentCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if the current user has liked this comment
    const checkLikedStatus = async () => {
      if (comment.id && user) {
        const liked = await checkIfUserLikedComment(comment.id);
        setIsLiked(liked);
      }
    };
    
    checkLikedStatus();
  }, [comment.id, user]);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'some time ago';
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to like a comment",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    if (comment.id) {
      const success = await likeComment(comment.id);
      
      if (success) {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        
        if (onAction) {
          onAction();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to like comment",
          variant: "destructive"
        });
      }
    }
  };
  
  // Check if user is NFT verified
  const isNFTVerified = comment.author.avatar_nft_id && comment.author.avatar_nft_chain;
  
  return (
    <div className="p-4 border-b border-crypto-gray hover:bg-crypto-darkgray/40 transition-colors">
      <div className="flex gap-3">
        <Link to={`/profile/${comment.author.username}`}>
          <Avatar className="h-10 w-10 border border-crypto-gray">
            <AvatarImage src={comment.author.avatar_url} />
            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
              {getInitials(comment.author.display_name || comment.author.username || 'User')}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/profile/${comment.author.username}`} className="font-semibold hover:text-crypto-blue truncate">
              {comment.author.display_name || comment.author.username}
              {isNFTVerified && <VerifiedBadge />}
            </Link>
            
            <span className="text-crypto-lightgray text-sm">
              @{comment.author.username}
            </span>
            
            <span className="text-crypto-lightgray text-sm mx-1">·</span>
            
            <span className="text-crypto-lightgray text-sm">
              {getTimeAgo(comment.created_at)}
            </span>
          </div>
          
          <Link to={`/tweet/${tweetId}`} className="block mt-1 text-sm">
            <p className="text-crypto-text whitespace-pre-wrap">{comment.content}</p>
          </Link>
          
          <div className="flex items-center gap-6 mt-3">
            <button 
              className={`flex items-center ${isLiked ? 'text-red-500' : 'text-crypto-lightgray hover:text-red-500'} group`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : 'group-hover:text-red-500'}`} />
              <span className="text-xs">{likesCount}</span>
            </button>
            
            <button 
              className="flex items-center text-crypto-lightgray hover:text-crypto-blue"
              onClick={() => {}}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
