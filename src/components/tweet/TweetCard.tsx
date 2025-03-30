
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, Repeat, Bookmark, Share2, Trash2, MoreHorizontal } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { checkIfUserLikedTweet, likeTweet, deleteTweet, checkIfUserRetweetedTweet, retweet } from '@/services/tweetService';
import { checkIfTweetBookmarked, bookmarkTweet, unbookmarkTweet } from '@/services/bookmarkService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/badge';
import { getOriginalTweet } from '@/services/tweetService';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onClick, onAction, onDelete }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [originalTweet, setOriginalTweet] = useState<TweetWithAuthor | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    const checkStatuses = async () => {
      if (tweet?.id && user) {
        const liked = await checkIfUserLikedTweet(tweet.id);
        setIsLiked(liked);
        
        const retweeted = await checkIfUserRetweetedTweet(tweet.id);
        setIsRetweeted(retweeted);
        
        const bookmarked = await checkIfTweetBookmarked(tweet.id);
        setIsBookmarked(bookmarked);
      }
    };
    
    checkStatuses();
  }, [tweet?.id, user]);

  useEffect(() => {
    const fetchOriginalTweet = async () => {
      if (tweet.is_retweet && tweet.original_tweet_id) {
        const fetchedOriginalTweet = await getOriginalTweet(tweet.original_tweet_id);
        setOriginalTweet(fetchedOriginalTweet);
      }
    };

    fetchOriginalTweet();
  }, [tweet.is_retweet, tweet.original_tweet_id]);

  const handleTweetClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    navigate(`/tweet/${tweet.id}`);
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to like tweets.",
      });
      return;
    }

    const success = await likeTweet(tweet.id);
    if (success) {
      setIsLiked(!isLiked);
      if (onAction) onAction();
    }
  };

  const toggleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to retweet posts.",
      });
      return;
    }

    const success = await retweet(tweet.id);
    if (success) {
      setIsRetweeted(!isRetweeted);
      if (onAction) onAction();
      
      toast({
        title: isRetweeted ? "Repost removed" : "Reposted",
        description: isRetweeted ? "You removed your repost" : "You reposted this post",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to repost/unrepost the tweet.",
        variant: "destructive"
      });
    }
  };

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to bookmark tweets.",
      });
      return;
    }

    let success;
    if (isBookmarked) {
      success = await unbookmarkTweet(tweet.id);
    } else {
      success = await bookmarkTweet(tweet.id);
    }

    if (success) {
      setIsBookmarked(!isBookmarked);
      if (onAction) onAction();
    }
  };

  const handleDeleteTweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tweet?.id) {
      const success = await deleteTweet(tweet.id);
      if (success && onDelete) {
        onDelete(tweet.id);
      }
    }
  };

  const formattedDate = formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });
  
  const isNFTVerified = tweet.author?.avatar_nft_id && tweet.author?.avatar_nft_chain;

  const isRetweet = tweet.is_retweet && tweet.original_tweet_id;
  const isCurrentUserRetweet = user?.id === tweet.author_id && isRetweet;

  // Don't render the main tweet content if this is a retweet and we have the original tweet
  // Only render the header with repost indication and the original tweet
  const showOnlyOriginalContent = isRetweet && originalTweet;

  return (
    <div 
      className="p-4 border-b border-gray-800 hover:bg-gray-900/20 transition-colors cursor-pointer"
      onClick={handleTweetClick}
    >
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <Repeat className="h-4 w-4 mr-2" />
          {user?.id === tweet.author_id ? (
            <span>You reposted</span>
          ) : (
            <span>{tweet.author?.display_name} reposted</span>
          )}
        </div>
      )}
      
      {isRetweet && originalTweet && (
        <div className="border border-gray-800 rounded-lg p-3 mb-3">
          <div className="flex space-x-3 mb-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={originalTweet.author.avatar_url} alt={originalTweet.author.username} />
              <AvatarFallback>{originalTweet.author.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-white flex items-center">
                  {originalTweet.author.display_name}
                </span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-gray-500">@{originalTweet.author.username}</span>
              </div>
            </div>
          </div>
          
          <p className="text-white">{originalTweet.content}</p>
          
          {originalTweet.image_url && (
            <div className="mt-3">
              <img 
                src={originalTweet.image_url} 
                alt="Original tweet image" 
                className="rounded-md max-h-80 object-cover"
              />
            </div>
          )}
        </div>
      )}
      
      {!showOnlyOriginalContent && (
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={tweet.author?.avatar_url} alt={tweet.author?.username} />
              <AvatarFallback>{tweet.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-white flex items-center">
                    {tweet.author?.display_name}
                    {isNFTVerified && <VerifiedBadge className="ml-1" />}
                  </span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className="text-gray-500">@{tweet.author?.username}</span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className="text-gray-500">{formattedDate}</span>
                </div>
              </div>
              
              {user?.id === tweet.author_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
            
            <p className="mt-1 text-white">{tweet.content}</p>
            
            {tweet.image_url && (
              <div className="mt-3">
                <img 
                  src={tweet.image_url} 
                  alt="Tweet image" 
                  className="rounded-md max-h-80 object-cover"
                />
              </div>
            )}
            
            <div className="mt-3 flex justify-between text-gray-500">
              <button 
                className="flex items-center space-x-1 hover:text-crypto-blue"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{tweet.replies_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 ${isRetweeted ? 'text-crypto-green' : ''} hover:text-crypto-green`}
                onClick={toggleRetweet}
              >
                <Repeat className={`h-4 w-4 ${isRetweeted ? 'fill-current' : ''}`} />
                <span>{tweet.retweets_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 ${isLiked ? 'text-crypto-red' : ''} hover:text-crypto-red`}
                onClick={toggleLike}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{tweet.likes_count || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 ${isBookmarked ? 'text-crypto-purple' : ''} hover:text-crypto-purple`}
                onClick={toggleBookmark}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button 
                className="flex items-center space-x-1 hover:text-crypto-blue"
                onClick={(e) => e.stopPropagation()}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TweetCard;
