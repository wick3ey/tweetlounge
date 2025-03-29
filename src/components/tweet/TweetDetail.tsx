import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { TweetWithAuthor } from '@/types/Tweet';
import { Comment } from '@/types/Comment';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Heart, MessageCircle, Repeat, Share2, ArrowLeft, X, Check, Trash2 } from 'lucide-react';
import { 
  likeTweet, 
  retweet, 
  replyToTweet,
  checkIfUserLikedTweet, 
  checkIfUserRetweetedTweet,
  getTweetComments,
  deleteTweet
} from '@/services/tweetService';
import { Link, useNavigate } from 'react-router-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TweetDetailProps {
  tweet: TweetWithAuthor;
  onClose: () => void;
  onAction?: () => void;
  onDelete?: (tweetId: string) => void;
}

const TweetDetail = ({ tweet, onClose, onAction, onDelete }: TweetDetailProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [repliesCount, setRepliesCount] = useState(tweet.replies_count);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const isOwner = user && user.id === tweet.author_id;
  
  useEffect(() => {
    const checkInteractionStatus = async () => {
      if (!user) return;
      
      const hasLiked = await checkIfUserLikedTweet(tweet.id);
      const hasRetweeted = await checkIfUserRetweetedTweet(tweet.id);
      
      setLiked(hasLiked);
      setRetweeted(hasRetweeted);
    };
    
    const fetchComments = async () => {
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
    
    checkInteractionStatus();
    fetchComments();
  }, [tweet.id, user, toast]);

  const redirectToLogin = () => {
    toast({
      title: "Authentication Required",
      description: "You must be logged in to perform this action",
      variant: "destructive"
    });
    navigate('/login');
  };

  const handleLike = async () => {
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

  const handleRetweet = async () => {
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

  const handleReply = () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };
  
  const handleSubmitComment = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    
    if (!commentText.trim()) {
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
        
        const commentsData = await getTweetComments(tweet.id);
        setComments(commentsData);
        
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

  const handleDelete = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await deleteTweet(tweet.id);
      
      if (success) {
        setDeleteDialogOpen(false);
        onClose();
        
        if (onDelete) {
          onDelete(tweet.id);
        }
      } else {
        toast({
          title: "Action Failed",
          description: "Failed to delete the tweet. Please try again.",
          variant: "destructive"
        });
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
      setDeleteDialogOpen(false);
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

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-4 border-b border-gray-800 bg-crypto-black/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">Tweet</h2>
        </div>
        
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-crypto-blue h-8 w-8 p-0 rounded-full"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 bg-gray-900 border-gray-800">
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-400 cursor-pointer"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="flex gap-3">
          <Link to={`/profile/${tweet.author.username}`}>
            <Avatar className="h-12 w-12">
              {tweet.author.avatar_url ? (
                <AvatarImage src={tweet.author.avatar_url} alt={tweet.author.display_name} />
              ) : null}
              <AvatarFallback className="bg-crypto-blue text-white">
                {getInitials(tweet.author.display_name || tweet.author.username)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div>
              <Link to={`/profile/${tweet.author.username}`} className="font-bold hover:underline">
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
                  <HoverCardContent className="w-64 text-sm">
                    <p className="font-semibold">Verified NFT Owner</p>
                    <p className="text-gray-500 mt-1">
                      This user owns the NFT used as their profile picture.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
              
              <div className="text-gray-500 text-sm">
                @{tweet.author.username}
              </div>
            </div>
            
            <div className="mt-3 text-xl text-gray-100">{tweet.content}</div>
            
            {tweet.image_url && (
              <div className="mt-4">
                <img 
                  src={tweet.image_url} 
                  alt="Tweet media"
                  className="rounded-xl w-full max-h-96 object-cover border border-gray-800" 
                />
              </div>
            )}
            
            <div className="mt-4 text-gray-500 text-sm border-b border-gray-800/50 pb-4">
              {timeAgo}
            </div>
            
            <div className="flex gap-4 py-3 border-b border-gray-800/50">
              <div className="flex items-center text-sm">
                <span className="font-semibold text-white">{formatNumber(retweetsCount)}</span>
                <span className="ml-1 text-gray-500">Retweets</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-semibold text-white">{formatNumber(likesCount)}</span>
                <span className="ml-1 text-gray-500">Likes</span>
              </div>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-800/50">
              <Button 
                onClick={handleReply} 
                variant="ghost" 
                size="icon"
                className="text-gray-500 hover:text-crypto-blue hover:bg-crypto-blue/10 rounded-full"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              
              <Button 
                onClick={handleRetweet} 
                variant="ghost" 
                size="icon"
                className={`hover:bg-green-500/10 rounded-full ${retweeted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}
                disabled={isSubmitting}
              >
                <Repeat className="h-5 w-5" fill={retweeted ? "currentColor" : "none"} />
              </Button>
              
              <Button 
                onClick={handleLike} 
                variant="ghost" 
                size="icon"
                className={`hover:bg-red-500/10 rounded-full ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                disabled={isSubmitting}
              >
                <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-500 hover:text-crypto-blue hover:bg-crypto-blue/10 rounded-full"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-gray-700">
                {profile?.display_name ? profile.display_name.substring(0, 2).toUpperCase() : 
                 (profile?.username ? profile.username.substring(0, 2).toUpperCase() : "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                ref={commentInputRef}
                placeholder="Post your reply"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-transparent border border-gray-800 focus:border-crypto-blue/50 text-white resize-none min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  className="bg-crypto-blue hover:bg-crypto-blue/90 text-white rounded-full px-4"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loadingComments ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
          </div>
        ) : comments.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-gray-900/30">
                <div className="flex gap-3">
                  <Link to={`/profile/${comment.author.username}`}>
                    <Avatar className="h-10 w-10">
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
                      <Link to={`/profile/${comment.author.username}`} className="font-bold hover:underline text-sm">
                        {comment.author.display_name}
                      </Link>
                      
                      {comment.author.avatar_nft_id && comment.author.avatar_nft_chain && (
                        <div className="inline-flex items-center ml-1">
                          <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                            <Check className="h-2 w-2 text-white stroke-[3]" />
                          </div>
                        </div>
                      )}
                      
                      <span className="text-gray-500 ml-1 text-sm">
                        @{comment.author.username}
                      </span>
                      <span className="text-gray-500 mx-1 text-xs">·</span>
                      <span className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-white">{comment.content}</p>
                    
                    <div className="flex mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-crypto-blue hover:bg-transparent p-0 mr-4"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">Reply</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-500 hover:bg-transparent p-0"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        <span className="text-xs">{comment.likes_count || '0'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No replies yet</p>
            <p className="text-sm mt-1">Be the first to reply!</p>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tweet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tweet? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-transparent border-gray-700 text-white hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TweetDetail;
