
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Heart, MessageCircle, Repeat, Share, Trash2 } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { likeTweet, deleteTweet, checkIfUserLikedTweet } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onClick, onAction, onDelete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(tweet.likes_count || 0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Check if user liked the tweet on component mount
  React.useEffect(() => {
    const checkLikeStatus = async () => {
      if (user) {
        const liked = await checkIfUserLikedTweet(tweet.id);
        setIsLiked(liked);
      }
    };
    
    checkLikeStatus();
  }, [tweet.id, user]);
  
  // Format the date to a human-readable format
  const formattedDate = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'some time ago';
    }
  }, [tweet.created_at]);
  
  // Handle like/unlike
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tweet detail from opening
    
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to like tweets',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // The likeTweet function already handles both liking and unliking
      const success = await likeTweet(tweet.id);
      
      if (success) {
        if (isLiked) {
          // If it was already liked, we're unliking it now
          setLikeCount(prev => Math.max(0, prev - 1));
        } else {
          // If it wasn't liked, we're liking it now
          setLikeCount(prev => prev + 1);
        }
        
        setIsLiked(!isLiked);
        
        if (onAction) onAction();
      }
    } catch (error) {
      console.error('Like action failed:', error);
      toast({
        title: 'Action Failed',
        description: 'Could not process your like',
        variant: 'destructive',
      });
    }
  };
  
  // Handle delete tweet
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tweet detail from opening
    
    if (!user || user.id !== tweet.author_id) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await deleteTweet(tweet.id);
      toast({
        title: 'Tweet Deleted',
        description: 'Your tweet has been successfully deleted',
      });
      
      if (onDelete) {
        onDelete(tweet.id);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete your tweet',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tweet detail from opening
    if (tweet.author?.username) {
      navigate(`/profile/${tweet.author.username}`);
    }
  };
  
  // Format the count to display in a human-readable format
  const formatCount = (count: number): string => {
    if (count === 0) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };
  
  return (
    <div
      className="p-4 border-b border-gray-800 hover:bg-crypto-darkgray/20 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex">
        <div onClick={handleProfileClick} className="mr-3 cursor-pointer">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src={tweet.author?.avatar_url || ''} alt={tweet.author?.display_name || 'User'} />
            <AvatarFallback className="bg-crypto-gray text-gray-200">
              {tweet.author?.display_name?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div 
              className="flex items-center truncate pr-2"
              onClick={handleProfileClick}
            >
              <span className="font-bold text-white hover:underline mr-1">
                {tweet.author?.display_name || 'Unknown User'}
              </span>
              {tweet.author?.avatar_nft_id && (
                <span className="text-crypto-blue ml-1">✓</span>
              )}
              <span className="text-gray-500 mx-1">@{tweet.author?.username || 'user'}</span>
              <span className="text-gray-500 hidden sm:inline mx-1">·</span>
              <span className="text-gray-500 hidden sm:inline text-sm truncate">{formattedDate}</span>
            </div>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-crypto-blue p-1 rounded-full hover:bg-crypto-blue/10">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-crypto-darkgray border-crypto-gray">
                  {user.id === tweet.author_id && (
                    <DropdownMenuItem 
                      className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer" 
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="mt-1 mb-2 text-white whitespace-pre-wrap">{tweet.content}</div>
          
          {tweet.image_url && (
            <div className="mt-2 mb-3 rounded-xl overflow-hidden">
              <img 
                src={tweet.image_url} 
                alt="Tweet attachment" 
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}
          
          <div className="flex mt-3 text-gray-500 justify-between max-w-md">
            <button
              className={`flex items-center hover:text-crypto-blue ${isLiked ? 'text-crypto-pink' : ''}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-crypto-pink' : ''}`} />
              <span className="text-xs">{formatCount(likeCount)}</span>
            </button>
            
            <button className="flex items-center hover:text-crypto-blue">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{formatCount(tweet.replies_count || 0)}</span>
            </button>
            
            <button className="flex items-center hover:text-crypto-green">
              <Repeat className="h-4 w-4 mr-1" />
              <span className="text-xs">{formatCount(tweet.retweets_count || 0)}</span>
            </button>
            
            <button className="flex items-center hover:text-crypto-blue">
              <Share className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
