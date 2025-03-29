
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share2, Check, MoreHorizontal, Bookmark } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { 
  likeTweet, 
  retweet, 
  checkIfUserLikedTweet, 
  checkIfUserRetweetedTweet
} from '@/services/tweetService';
import { bookmarkTweet, unbookmarkTweet, checkIfTweetBookmarked } from '@/services/bookmarkService';
import { useToast } from '@/components/ui/use-toast';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onClick?: () => void;
  onAction?: () => void;
}

const TweetCard = ({ tweet, onClick, onAction }: TweetCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [repliesCount, setRepliesCount] = useState(tweet.replies_count);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) return;
      
      const hasLiked = await checkIfUserLikedTweet(tweet.id);
      setLiked(hasLiked);
    };
    
    const checkRetweetStatus = async () => {
      if (!user) return;
      
      const hasRetweeted = await checkIfUserRetweetedTweet(tweet.id);
      setRetweeted(hasRetweeted);
    };
    
    const checkBookmarkStatus = async () => {
      if (!user) return;
      
      const hasBookmarked = await checkIfTweetBookmarked(tweet.id);
      setBookmarked(hasBookmarked);
    };
    
    checkLikeStatus();
    checkRetweetStatus();
    checkBookmarkStatus();
  }, [tweet.id, user]);

  const redirectToLogin = () => {
    toast({
      title: "Authentication Required",
      description: "You must be logged in to perform this action",
      variant: "destructive"
    });
    navigate('/login');
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      redirectToLogin();
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await likeTweet(tweet.id);
      
      if (success) {
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikesCount(prevCount => newLikedState ? prevCount + 1 : prevCount - 1);
        
        if (onAction) onAction();
      }
    } catch (error) {
      console.error("Error liking tweet:", error);
      toast({
        title: "Action Failed",
        description: "Failed to like the tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      redirectToLogin();
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await retweet(tweet.id);
      
      if (success) {
        const newRetweetedState = !retweeted;
        setRetweeted(newRetweetedState);
        setRetweetsCount(prevCount => newRetweetedState ? prevCount + 1 : prevCount - 1);
        
        toast({
          title: newRetweetedState ? "Retweeted" : "Removed Retweet",
          description: newRetweetedState ? "Tweet has been retweeted!" : "Retweet has been removed.",
        });
        
        if (onAction) onAction();
      }
    } catch (error) {
      console.error("Error retweeting:", error);
      toast({
        title: "Action Failed",
        description: "Failed to retweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      redirectToLogin();
      return;
    }
    
    try {
      setIsSubmitting(true);
      let success;
      
      if (bookmarked) {
        success = await unbookmarkTweet(tweet.id);
        if (success) {
          setBookmarked(false);
          toast({
            title: "Removed from Bookmarks",
            description: "Tweet has been removed from your bookmarks."
          });
        }
      } else {
        success = await bookmarkTweet(tweet.id);
        if (success) {
          setBookmarked(true);
          toast({
            title: "Bookmarked",
            description: "Tweet has been added to your bookmarks."
          });
        }
      }
      
      if (onAction) onAction();
    } catch (error) {
      console.error("Error bookmarking tweet:", error);
      toast({
        title: "Action Failed",
        description: "Failed to bookmark the tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      redirectToLogin();
      return;
    }
    if (onClick) onClick();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      redirectToLogin();
      return;
    }
    // Share functionality would go here
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });

  const isNFTVerified = tweet.author.avatar_nft_id && tweet.author.avatar_nft_chain;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div 
      className="p-4 border-b border-gray-800 hover:bg-gray-900 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-xs mb-2 ml-6">
          <Repeat className="h-3 w-3 mr-2" />
          <span>{tweet.author.display_name} retweeted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/profile/${tweet.author.username}`} onClick={(e) => e.stopPropagation()}>
          <Avatar className="h-10 w-10">
            {tweet.author.avatar_url ? (
              <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name} />
            ) : null}
            <AvatarFallback className="bg-crypto-blue/20 text-crypto-blue">
              {getInitials(tweet.author.display_name || tweet.author.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                to={`/profile/${tweet.author.username}`} 
                className="font-bold hover:underline text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.author.display_name}
              </Link>
              
              {isNFTVerified && (
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="inline-flex items-center ml-1">
                      <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-sm bg-black border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <p className="font-semibold">Verified NFT Owner</p>
                    <p className="text-gray-500 mt-1">
                      This user owns the NFT used as their profile picture.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
              
              <span className="text-gray-500 ml-1 text-sm">
                @{tweet.author.username}
              </span>
              <span className="text-gray-500 mx-1 text-xs">·</span>
              <span className="text-gray-500 text-xs">{timeAgo}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-crypto-blue h-8 w-8 p-0 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-1 text-sm text-gray-100">{tweet.content}</div>
          
          {tweet.image_url && (
            <div className="mt-3">
              <img 
                src={tweet.image_url} 
                alt="Tweet media"
                className="rounded-lg w-full max-h-96 object-cover border border-gray-800" 
              />
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <button 
              onClick={handleReply} 
              className="flex items-center hover:text-crypto-blue transition-colors"
              disabled={isSubmitting}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>{formatNumber(repliesCount)}</span>
            </button>
            
            <button 
              onClick={handleRetweet} 
              className={`flex items-center ${retweeted ? 'text-green-500' : 'hover:text-green-500'} transition-colors`}
              disabled={isSubmitting}
            >
              <Repeat className="h-4 w-4 mr-1" fill={retweeted ? "currentColor" : "none"} />
              <span>{formatNumber(retweetsCount)}</span>
            </button>
            
            <button 
              onClick={handleLike} 
              className={`flex items-center transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
              disabled={isSubmitting}
            >
              <Heart className="h-4 w-4 mr-1" fill={liked ? "currentColor" : "none"} />
              <span>{formatNumber(likesCount)}</span>
            </button>
            
            <button 
              onClick={handleBookmark}
              className={`flex items-center transition-colors ${bookmarked ? 'text-blue-500' : 'hover:text-blue-500'}`}
              disabled={isSubmitting}
            >
              <Bookmark className="h-4 w-4 mr-1" fill={bookmarked ? "currentColor" : "none"} />
            </button>
            
            <button 
              className="flex items-center hover:text-crypto-blue transition-colors"
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
