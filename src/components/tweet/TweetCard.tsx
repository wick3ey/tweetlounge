
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, RefreshCcw, Share2, Bookmark, MoreHorizontal, Trash2, Check, AlertCircle } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { likeTweet, retweet, deleteTweet, checkIfUserLikedTweet, checkIfUserRetweetedTweet } from '@/services/tweetService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { VerifiedBadge } from '@/components/ui/verified-badge';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
  onRetweetRemoved?: (originalTweetId: string) => void;
  onError?: (title: string, description: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ 
  tweet, 
  onClick, 
  onAction,
  onDelete,
  onRetweetRemoved,
  onError
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count || 0);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count || 0);
  
  const isOwnTweet = user && tweet.author_id === user.id;
  const isRetweet = tweet.is_retweet && tweet.original_tweet_id;
  
  // User who retweeted
  const retweeter = isRetweet ? tweet.author : null;
  
  // For retweets, display the original tweet data
  let originalAuthor = null;
  if (isRetweet) {
    originalAuthor = tweet.original_author || 
      (tweet.original_tweet && tweet.original_tweet.author) || 
      null;
  }
  
  // Display either the original tweet (for retweets) or the current tweet
  const displayTweet = isRetweet ? {
    id: tweet.id,
    content: tweet.original_content || tweet.content,
    author_id: originalAuthor?.id || tweet.original_author_id || tweet.author_id,
    created_at: tweet.original_tweet?.created_at || tweet.created_at,
    likes_count: tweet.likes_count || 0,
    retweets_count: tweet.retweets_count || 0,
    replies_count: tweet.replies_count || 0,
    is_retweet: true,
    original_tweet_id: tweet.original_tweet_id,
    image_url: tweet.original_image_url || tweet.image_url,
    author: originalAuthor
  } : tweet;
  
  const isNftVerified = displayTweet.author?.avatar_nft_id && displayTweet.author?.avatar_nft_chain;
  
  useEffect(() => {
    if (user) {
      const checkLikeStatus = async () => {
        try {
          const liked = await checkIfUserLikedTweet(tweet.id);
          setIsLiked(liked);
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      };
      
      const checkRetweetStatus = async () => {
        try {
          const retweeted = isRetweet ? 
            tweet.author_id === user.id : 
            await checkIfUserRetweetedTweet(tweet.id);
          setIsRetweeted(retweeted);
        } catch (error) {
          console.error('Error checking retweet status:', error);
        }
      };
      
      checkLikeStatus();
      checkRetweetStatus();
    }
  }, [user, tweet.id, isRetweet, tweet.author_id]);
  
  useEffect(() => {
    setLikesCount(tweet.likes_count || 0);
    setRetweetsCount(tweet.retweets_count || 0);
  }, [tweet.likes_count, tweet.retweets_count]);
  
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (onError) onError("Authentication Required", "You must be logged in to like tweets");
      return;
    }
    
    if (isActionInProgress) return;
    
    try {
      setIsActionInProgress(true);
      
      const success = await likeTweet(tweet.id, isLiked);
      
      if (success) {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        
        if (onAction) onAction();
      }
    } catch (error) {
      console.error('Error liking tweet:', error);
      if (onError) onError("Error", "Failed to like tweet. Please try again.");
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  const handleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (onError) onError("Authentication Required", "You must be logged in to retweet");
      return;
    }
    
    if (isActionInProgress) return;
    
    if (isOwnTweet && !isRetweet) {
      if (onError) onError("Cannot Retweet", "You cannot retweet your own tweet");
      return;
    }
    
    try {
      setIsActionInProgress(true);
      
      const targetTweetId = isRetweet ? tweet.original_tweet_id! : tweet.id;
      const success = await retweet(targetTweetId, isRetweeted);
      
      if (success) {
        setIsRetweeted(!isRetweeted);
        setRetweetsCount(prev => isRetweeted ? prev - 1 : prev + 1);
        
        if (onAction) onAction();
        
        if (isRetweeted && onRetweetRemoved && isRetweet) {
          onRetweetRemoved(targetTweetId);
        }
      }
    } catch (error) {
      console.error('Error retweeting:', error);
      if (onError) onError("Error", "Failed to retweet. Please try again.");
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || !isOwnTweet) return;
    
    if (isActionInProgress) return;
    
    try {
      setIsActionInProgress(true);
      
      const success = await deleteTweet(tweet.id);
      
      if (success && onDelete) {
        onDelete(tweet.id);
      }
    } catch (error) {
      console.error('Error deleting tweet:', error);
      if (onError) onError("Error", "Failed to delete tweet. Please try again.");
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'recently';
    }
  };
  
  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || 'UN';
  };

  // Get display name and username for the tweet author
  const displayName = displayTweet.author?.display_name || 
    displayTweet.profile_display_name || 
    'User';
    
  const username = displayTweet.author?.username || 
    displayTweet.profile_username || 
    'user';
    
  const avatarUrl = displayTweet.author?.avatar_url || 
    displayTweet.profile_avatar_url || 
    null;
  
  // If we don't have valid author data, log it for debugging
  if (!displayTweet.author && !displayTweet.profile_username) {
    console.debug('Missing author data for tweet:', displayTweet.id, displayTweet);
  }
  
  return (
    <Card 
      className="border-b border-gray-800 bg-black hover:bg-black/80 transition-colors p-4 cursor-pointer"
      onClick={onClick}
    >
      {isRetweet && retweeter && (
        <div className="flex items-center text-gray-500 text-sm mb-2 ml-6">
          <RefreshCcw className="h-3 w-3 mr-2" />
          <span>
            Retweeted by <Link to={`/profile/${retweeter.username}`} className="text-crypto-blue hover:underline" onClick={e => e.stopPropagation()}>
              @{retweeter.username}
            </Link>
          </span>
        </div>
      )}
      
      <div className="flex gap-3">
        <div>
          <Link to={`/profile/${username}`} onClick={e => e.stopPropagation()}>
            <Avatar className="h-10 w-10">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to={`/profile/${username}`} className="font-bold hover:underline" onClick={e => e.stopPropagation()}>
                {displayName}
              </Link>
              
              {isNftVerified && (
                <VerifiedBadge className="ml-1" />
              )}
              
              <span className="text-gray-500 mx-1">·</span>
              
              <Link to={`/profile/${username}`} className="text-gray-500 hover:underline" onClick={e => e.stopPropagation()}>
                @{username}
              </Link>
              
              <span className="text-gray-500 mx-1">·</span>
              
              <span className="text-gray-500">
                {formatTimeAgo(displayTweet.created_at)}
              </span>
            </div>
            
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-crypto-gray/20 rounded-full">
                    <MoreHorizontal className="h-5 w-5 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="bg-crypto-darkgray border-crypto-gray text-white">
                  {isOwnTweet && (
                    <>
                      <DropdownMenuItem 
                        className="text-red-500 cursor-pointer flex items-center"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-crypto-gray" />
                    </>
                  )}
                  
                  <DropdownMenuItem 
                    className="cursor-pointer flex items-center"
                    onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(window.location.origin + `/tweet/${tweet.id}`);
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-2 mb-3 whitespace-pre-line break-words">
            {displayTweet.content}
          </div>
          
          {displayTweet.image_url && (
            <div className="mt-3 mb-3 rounded-xl overflow-hidden">
              <img 
                src={displayTweet.image_url} 
                alt="Tweet media" 
                className="max-h-80 w-auto rounded-xl" 
              />
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-gray-500">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center hover:text-crypto-blue hover:bg-crypto-blue/10 p-2 h-8"
              onClick={e => e.stopPropagation()}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>{tweet.replies_count || 0}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={`flex items-center p-2 h-8 ${isRetweeted ? 'text-green-500 hover:text-green-600 hover:bg-green-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}
              onClick={handleRetweet}
              disabled={isActionInProgress}
            >
              {isRetweeted ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              <span>{retweetsCount}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={`flex items-center p-2 h-8 ${isLiked ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`}
              onClick={handleLike}
              disabled={isActionInProgress}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center hover:text-crypto-blue hover:bg-crypto-blue/10 p-2 h-8"
              onClick={e => e.stopPropagation()}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TweetCard;
