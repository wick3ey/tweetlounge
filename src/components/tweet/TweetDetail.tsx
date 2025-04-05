import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, Bookmark, Share2, Trash2, MoreHorizontal } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { checkIfUserLikedTweet, likeTweet, deleteTweet } from '@/services/tweetService';
import { checkIfTweetBookmarked, bookmarkTweet, unbookmarkTweet } from '@/services/bookmarkService';
import CommentList from '@/components/comment/CommentList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CommentForm from '../comment/CommentForm';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { subscribeToCommentCountUpdates, hasActiveCommentCountSubscription } from '@/services/commentCountService';

interface TweetDetailProps {
  tweet: TweetWithAuthor;
  onClose: () => void;
  onAction: () => void;
  onDelete?: (tweetId: string) => void;
  onCommentAdded?: (tweetId: string) => void;
}

const TweetDetail: React.FC<TweetDetailProps> = ({ 
  tweet, 
  onClose, 
  onAction, 
  onDelete, 
  onCommentAdded
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [repliesCount, setRepliesCount] = useState(tweet?.replies_count || 0);
  const [likesCount, setLikesCount] = useState(tweet?.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const commentListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setLikesCount(tweet?.likes_count || 0);
    
    const checkStatuses = async () => {
      if (tweet?.id && user) {
        try {
          const liked = await checkIfUserLikedTweet(tweet.id);
          if (mountedRef.current) setIsLiked(liked);

          const bookmarked = await checkIfTweetBookmarked(tweet.id);
          if (mountedRef.current) setIsBookmarked(bookmarked);
        } catch (error) {
          console.error('Error checking tweet statuses:', error);
        }
      }
    };
    
    checkStatuses();
  }, [tweet?.id, tweet?.likes_count, user]);

  const handleCommentCountUpdated = (count: number) => {
    if (mountedRef.current) {
      console.log(`[TweetDetail] Comment count updated from CommentList: ${count}`);
      setRepliesCount(count);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to like this tweet.",
      });
      return;
    }

    if (isLiking) return;
    
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    
    setIsLiking(true);

    try {
      const tweetIdToLike = tweet.id;

      if (tweetIdToLike) {
        const success = await likeTweet(tweetIdToLike);
        
        if (!success && mountedRef.current) {
          setIsLiked(!newLikedState);
          setLikesCount(prev => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
          
          toast({
            title: "Error",
            description: "Failed to like/unlike tweet.",
            variant: "destructive",
          });
        } else if (newLikedState) {
          toast({
            title: "Liked",
            description: "You liked this post",
          });
        }
        
        if (success) {
          setTimeout(() => {
            if (mountedRef.current && onAction) {
              onAction();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error liking tweet:', error);
      
      if (mountedRef.current) {
        setIsLiked(!newLikedState);
        setLikesCount(prev => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
        
        toast({
          title: "Error",
          description: "An unexpected error occurred during the like operation.",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLiking(false);
      }
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to bookmark this tweet.",
      });
      return;
    }

    if (isBookmarking) return;
    
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    setIsBookmarking(true);

    try {
      let success;
      if (newBookmarkedState) {
        success = await bookmarkTweet(tweet.id);
      } else {
        success = await unbookmarkTweet(tweet.id);
      }

      if (!success && mountedRef.current) {
        setIsBookmarked(!newBookmarkedState);
        toast({
          title: "Error",
          description: "Failed to bookmark/unbookmark tweet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: newBookmarkedState ? "Bookmarked" : "Bookmark Removed",
          description: newBookmarkedState ? "Post saved to your bookmarks" : "Post removed from your bookmarks",
        });
        
        setTimeout(() => {
          if (mountedRef.current && onAction) {
            onAction();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error during bookmark operation:', error);
      
      if (mountedRef.current) {
        setIsBookmarked(!newBookmarkedState);
        toast({
          title: "Error",
          description: "An unexpected error occurred during the bookmark operation.",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsBookmarking(false);
      }
    }
  };

  const handleDeleteTweet = async () => {
    if (tweet?.id) {
      const success = await deleteTweet(tweet.id);
      if (success) {
        if (onDelete) onDelete(tweet.id);
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete tweet.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCommentSubmit = () => {
    if (onCommentAdded && tweet) {
      onCommentAdded(tweet.id);
    }
    
    if (onAction) {
      onAction();
    }
  };

  const handleCommentAction = () => {
    if (onAction) {
      onAction();
    }
  };

  const isNFTVerified = tweet?.author?.avatar_nft_id && tweet?.author?.avatar_nft_chain;

  return (
    <div className="bg-black text-white rounded-lg shadow-md relative max-h-[90vh] flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-2 right-2 text-white hover:bg-gray-800 rounded-full z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span className="sr-only">Close</span>
      </Button>

      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={tweet?.author?.avatar_url} alt={tweet?.author?.username} />
            <AvatarFallback>{tweet?.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className="font-medium flex items-center">
                {tweet?.author?.display_name}
                {isNFTVerified && <VerifiedBadge className="ml-1" />}
              </div>
              <div className="text-gray-500">@{tweet?.author?.username}</div>
              <div className="text-gray-500">• {formatDistanceToNow(new Date(tweet?.created_at), { addSuffix: true })}</div>
            </div>
            <div className="mt-2 text-base">{tweet?.content}</div>
            {tweet?.image_url && (
              <img src={tweet?.image_url} alt="Tweet Image" className="mt-2 rounded-md max-h-96 w-full object-cover" />
            )}
          </div>
          {user?.id === tweet?.author_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-800">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black border-gray-800">
                <DropdownMenuItem onClick={handleDeleteTweet} className="hover:bg-gray-800 text-white">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex mt-4 text-sm text-gray-500 space-x-6">
          <span>{repliesCount} {repliesCount === 1 ? 'Comment' : 'Comments'}</span>
          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-gray-500">
          <button className="hover:text-crypto-blue focus:outline-none transition-colors duration-100">
            <MessageSquare className="inline-block h-5 w-5 mr-1" />
          </button>
          <button 
            onClick={toggleLike} 
            className={`hover:text-crypto-red focus:outline-none ${isLiked ? 'text-crypto-red' : ''} transition-colors duration-100`}
            disabled={isLiking}
          >
            <Heart className={`inline-block h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={toggleBookmark} 
            className={`hover:text-crypto-purple focus:outline-none ${isBookmarked ? 'text-crypto-purple' : ''} transition-colors duration-100`}
            disabled={isBookmarking}
          >
            <Bookmark className={`inline-block h-5 w-5 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button className="hover:text-crypto-blue focus:outline-none transition-colors duration-100">
            <Share2 className="inline-block h-5 w-5 mr-1" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800">
        <CommentForm tweetId={tweet?.id} onSubmit={handleCommentSubmit} />
      </div>

      <div className="overflow-y-auto flex-grow" ref={commentListRef}>
        <div className="p-4">
          <CommentList 
            tweetId={tweet?.id} 
            onCommentCountUpdated={handleCommentCountUpdated}
            onAction={handleCommentAction}
          />
        </div>
      </div>
    </div>
  );
};

export default TweetDetail;
