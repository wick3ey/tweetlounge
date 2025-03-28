
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share2, Check, MoreHorizontal, X } from 'lucide-react';
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
  getOriginalTweet 
} from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onLike?: () => void;
  onRetweet?: () => void;
  onReply?: () => void;
}

const TweetCard = ({ tweet, onLike, onRetweet, onReply }: TweetCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [originalTweet, setOriginalTweet] = useState<TweetWithAuthor | null>(null);

  useEffect(() => {
    // Check if user has liked this tweet
    const checkLikeStatus = async () => {
      if (!user) return;
      
      const hasLiked = await checkIfUserLikedTweet(tweet.id);
      setLiked(hasLiked);
    };
    
    // Check if user has retweeted this tweet
    const checkRetweetStatus = async () => {
      if (!user) return;
      
      const hasRetweeted = await checkIfUserRetweetedTweet(tweet.id);
      setRetweeted(hasRetweeted);
    };
    
    checkLikeStatus();
    checkRetweetStatus();
  }, [tweet.id, user]);

  useEffect(() => {
    // If this is a retweet, fetch the original tweet data
    const fetchOriginalTweet = async () => {
      if (tweet.is_retweet && tweet.original_tweet_id) {
        try {
          const originalTweetData = await getOriginalTweet(tweet.original_tweet_id);
          if (originalTweetData) {
            setOriginalTweet(originalTweetData);
          }
        } catch (error) {
          console.error("Error fetching original tweet:", error);
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
    
    // For now, just show a toast
    toast({
      title: "Coming Soon",
      description: "Reply functionality will be available soon!",
    });
    
    if (onReply) onReply();
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.created_at), { addSuffix: true });

  // Check if the author has a verified NFT profile picture
  const isNFTVerified = tweet.author.avatar_nft_id && tweet.author.avatar_nft_chain;

  // Format numbers for engagement metrics
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Determine the tweet content to display (original or retweet)
  const displayTweet = tweet.is_retweet && originalTweet ? originalTweet : tweet;
  const displayAuthor = displayTweet.author;
  const displayContent = displayTweet.content;
  const displayImage = displayTweet.image_url;

  return (
    <div className="p-4 border-b border-gray-800 hover:bg-gray-900/30 transition-colors">
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-xs mb-2 ml-6">
          <Repeat className="h-3 w-3 mr-2" />
          <span>{tweet.author.display_name} retweeted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/profile/${displayAuthor.username}`}>
          <Avatar className="h-10 w-10">
            {displayAuthor.avatar_url ? (
              <AvatarImage src={displayAuthor.avatar_url} alt={displayAuthor.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white">
              {getInitials(displayAuthor.display_name || displayAuthor.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to={`/profile/${displayAuthor.username}`} className="font-bold hover:underline text-sm">
                {displayAuthor.display_name}
              </Link>
              
              {/* Verified Badge */}
              {isNFTVerified && (
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="inline-flex items-center ml-1">
                      <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white stroke-[3]" />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-sm">
                    <p className="font-semibold">Verified NFT Owner</p>
                    <p className="text-gray-500 mt-1">
                      This user owns the NFT used as their profile picture.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
              
              <span className="text-gray-500 ml-1 text-sm">
                @{displayAuthor.username}
              </span>
              <span className="text-gray-500 mx-1 text-xs">·</span>
              <span className="text-gray-500 text-xs">{timeAgo}</span>
            </div>
            
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-crypto-blue h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-1 text-sm text-gray-100">{displayContent}</div>
          
          {displayImage && (
            <div className="mt-3">
              <img 
                src={displayImage} 
                alt="Tweet media"
                className="rounded-xl w-full max-h-96 object-contain border border-gray-800 cursor-pointer" 
                onClick={() => setShowImageDialog(true)}
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
              <span>{formatNumber(tweet.replies_count)}</span>
            </button>
            
            <button 
              onClick={handleRetweet} 
              className={`flex items-center transition-colors ${retweeted ? 'text-green-500' : 'hover:text-green-500'}`}
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
            
            <button className="flex items-center hover:text-crypto-blue transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image dialog for enlarged view */}
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
    </div>
  );
};

export default TweetCard;
