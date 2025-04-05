
import React, { useState, useEffect } from 'react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Heart, MessageSquare, Repeat, Share2, Bookmark, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { likeTweet, retweet, checkIfUserLikedTweet, checkIfUserRetweetedTweet, deleteTweet } from '@/services/tweetService';
import { addBookmark, removeBookmark, checkIfUserBookmarkedTweet } from '@/services/bookmarkService';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { updateTweetCount } from '@/utils/tweetCacheService';
import { CryptoButton } from '@/components/ui/crypto-button';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
  onError?: (title: string, description: string) => void;
  showActions?: boolean;
}

const TweetCard: React.FC<TweetCardProps> = ({
  tweet,
  onClick,
  onAction,
  onDelete,
  onError,
  showActions = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count || 0);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count || 0);
  const [commentCount, setCommentCount] = useState(tweet.replies_count || 0);
  const [bookmarksCount, setBookmarksCount] = useState(tweet.bookmarks_count || 0);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isRetweetProcessing, setIsRetweetProcessing] = useState(false);
  const [isBookmarkProcessing, setIsBookmarkProcessing] = useState(false);

  useEffect(() => {
    const checkLike = async () => {
      const liked = await checkIfUserLikedTweet(tweet.id);
      setIsLiked(liked);
    };
    
    const checkRetweet = async () => {
      const retweeted = await checkIfUserRetweetedTweet(tweet.id);
      setIsRetweeted(retweeted);
    };
    
    const checkBookmark = async () => {
      const bookmarked = await checkIfUserBookmarkedTweet(tweet.id);
      setIsBookmarked(bookmarked);
    };
    
    checkLike();
    checkRetweet();
    checkBookmark();
  }, [tweet.id]);
  
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikeProcessing) return;
    
    try {
      setIsLikeProcessing(true);
      const success = await likeTweet(tweet.id, isLiked);
      
      if (success) {
        setIsLiked(!isLiked);
        setLikesCount(prev => (isLiked ? Math.max(0, prev - 1) : prev + 1));
        
        // Update the count cache
        updateTweetCount(tweet.id, { likes_count: isLiked ? Math.max(0, likesCount - 1) : likesCount + 1 });
        
        if (onAction) onAction();
      } else {
        toast({
          title: "Error",
          description: "Failed to update like. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLikeProcessing(false);
    }
  };
  
  const handleRetweetClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetweetProcessing) return;
    
    try {
      setIsRetweetProcessing(true);
      const success = await retweet(tweet.id, isRetweeted);
      
      if (success) {
        setIsRetweeted(!isRetweeted);
        setRetweetsCount(prev => (isRetweeted ? Math.max(0, prev - 1) : prev + 1));
        
        // Update the count cache
        updateTweetCount(tweet.id, { retweets_count: isRetweeted ? Math.max(0, retweetsCount - 1) : retweetsCount + 1 });
        
        if (onAction) onAction();
      } else {
        toast({
          title: "Error",
          description: "Failed to update retweet. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling retweet:', error);
      toast({
        title: "Error",
        description: "Failed to update retweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRetweetProcessing(false);
    }
  };

  // Subscribe to count updates
  useEffect(() => {
    const handleCommentCountUpdate = (payload: any) => {
      if (payload.payload && payload.payload.tweetId === tweet.id) {
        setCommentCount(payload.payload.count || payload.payload.commentCount || tweet.replies_count);
      }
    };

    // Set up the broadcast channel listener
    const broadcastChannel = supabase
      .channel('custom-count-channel')
      .on('broadcast', { event: 'comment-count-updated' }, handleCommentCountUpdate)
      .subscribe();

    // Initial state - ensure we have the most recent counts from cache
    try {
      const countCache = localStorage.getItem(`tweet-count-${tweet.id}`);
      if (countCache) {
        const countData = JSON.parse(countCache);
        setCommentCount(countData.replies_count || tweet.replies_count);
        setLikesCount(countData.likes_count || tweet.likes_count);
        setRetweetsCount(countData.retweets_count || tweet.retweets_count);
        setBookmarksCount(countData.bookmarks_count || tweet.bookmarks_count);
      } else {
        // Use the initial values from the tweet prop
        setCommentCount(tweet.replies_count);
        setLikesCount(tweet.likes_count);
        setRetweetsCount(tweet.retweets_count);
        setBookmarksCount(tweet.bookmarks_count || 0);
      }
    } catch (e) {
      console.error(`Error loading count cache for ${tweet.id}:`, e);
      // Fall back to prop values
      setCommentCount(tweet.replies_count);
      setLikesCount(tweet.likes_count);
      setRetweetsCount(tweet.retweets_count);
      setBookmarksCount(tweet.bookmarks_count || 0);
    }

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [tweet.id, tweet.replies_count, tweet.likes_count, tweet.retweets_count, tweet.bookmarks_count]);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarkProcessing) return;
    
    try {
      setIsBookmarkProcessing(true);
      
      if (isBookmarked) {
        // We'll implement this function in bookmarkService
        await removeBookmark(tweet.id);
        setIsBookmarked(false);
        setBookmarksCount(prev => Math.max(0, prev - 1));
        
        // Update the count cache
        updateTweetCount(tweet.id, { bookmarks_count: Math.max(0, bookmarksCount - 1) });
        
        toast({
          title: "Bookmark removed",
          description: "Tweet has been removed from your bookmarks",
        });
      } else {
        // We'll implement this function in bookmarkService
        await addBookmark(tweet.id);
        setIsBookmarked(true);
        setBookmarksCount(prev => prev + 1);
        
        // Update the count cache
        updateTweetCount(tweet.id, { bookmarks_count: bookmarksCount + 1 });
        
        toast({
          title: "Bookmark added",
          description: "Tweet has been added to your bookmarks",
        });
      }
      
      if (onAction) onAction();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBookmarkProcessing(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const confirmDelete = window.confirm("Are you sure you want to delete this tweet?");
      if (!confirmDelete) return;
      
      const success = await deleteTweet(tweet.id);
      
      if (success) {
        toast({
          title: "Tweet Deleted",
          description: "Your tweet has been successfully deleted."
        });
        
        if (onDelete) {
          onDelete(tweet.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete tweet. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting tweet:', error);
      toast({
        title: "Error",
        description: "Failed to delete tweet. Please try again.",
        variant: "destructive"
      });
      if (onError) {
        onError("Delete Error", "Failed to delete the tweet. Please try again.");
      }
    }
  };

  return (
    <div 
      className="tweet-card p-4 border-b border-gray-800 bg-black hover:bg-gray-900/30 transition-colors duration-150 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <Link to={`/profile/${tweet.author?.username}`}>
          <Avatar>
            {tweet.author?.avatar_url ? (
              <AvatarImage src={tweet.author?.avatar_url} alt={tweet.author?.display_name} />
            ) : (
              <AvatarFallback>{tweet.author?.display_name?.substring(0, 2)}</AvatarFallback>
            )}
          </Avatar>
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Link to={`/profile/${tweet.author?.username}`} className="font-medium hover:underline">
                {tweet.author?.display_name}
                {tweet.author?.username === 'kryptoe2x' && (
                  <CheckCircle className="inline-block h-4 w-4 text-crypto-blue ml-1" />
                )}
              </Link>{' '}
              <span className="text-gray-500">@{tweet.author?.username}</span> ·{' '}
              <span className="text-gray-500">{formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true })}</span>
            </div>
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <CryptoButton variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-900">
                    <MoreHorizontal className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </CryptoButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-black border border-gray-800">
                  {user?.id === tweet.author_id && (
                    <DropdownMenuItem onClick={handleDeleteClick} className="focus:bg-gray-900 text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="focus:bg-gray-900">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="mt-1">
            {tweet.content}
          </div>
          
          {tweet.image_url && (
            <div className="mt-2 rounded-md overflow-hidden border border-gray-800">
              <img src={tweet.image_url} alt="Tweet Image" className="w-full object-cover aspect-video" />
            </div>
          )}
          
          <div className="mt-3 flex justify-between text-gray-500">
            <CryptoButton variant="ghost" className="group flex items-center space-x-1.5 rounded-full h-9 px-3 hover:bg-gray-900">
              <MessageSquare className="h-4.5 w-4.5 group-hover:text-crypto-blue" />
              <span>{commentCount}</span>
            </CryptoButton>
            
            <CryptoButton 
              variant="ghost" 
              className="group flex items-center space-x-1.5 rounded-full h-9 px-3 hover:bg-gray-900"
              onClick={handleLikeClick}
              disabled={isLikeProcessing}
            >
              <Heart className={`h-4.5 w-4.5 ${isLiked ? 'text-red-500' : 'group-hover:text-red-500'}`} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likesCount}</span>
            </CryptoButton>
            
            <CryptoButton 
              variant="ghost" 
              className="group flex items-center space-x-1.5 rounded-full h-9 px-3 hover:bg-gray-900"
              onClick={handleRetweetClick}
              disabled={isRetweetProcessing}
            >
              <Repeat className={`h-4.5 w-4.5 ${isRetweeted ? 'text-crypto-green' : 'group-hover:text-crypto-green'}`} />
              <span>{retweetsCount}</span>
            </CryptoButton>
            
            <CryptoButton variant="ghost" className="group flex items-center space-x-1.5 rounded-full h-9 px-3 hover:bg-gray-900">
              <Share2 className="h-4.5 w-4.5 group-hover:text-crypto-blue" />
            </CryptoButton>
            
            <CryptoButton 
              variant="ghost" 
              className="group flex items-center space-x-1.5 rounded-full h-9 px-3 hover:bg-gray-900"
              onClick={handleBookmarkClick}
              disabled={isBookmarkProcessing}
            >
              <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? 'text-amber-500' : 'group-hover:text-amber-500'}`} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>{bookmarksCount}</span>
            </CryptoButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
