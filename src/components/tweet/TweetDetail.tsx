
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, Repeat, Bookmark, Share2, Trash2, MoreHorizontal } from 'lucide-react';
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

interface TweetDetailProps {
  tweet: TweetWithAuthor;
  onClose: () => void;
  onAction: () => void;
  onDelete: (tweetId: string) => void;
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
  const commentListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Always show comments in tweet detail view
  const [showComments, setShowComments] = useState(true);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (tweet?.id) {
        const liked = await checkIfUserLikedTweet(tweet.id);
        setIsLiked(liked);
      }
    };

    const checkBookmarkStatus = async () => {
      if (tweet?.id) {
        const bookmarked = await checkIfTweetBookmarked(tweet.id);
        setIsBookmarked(bookmarked);
      }
    };

    checkLikeStatus();
    checkBookmarkStatus();
    setRepliesCount(tweet?.replies_count || 0);
  }, [tweet?.id, user?.id, tweet?.replies_count]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to like this tweet.",
      });
      return;
    }

    if (tweet?.id) {
      const success = await likeTweet(tweet.id);
      if (success) {
        setIsLiked(!isLiked);
        onAction(); // Refresh the tweet feed
      } else {
        toast({
          title: "Error",
          description: "Failed to like/unlike tweet.",
          variant: "destructive",
        });
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

    if (tweet?.id) {
      let success;
      if (isBookmarked) {
        success = await unbookmarkTweet(tweet.id);
      } else {
        success = await bookmarkTweet(tweet.id);
      }

      if (success) {
        setIsBookmarked(!isBookmarked);
      } else {
        toast({
          title: "Error",
          description: "Failed to bookmark/unbookmark tweet.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteTweet = async () => {
    if (tweet?.id) {
      const success = await deleteTweet(tweet.id);
      if (success) {
        onDelete(tweet.id);
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
    // Update the local replies count
    setRepliesCount(prevCount => prevCount + 1);
    
    // Notify parent components about the new comment
    if (onCommentAdded && tweet) {
      onCommentAdded(tweet.id);
    }
    
    // Also trigger the general refresh
    onAction();
  };

  // Handle comment count update from CommentList
  const handleCommentCountUpdated = (count: number) => {
    setRepliesCount(count);
  };

  // Handle any action in comments (like, etc)
  const handleCommentAction = () => {
    onAction(); // Refresh the tweet feed
  };

  return (
    <div className="bg-black text-white rounded-lg shadow-md relative max-h-[90vh] flex flex-col">
      {/* Close Button */}
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

      {/* Tweet Content */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={tweet?.author?.avatar_url} alt={tweet?.author?.username} />
            <AvatarFallback>{tweet?.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className="font-medium">{tweet?.author?.display_name}</div>
              <div className="text-gray-500">@{tweet?.author?.username}</div>
              <div className="text-gray-500">• {formatDistanceToNow(new Date(tweet?.created_at), { addSuffix: true })}</div>
            </div>
            <div className="mt-2 text-base">{tweet?.content}</div>
            {tweet?.image_url && (
              <img src={tweet?.image_url} alt="Tweet Image" className="mt-2 rounded-md max-h-96 w-full object-cover" />
            )}
          </div>
          {/* Dropdown Menu */}
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

        {/* Tweet Stats */}
        <div className="flex mt-4 text-sm text-gray-500 space-x-6">
          <span>{repliesCount} {repliesCount === 1 ? 'Comment' : 'Comments'}</span>
          <span>{tweet?.retweets_count || 0} {(tweet?.retweets_count || 0) === 1 ? 'Retweet' : 'Retweets'}</span>
          <span>{tweet?.likes_count || 0} {(tweet?.likes_count || 0) === 1 ? 'Like' : 'Likes'}</span>
        </div>

        {/* Tweet Actions */}
        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-gray-500">
          <button className="hover:text-crypto-blue focus:outline-none">
            <MessageSquare className="inline-block h-5 w-5 mr-1" />
          </button>
          <button onClick={toggleLike} className={`hover:text-crypto-red focus:outline-none ${isLiked ? 'text-crypto-red' : ''}`}>
            <Heart className={`inline-block h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button className="hover:text-crypto-green focus:outline-none">
            <Repeat className="inline-block h-5 w-5 mr-1" />
          </button>
          <button onClick={toggleBookmark} className={`hover:text-crypto-purple focus:outline-none ${isBookmarked ? 'text-crypto-purple' : ''}`}>
            <Bookmark className={`inline-block h-5 w-5 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button className="hover:text-crypto-blue focus:outline-none">
            <Share2 className="inline-block h-5 w-5 mr-1" />
          </button>
        </div>
      </div>

      {/* Comment Form */}
      <div className="p-4 border-b border-gray-800">
        <CommentForm tweetId={tweet?.id} onSubmit={handleCommentSubmit} />
      </div>

      {/* Comment List - now in a scrollable container */}
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
