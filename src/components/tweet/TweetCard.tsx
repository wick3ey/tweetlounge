import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share2, Check, MoreHorizontal, X, Trash2 } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { 
  likeTweet, 
  retweet, 
  checkIfUserLikedTweet, 
  checkIfUserRetweetedTweet,
  getOriginalTweet,
  deleteTweet
} from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RepliesSection from './RepliesSection';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onLike?: () => void;
  onRetweet?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  hideActions?: boolean;
  expandedView?: boolean;
}

const TweetCard = ({ 
  tweet, 
  onLike, 
  onRetweet, 
  onReply, 
  onDelete,
  hideActions = false,
  expandedView = false
}: TweetCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [repliesCount, setRepliesCount] = useState(tweet.replies_count);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [originalTweet, setOriginalTweet] = useState<TweetWithAuthor | null>(null);
  const [isLoadingOriginalTweet, setIsLoadingOriginalTweet] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showFullScreenReplies, setShowFullScreenReplies] = useState(false);
  
  const isAuthor = user && tweet.author_id === user.id;

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
    
    checkLikeStatus();
    checkRetweetStatus();
  }, [tweet.id, user]);

  useEffect(() => {
    const fetchOriginalTweet = async () => {
      if (tweet.is_retweet && tweet.original_tweet_id) {
        try {
          setIsLoadingOriginalTweet(true);
          const originalTweetData = await getOriginalTweet(tweet.original_tweet_id);
          if (originalTweetData) {
            setOriginalTweet(originalTweetData);
          }
        } catch (error) {
          console.error("Error fetching original tweet:", error);
        } finally {
          setIsLoadingOriginalTweet(false);
        }
      }
    };
    
    fetchOriginalTweet();
  }, [tweet.is_retweet, tweet.original_tweet_id]);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to like a tweet",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await likeTweet(tweet.id);
      
      if (success) {
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikesCount(prevCount => newLikedState ? prevCount + 1 : prevCount - 1);
        
        toast({
          title: newLikedState ? "Liked" : "Unliked",
          description: newLikedState ? "You liked this tweet" : "You unliked this tweet",
        });
        
        if (onLike) onLike();
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

  const handleRetweet = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to retweet",
        variant: "destructive"
      });
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
          title: newRetweetedState ? "Retweeted" : "Undid Retweet",
          description: newRetweetedState 
            ? "You retweeted this tweet" 
            : "You removed your retweet",
        });
        
        if (onRetweet) onRetweet();
        
        if (newRetweetedState) {
          window.location.reload();
        }
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

  const handleReply = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    
    if (expandedView) {
      setShowReplies(!showReplies);
    } else {
      setShowFullScreenReplies(true);
    }
    
    if (onReply) onReply();
  };

  const handleDelete = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to delete a tweet",
        variant: "destructive"
      });
      return;
    }
    
    if (!isAuthor) {
      toast({
        title: "Permission Denied",
        description: "You can only delete your own tweets",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await deleteTweet(tweet.id);
      
      if (success) {
        toast({
          title: "Tweet Deleted",
          description: "Your tweet has been successfully deleted",
        });
        
        if (onDelete) onDelete();
        
        window.location.reload();
      } else {
        throw new Error("Failed to delete tweet");
      }
    } catch (error) {
      console.error("Error deleting tweet:", error);
      toast({
        title: "Action Failed",
        description: "Failed to delete the tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const handleTweetClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).tagName === 'A' ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a')
    ) {
      return;
    }
    
    if (!expandedView) {
      setShowFullScreenReplies(true);
    }
  };

  const handleCloseFullScreenReplies = () => {
    setShowFullScreenReplies(false);
  };

  const displayContent = tweet.is_retweet && originalTweet ? originalTweet.content : tweet.content;
  const displayImage = tweet.is_retweet && originalTweet ? originalTweet.image_url : tweet.image_url;

  const isRetweet = tweet.is_retweet;
  const retweeter = tweet.author;
  const originalAuthor = isRetweet && originalTweet ? originalTweet.author : tweet.author;

  if (isRetweet && isLoadingOriginalTweet) {
    return (
      <div className="p-4 border-b border-gray-800 animate-pulse">
        <div className="flex items-center text-gray-500 text-xs mb-2 ml-6">
          <Repeat className="h-3 w-3 mr-2" />
          <span>{retweeter.display_name} retweeted</span>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-700"></div>
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-700 rounded mb-2"></div>
            <div className="h-3 w-full bg-gray-700 rounded mb-3"></div>
            <div className="h-3 w-full bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-800 bg-crypto-darkgray hover:bg-gray-900/30 transition-colors">
      <div className="p-4" onClick={handleTweetClick}>
        {isRetweet && !expandedView && (
          <div className="flex items-center text-gray-500 text-xs mb-2 ml-6">
            <Repeat className="h-3 w-3 mr-2" />
            <span>{retweeter.display_name} retweeted</span>
          </div>
        )}
        <div className="flex gap-3">
          <Link to={`/profile/${originalAuthor.username}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-10 w-10">
              {originalAuthor.avatar_url ? (
                <AvatarImage src={originalAuthor.avatar_url} alt={originalAuthor.display_name} />
              ) : null}
              <AvatarFallback className="bg-twitter-blue text-white">
                {getInitials(originalAuthor.display_name || originalAuthor.username)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link 
                  to={`/profile/${originalAuthor.username}`} 
                  className="font-bold hover:underline text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {originalAuthor.display_name}
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
                    <HoverCardContent className="w-64 text-sm z-50">
                      <p className="font-semibold">Verified NFT Owner</p>
                      <p className="text-gray-500 mt-1">
                        This user owns the NFT used as their profile picture.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                )}
                
                <span className="text-gray-500 ml-1 text-sm">
                  @{originalAuthor.username}
                </span>
                <span className="text-gray-500 mx-1 text-xs">·</span>
                <span className="text-gray-500 text-xs">{timeAgo}</span>
              </div>
              
              {!hideActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-crypto-blue h-8 w-8 p-0 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-gray-900 border border-gray-800 text-white">
                    {isAuthor ? (
                      <DropdownMenuItem 
                        className="flex items-center text-red-500 hover:text-red-400 cursor-pointer"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem>
                          Follow @{originalAuthor.username}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Block @{originalAuthor.username}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Report post
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {expandedView && !hideActions && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full border-crypto-blue text-crypto-blue hover:bg-crypto-blue/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast({
                      title: "Subscribed",
                      description: `You are now subscribed to ${originalAuthor.display_name}'s posts.`
                    });
                  }}
                >
                  Subscribe
                </Button>
              )}
            </div>
            
            <div className="mt-1 text-sm text-gray-100">{displayContent}</div>
            
            {displayImage && (
              <div className="mt-3">
                <img 
                  src={displayImage} 
                  alt="Tweet media"
                  className="rounded-xl w-full max-h-96 object-contain border border-gray-800 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageDialog(true);
                  }}
                />
              </div>
            )}
            
            {!hideActions && (
              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReply();
                  }}
                  className={`flex items-center transition-colors ${showReplies ? 'text-crypto-blue' : 'hover:text-crypto-blue'}`}
                  disabled={isSubmitting}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{formatNumber(tweet.replies_count)}</span>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetweet();
                  }}
                  className={`flex items-center transition-colors ${retweeted ? 'text-green-500' : 'hover:text-green-500'}`}
                  disabled={isSubmitting}
                >
                  <Repeat className="h-4 w-4 mr-1" fill={retweeted ? "currentColor" : "none"} />
                  <span>{formatNumber(retweetsCount)}</span>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className={`flex items-center transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
                  disabled={isSubmitting}
                >
                  <Heart className="h-4 w-4 mr-1" fill={liked ? "currentColor" : "none"} />
                  <span>{formatNumber(likesCount)}</span>
                </button>
                
                <button 
                  className="flex items-center hover:text-crypto-blue transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expandedView && showReplies && (
        <RepliesSection tweetId={tweet.id} isOpen={showReplies} />
      )}

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="bg-crypto-darkgray border-crypto-gray p-0 max-w-4xl max-h-[90vh] flex items-center justify-center overflow-hidden">
          <Button 
            className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
            variant="ghost"
            onClick={() => setShowImageDialog(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center p-2">
            <img 
              src={displayImage}
              alt="Tweet media"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {showFullScreenReplies && (
        <RepliesSection 
          tweetId={tweet.id} 
          isOpen={showFullScreenReplies} 
          onClose={handleCloseFullScreenReplies}
          showFullScreen={true}
        />
      )}
    </div>
  );
};

export default TweetCard;
