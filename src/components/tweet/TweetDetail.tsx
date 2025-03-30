
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, Repeat, Bookmark, Share2, Trash2, MoreHorizontal } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { checkIfUserLikedTweet, likeTweet, deleteTweet, checkIfUserRetweetedTweet, retweet } from '@/services/tweetService';
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
import { VerifiedBadge } from '@/components/ui/badge';

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
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [repliesCount, setRepliesCount] = useState(tweet?.replies_count || 0);
  const commentListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [showComments, setShowComments] = useState(true);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (tweet?.id && user) {
        const liked = await checkIfUserLikedTweet(tweet.id);
        setIsLiked(liked);
      }
    };

    const checkRetweetStatus = async () => {
      if (tweet?.id && user) {
        const retweeted = await checkIfUserRetweetedTweet(
          tweet.is_retweet && tweet.original_tweet_id 
            ? tweet.original_tweet_id 
            : tweet.id
        );
        setIsRetweeted(retweeted);
      }
    };

    const checkBookmarkStatus = async () => {
      if (tweet?.id && user) {
        const bookmarked = await checkIfTweetBookmarked(tweet.id);
        setIsBookmarked(bookmarked);
      }
    };

    checkLikeStatus();
    checkRetweetStatus();
    checkBookmarkStatus();
    setRepliesCount(tweet?.replies_count || 0);
  }, [tweet?.id, tweet?.original_tweet_id, tweet?.is_retweet, user, tweet?.replies_count]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to like this tweet.",
      });
      return;
    }

    const tweetIdToLike = tweet.is_retweet && tweet.original_tweet_id 
      ? tweet.original_tweet_id 
      : tweet.id;

    if (tweetIdToLike) {
      const success = await likeTweet(tweetIdToLike);
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

  const toggleRetweet = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to retweet this post.",
      });
      return;
    }

    const tweetIdToRetweet = tweet.is_retweet && tweet.original_tweet_id 
      ? tweet.original_tweet_id 
      : tweet.id;

    if (tweetIdToRetweet) {
      const success = await retweet(tweetIdToRetweet);
      if (success) {
        setIsRetweeted(!isRetweeted);
        onAction(); // Refresh the tweet feed
        toast({
          title: isRetweeted ? "Repost Removed" : "Reposted",
          description: isRetweeted ? "You removed your repost" : "You reposted this post",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to repost/unrepost.",
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
    setRepliesCount(prevCount => prevCount + 1);
    
    if (onCommentAdded && tweet) {
      onCommentAdded(tweet.id);
    }
    
    onAction();
  };

  const handleCommentCountUpdated = (count: number) => {
    setRepliesCount(count);
  };

  const handleCommentAction = () => {
    onAction();
  };

  const isNFTVerified = tweet?.author?.avatar_nft_id && tweet?.author?.avatar_nft_chain;

  // If this is a retweet, show retweet info
  if (tweet.is_retweet && tweet.original_tweet_id) {
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
          {/* Retweet indicator */}
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
            <Repeat className="h-4 w-4 mr-1" />
            <span>{tweet.author?.display_name} reposted</span>
          </div>
          
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
            <span>{tweet?.retweets_count || 0} {(tweet?.retweets_count || 0) === 1 ? 'Retweet' : 'Retweets'}</span>
            <span>{tweet?.likes_count || 0} {(tweet?.likes_count || 0) === 1 ? 'Like' : 'Likes'}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-gray-500">
            <button className="hover:text-crypto-blue focus:outline-none">
              <MessageSquare className="inline-block h-5 w-5 mr-1" />
            </button>
            <button onClick={toggleRetweet} className={`hover:text-crypto-green focus:outline-none ${isRetweeted ? 'text-crypto-green' : ''}`}>
              <Repeat className={`inline-block h-5 w-5 mr-1 ${isRetweeted ? 'fill-current' : ''}`} />
            </button>
            <button onClick={toggleLike} className={`hover:text-crypto-red focus:outline-none ${isLiked ? 'text-crypto-red' : ''}`}>
              <Heart className={`inline-block h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button onClick={toggleBookmark} className={`hover:text-crypto-purple focus:outline-none ${isBookmarked ? 'text-crypto-purple' : ''}`}>
              <Bookmark className={`inline-block h-5 w-5 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button className="hover:text-crypto-blue focus:outline-none">
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
  }

  // Regular tweet display
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
          <span>{tweet?.retweets_count || 0} {(tweet?.retweets_count || 0) === 1 ? 'Retweet' : 'Retweets'}</span>
          <span>{tweet?.likes_count || 0} {(tweet?.likes_count || 0) === 1 ? 'Like' : 'Likes'}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-gray-500">
          <button className="hover:text-crypto-blue focus:outline-none">
            <MessageSquare className="inline-block h-5 w-5 mr-1" />
          </button>
          <button onClick={toggleRetweet} className={`hover:text-crypto-green focus:outline-none ${isRetweeted ? 'text-crypto-green' : ''}`}>
            <Repeat className={`inline-block h-5 w-5 mr-1 ${isRetweeted ? 'fill-current' : ''}`} />
          </button>
          <button onClick={toggleLike} className={`hover:text-crypto-red focus:outline-none ${isLiked ? 'text-crypto-red' : ''}`}>
            <Heart className={`inline-block h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={toggleBookmark} className={`hover:text-crypto-purple focus:outline-none ${isBookmarked ? 'text-crypto-purple' : ''}`}>
            <Bookmark className={`inline-block h-5 w-5 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button className="hover:text-crypto-blue focus:outline-none">
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
