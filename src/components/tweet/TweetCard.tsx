import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { likeTweet, deleteTweet, checkIfUserLikedTweet } from '@/services/tweetService';
import { bookmarkTweet, unbookmarkTweet, checkIfTweetBookmarked, getBookmarkCount } from '@/services/bookmarkService';
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
import { subscribeToCommentCountUpdates } from '@/services/commentCountService';
import { useToast } from '@/components/ui/use-toast';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
  onError?: (title: string, description: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ 
  tweet, 
  onClick, 
  onAction,
  onDelete,
  onError
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count || 0);
  const [repliesCount, setRepliesCount] = useState(tweet.replies_count || 0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  
  const isOwnTweet = user && tweet.author_id === user.id;
  const displayTweet = tweet;
  const isNftVerified = displayTweet.author?.avatar_nft_id && displayTweet.author?.avatar_nft_chain;
  
  useEffect(() => {
    setLikesCount(tweet.likes_count || 0);
    
    if (user) {
      checkInitialStatuses();
    }
    
    const unsubscribeComments = subscribeToCommentCountUpdates(
      tweet.id,
      (count) => {
        console.log(`[TweetCard] Received comment count update for tweet ${tweet.id}: ${count}`);
        setRepliesCount(count);
      }
    );
    
    // Get the initial bookmark count
    fetchBookmarkCount();
    
    return () => {
      unsubscribeComments();
    };
  }, [tweet.id, user]);
  
  const checkInitialStatuses = async () => {
    try {
      const liked = await checkIfUserLikedTweet(tweet.id);
      setIsLiked(liked);
      
      const bookmarked = await checkIfTweetBookmarked(tweet.id);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error('Error checking tweet statuses:', error);
    }
  };
  
  const fetchBookmarkCount = async () => {
    try {
      const count = await getBookmarkCount(tweet.id);
      setBookmarksCount(count);
    } catch (error) {
      console.error('Error fetching bookmark count:', error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (onError) onError("Authentication Required", "You must be logged in to like tweets");
      else toast({
        title: "Authentication Required",
        description: "You must be logged in to like tweets",
        variant: "destructive"
      });
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
      else toast({
        title: "Error",
        description: "Failed to like tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsActionInProgress(false);
    }
  };
  
  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (onError) onError("Authentication Required", "You must be logged in to bookmark tweets");
      else toast({
        title: "Authentication Required", 
        description: "You must be logged in to bookmark tweets",
        variant: "destructive"
      });
      return;
    }
    
    if (isBookmarking) return;
    
    try {
      setIsBookmarking(true);
      
      let success;
      if (isBookmarked) {
        success = await unbookmarkTweet(tweet.id);
        if (success) {
          setIsBookmarked(false);
          setBookmarksCount(prev => Math.max(0, prev - 1));
          toast({
            title: "Bookmark Removed",
            description: "Post removed from your bookmarks"
          });
        }
      } else {
        success = await bookmarkTweet(tweet.id);
        if (success) {
          setIsBookmarked(true);
          setBookmarksCount(prev => prev + 1);
          toast({
            title: "Bookmarked",
            description: "Post saved to your bookmarks"
          });
        }
      }
      
      if (success && onAction) {
        onAction();
      }
    } catch (error) {
      console.error('Error bookmarking tweet:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBookmarking(false);
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
      else toast({
        title: "Error",
        description: "Failed to delete tweet. Please try again.",
        variant: "destructive"
      });
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

  const displayName = displayTweet.author?.display_name || 'User';
  const username = displayTweet.author?.username || 'user';
  const avatarUrl = displayTweet.author?.avatar_url;
  
  return (
    <Card 
      className="border-b border-gray-800 bg-black hover:bg-black/80 transition-colors p-4 cursor-pointer"
      onClick={onClick}
    >
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
                {formatTimeAgo(tweet.created_at)}
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
                      toast({
                        title: "Link Copied",
                        description: "Tweet link copied to clipboard"
                      });
                    }}
                  >
                    <Link to={`/tweet/${tweet.id}`} className="h-4 w-4 mr-2" onClick={e => e.stopPropagation()} />
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
              <span>{repliesCount}</span>
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
              className={`flex items-center hover:text-crypto-purple hover:bg-crypto-purple/10 p-2 h-8 ${isBookmarked ? 'text-crypto-purple' : ''}`}
              onClick={handleBookmark}
              disabled={isBookmarking}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarksCount}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TweetCard;
