
import React, { useState } from 'react';
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
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    const checkStatuses = async () => {
      if (tweet?.id && user) {
        const liked = await checkIfUserLikedTweet(tweet.id);
        setIsLiked(liked);
        
        // If this is a retweet, we need to check if the user liked the original tweet
        const idToCheck = tweet.is_retweet && tweet.original_tweet_id ? tweet.original_tweet_id : tweet.id;
        
        const retweeted = await checkIfUserRetweetedTweet(idToCheck);
        setIsRetweeted(retweeted);
        
        const bookmarked = await checkIfTweetBookmarked(idToCheck);
        setIsBookmarked(bookmarked);
      }
    };
    
    checkStatuses();
  }, [tweet?.id, tweet?.original_tweet_id, tweet?.is_retweet, user]);

  const handleTweetClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Navigate to the original tweet if this is a retweet
    const targetTweetId = tweet.is_retweet && tweet.original_tweet_id ? tweet.original_tweet_id : tweet.id;
    navigate(`/tweet/${targetTweetId}`);
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

    // Like the original tweet if this is a retweet
    const targetTweetId = tweet.is_retweet && tweet.original_tweet_id ? tweet.original_tweet_id : tweet.id;
    const success = await likeTweet(targetTweetId);
    
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
        description: "You must be logged in to repost posts.",
      });
      return;
    }

    // Retweet the original tweet if this is already a retweet
    const targetTweetId = tweet.is_retweet && tweet.original_tweet_id ? tweet.original_tweet_id : tweet.id;
    const success = await retweet(targetTweetId);
    
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

    // Bookmark the original tweet if this is a retweet
    const targetTweetId = tweet.is_retweet && tweet.original_tweet_id ? tweet.original_tweet_id : tweet.id;
    let success;
    
    if (isBookmarked) {
      success = await unbookmarkTweet(targetTweetId);
    } else {
      success = await bookmarkTweet(targetTweetId);
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

  // Determine which content and author to display
  // If it's a retweet, we show the original tweet's content and author
  const displayContent = tweet.content;
  const displayImageUrl = tweet.image_url;
  
  // Determine the correct author to display (original author for retweets)
  const displayAuthor = tweet.author || {
    id: tweet.author_id,
    username: tweet.profile_username || 'unknown',
    display_name: tweet.profile_display_name || 'Unknown User',
    avatar_url: tweet.profile_avatar_url || '',
    avatar_nft_id: tweet.profile_avatar_nft_id,
    avatar_nft_chain: tweet.profile_avatar_nft_chain
  };
  
  // Who retweeted this (if it's a retweet)
  const retweetedBy = tweet.is_retweet ? displayAuthor : null;
  
  // For retweets, the displayed author should be the original author
  const originalAuthor = tweet.original_author || displayAuthor;
  
  // For logging/debugging
  if (tweet.is_retweet) {
    console.log('Retweet data:', {
      isRetweet: tweet.is_retweet,
      originalTweetId: tweet.original_tweet_id,
      displayAuthor,
      originalAuthor: tweet.original_author,
      retweetedBy
    });
  }

  const formattedDate = formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });
  
  return (
    <div 
      className="p-4 border-b border-gray-800 hover:bg-gray-900/20 transition-colors cursor-pointer"
      onClick={handleTweetClick}
    >
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-sm mb-3">
          <Repeat className="h-4 w-4 mr-2" />
          <span>{tweet.author?.display_name || 'Someone'} reposted</span>
        </div>
      )}
      
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={tweet.is_retweet && tweet.original_author 
                ? tweet.original_author.avatar_url 
                : displayAuthor?.avatar_url} 
              alt={(tweet.is_retweet && tweet.original_author 
                ? tweet.original_author.username 
                : displayAuthor?.username) || ''} 
            />
            <AvatarFallback>
              {(tweet.is_retweet && tweet.original_author 
                ? tweet.original_author.username?.charAt(0).toUpperCase() 
                : displayAuthor?.username?.charAt(0).toUpperCase()) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-white flex items-center">
                  {tweet.is_retweet && tweet.original_author 
                    ? tweet.original_author.display_name 
                    : displayAuthor?.display_name}
                  {((tweet.is_retweet && tweet.original_author?.avatar_nft_id && tweet.original_author?.avatar_nft_chain) ||
                    (!tweet.is_retweet && displayAuthor?.avatar_nft_id && displayAuthor?.avatar_nft_chain)) && (
                    <VerifiedBadge className="ml-1" />
                  )}
                </span>
                <span className="text-gray-500">
                  @{tweet.is_retweet && tweet.original_author 
                    ? tweet.original_author.username 
                    : displayAuthor?.username}
                </span>
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
          
          <p className="mt-1 text-white">{displayContent}</p>
          
          {displayImageUrl && (
            <div className="mt-3">
              <img 
                src={displayImageUrl} 
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
    </div>
  );
};

export default TweetCard;
