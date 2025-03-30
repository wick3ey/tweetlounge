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
  // Add these debug logs to help track the issue
  console.log('Rendering tweet:', tweet.id);
  console.log('Is retweet:', tweet.is_retweet);
  console.log('Original tweet ID:', tweet.original_tweet_id);
  console.log('Original author:', tweet.original_author);
  
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false); // Add a state to track retweet action in progress
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    const checkStatuses = async () => {
      if (tweet?.id && user) {
        try {
          const liked = await checkIfUserLikedTweet(tweet.id);
          setIsLiked(liked);
          
          const retweeted = await checkIfUserRetweetedTweet(tweet.is_retweet && tweet.original_tweet_id 
            ? tweet.original_tweet_id 
            : tweet.id);
          setIsRetweeted(retweeted);
          
          const bookmarked = await checkIfTweetBookmarked(tweet.id);
          setIsBookmarked(bookmarked);
        } catch (error) {
          console.error('Error checking tweet statuses:', error);
        }
      }
    };
    
    checkStatuses();
  }, [tweet?.id, tweet?.original_tweet_id, tweet?.is_retweet, user]);

  const handleTweetClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (onClick) {
      onClick();
    } else if (tweet.is_retweet && tweet.original_tweet_id) {
      navigate(`/tweet/${tweet.original_tweet_id}`);
    } else {
      navigate(`/tweet/${tweet.id}`);
    }
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

    const tweetIdToLike = tweet.is_retweet && tweet.original_tweet_id 
      ? tweet.original_tweet_id 
      : tweet.id;

    const success = await likeTweet(tweetIdToLike);
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

    // Prevent multiple retweet clicks
    if (isRetweeting) {
      return;
    }

    try {
      setIsRetweeting(true);
      
      const tweetIdToRetweet = tweet.is_retweet && tweet.original_tweet_id 
        ? tweet.original_tweet_id 
        : tweet.id;

      const success = await retweet(tweetIdToRetweet);
      
      if (success) {
        setIsRetweeted(!isRetweeted);
        
        toast({
          title: isRetweeted ? "Repost removed" : "Reposted",
          description: isRetweeted ? "You removed your repost" : "You reposted this post",
        });
        
        // After a successful retweet, trigger a full refresh to get fresh data
        if (onAction) {
          setTimeout(() => {
            onAction();
          }, 500); // Small delay to ensure backend has updated
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to repost/unrepost the tweet.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during retweet operation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during the repost operation.",
        variant: "destructive"
      });
    } finally {
      setIsRetweeting(false);
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
  
  if (tweet.is_retweet) {
    // Check if original_author exists
    if (!tweet.original_author) {
      console.error('Retweet missing original_author data:', tweet);
      return (
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
            <Repeat className="h-4 w-4 mr-1" />
            <span>{tweet.author?.display_name} reposted</span>
          </div>
          <div className="text-white">Original content could not be loaded</div>
        </div>
      );
    }
    
    return (
      <div 
        className="p-4 border-b border-gray-800 hover:bg-gray-900/20 transition-colors cursor-pointer"
        onClick={handleTweetClick}
      >
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
          <Repeat className="h-4 w-4 mr-1" />
          <span>{tweet.author?.display_name} reposted</span>
        </div>

        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={tweet.original_author.avatar_url} 
                alt={tweet.original_author.username} 
              />
              <AvatarFallback>
                {tweet.original_author.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-white flex items-center">
                    {tweet.original_author.display_name}
                    {(tweet.original_author.avatar_nft_id && tweet.original_author.avatar_nft_chain) && (
                      <VerifiedBadge className="ml-1" />
                    )}
                  </span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className="text-gray-500">
                    @{tweet.original_author.username}
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
      </div>
    );
  }
  
  return (
    <div 
      className="p-4 border-b border-gray-800 hover:bg-gray-900/20 transition-colors cursor-pointer"
      onClick={handleTweetClick}
    >
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
                  {(tweet.author?.avatar_nft_id && tweet.author?.avatar_nft_chain) && <VerifiedBadge className="ml-1" />}
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
    </div>
  );
};

export default TweetCard;
