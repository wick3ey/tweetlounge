
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share, Check } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { likeTweet, retweet, checkIfUserLikedTweet } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';

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
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user has liked this tweet
    const checkLikeStatus = async () => {
      if (!user) return;
      
      const hasLiked = await checkIfUserLikedTweet(tweet.id);
      setLiked(hasLiked);
    };
    
    checkLikeStatus();
  }, [tweet.id, user]);

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
        // Update local state - this is simplified, ideally we'd check current state
        setRetweetsCount(prevCount => prevCount + 1);
        
        toast({
          title: "Success",
          description: "Tweet has been retweeted!",
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

  return (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition">
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <Repeat className="h-4 w-4 mr-2" />
          <span>{tweet.author.display_name} retweeted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/profile/${tweet.author.username}`}>
          <Avatar className="h-12 w-12">
            {tweet.author.avatar_url ? (
              <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white">
              {getInitials(tweet.author.display_name || tweet.author.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center">
            <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline">
              {tweet.author.display_name}
            </Link>
            
            {/* Modern Twitter-style Verified Badge */}
            {isNFTVerified && (
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="inline-flex items-center ml-1">
                    <div className="bg-red-500 rounded-full p-0.5 flex items-center justify-center">
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
            
            <span className="text-gray-500 ml-2">
              @{tweet.author.username} · {timeAgo}
            </span>
          </div>
          <div className="mt-2 text-gray-900">{tweet.content}</div>
          {tweet.image_url && (
            <div className="mt-3">
              <img 
                src={tweet.image_url} 
                alt="Tweet media"
                className="rounded-xl max-h-80 w-auto" 
              />
            </div>
          )}
          <div className="flex justify-between mt-3 max-w-md">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReply} 
              className="text-gray-500 hover:text-twitter-blue"
              disabled={isSubmitting}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>{tweet.replies_count}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRetweet} 
              className="text-gray-500 hover:text-green-500"
              disabled={isSubmitting}
            >
              <Repeat className="h-4 w-4 mr-2" />
              <span>{retweetsCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike} 
              className={`${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
              disabled={isSubmitting}
            >
              <Heart className="h-4 w-4 mr-2" fill={liked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-twitter-blue"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
