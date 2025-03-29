
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat, Share2, Check, MoreHorizontal, Loader2 } from 'lucide-react';
import { TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { 
  likeTweet, 
  retweet, 
  replyToTweet,
  checkIfUserLikedTweet, 
  checkIfUserRetweetedTweet,
  getTweetComments
} from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';

interface TweetCardProps {
  tweet: TweetWithAuthor;
  onLike?: () => void;
  onRetweet?: () => void;
  onReply?: () => void;
  onAction?: () => void;
}

const TweetCard = ({ tweet, onLike, onRetweet, onReply, onAction }: TweetCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [repliesCount, setRepliesCount] = useState(tweet.replies_count);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comment functionality
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');

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
  
  // Load comments when comments section is opened
  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);
  
  const fetchComments = async () => {
    if (!showComments) return;
    
    setLoadingComments(true);
    try {
      const commentsData = await getTweetComments(tweet.id);
      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingComments(false);
    }
  };

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
          title: newRetweetedState ? "Retweeted" : "Removed Retweet",
          description: newRetweetedState ? "Tweet has been retweeted!" : "Retweet has been removed.",
        });
        
        if (onRetweet) onRetweet();
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

  const handleReply = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    
    setShowComments(true);
    
    if (onReply) onReply();
  };
  
  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await replyToTweet(tweet.id, commentText);
      
      if (success) {
        setCommentText('');
        setRepliesCount(prev => prev + 1);
        
        toast({
          title: "Comment Added",
          description: "Your reply has been posted successfully!",
        });
        
        // Refresh the comments
        await fetchComments();
        
        if (onAction) onAction();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Action Failed",
        description: "Failed to post your reply. Please try again.",
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

  return (
    <div className="p-4 border-b border-gray-800 hover:bg-gray-900/30 transition-colors">
      {tweet.is_retweet && (
        <div className="flex items-center text-gray-500 text-xs mb-2 ml-6">
          <Repeat className="h-3 w-3 mr-2" />
          <span>{tweet.author.display_name} retweeted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/profile/${tweet.author.username}`}>
          <Avatar className="h-10 w-10">
            {tweet.author.avatar_url ? (
              <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white">
              {getInitials(tweet.author.display_name || tweet.author.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline text-sm">
                {tweet.author.display_name}
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
                @{tweet.author.username}
              </span>
              <span className="text-gray-500 mx-1 text-xs">·</span>
              <span className="text-gray-500 text-xs">{timeAgo}</span>
            </div>
            
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-crypto-blue h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-1 text-sm text-gray-100">{tweet.content}</div>
          
          {tweet.image_url && (
            <div className="mt-3">
              <img 
                src={tweet.image_url} 
                alt="Tweet media"
                className="rounded-xl w-full max-h-96 object-cover border border-gray-800" 
              />
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <button 
              onClick={handleReply} 
              className={`flex items-center hover:text-crypto-blue transition-colors ${showComments ? 'text-crypto-blue' : ''}`}
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
            
            <button className="flex items-center hover:text-crypto-blue transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              {user && (
                <div className="flex mb-4">
                  <Avatar className="h-8 w-8 mr-3">
                    {user.user_metadata?.avatar_url ? (
                      <AvatarImage src={user.user_metadata.avatar_url} />
                    ) : null}
                    <AvatarFallback className="bg-gray-700">
                      {user.email ? user.email.substring(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write your reply..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <Button 
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || isSubmitting}
                        className="bg-crypto-blue hover:bg-crypto-blue/80"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-crypto-blue" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex pt-4 pb-2 border-t border-gray-800">
                      <Link to={`/profile/${comment.author.username}`}>
                        <Avatar className="h-8 w-8 mr-3">
                          {comment.author.avatar_url ? (
                            <AvatarImage src={comment.author.avatar_url} />
                          ) : null}
                          <AvatarFallback className="bg-gray-700">
                            {getInitials(comment.author.display_name || comment.author.username)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Link to={`/profile/${comment.author.username}`} className="font-bold text-sm hover:underline">
                            {comment.author.display_name}
                          </Link>
                          
                          {comment.author.avatar_nft_id && comment.author.avatar_nft_chain && (
                            <div className="inline-flex items-center ml-1">
                              <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                                <Check className="h-2 w-2 text-white stroke-[3]" />
                              </div>
                            </div>
                          )}
                          
                          <span className="text-gray-500 ml-1 text-xs">
                            @{comment.author.username}
                          </span>
                          <span className="text-gray-500 mx-1 text-xs">·</span>
                          <span className="text-gray-500 text-xs">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-white text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No comments yet. Be the first to reply!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
