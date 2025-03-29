
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Heart, Repeat, Share2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import ReplyComposer from './ReplyComposer';
import { likeTweet } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  tweet_id: string;
  parent_reply_id: string | null;
  image_url?: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    avatar_nft_id?: string;
    avatar_nft_chain?: string;
  };
  children: Reply[];
}

interface RenderRepliesTreeProps {
  replies: Reply[];
  onReplySuccess: () => void;
  level?: number;
}

const ReplyItem = ({ 
  reply, 
  onReplySuccess, 
  level = 0 
}: { 
  reply: Reply; 
  onReplySuccess: () => void; 
  level: number; 
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [liked, setLiked] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const timeAgo = formatDistanceToNow(new Date(reply.created_at), { addSuffix: true });
  const isNFTVerified = reply.profiles.avatar_nft_id && reply.profiles.avatar_nft_chain;
  
  const handleReply = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to reply",
        variant: "destructive"
      });
      return;
    }
    setIsReplying(!isReplying);
  };
  
  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to like a reply",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Currently using tweet like system as a placeholder
      // In a real app, you'd implement a separate like system for replies
      await likeTweet(reply.id);
      setLiked(!liked);
      
      toast({
        title: liked ? "Unliked" : "Liked",
        description: liked ? "You unliked this reply" : "You liked this reply",
      });
    } catch (error) {
      console.error("Error liking reply:", error);
      toast({
        title: "Action Failed",
        description: "Failed to like the reply. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div className="reply-item">
      <div className={`relative ${level > 0 ? 'ml-6 pl-8 border-l border-gray-800' : ''}`}>
        <div className="p-3 sm:p-4 border-t border-gray-800">
          <div className="flex gap-3">
            <Link to={`/profile/${reply.profiles.username}`} className="flex-shrink-0">
              <Avatar className="h-8 w-8">
                {reply.profiles.avatar_url ? (
                  <AvatarImage src={reply.profiles.avatar_url} alt={reply.profiles.display_name || ''} />
                ) : null}
                <AvatarFallback className="bg-twitter-blue text-white">
                  {getInitials(reply.profiles.display_name || reply.profiles.username || '')}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                <Link 
                  to={`/profile/${reply.profiles.username}`} 
                  className="font-bold hover:underline text-sm truncate max-w-[120px] sm:max-w-none"
                >
                  {reply.profiles.display_name || reply.profiles.username || 'User'}
                </Link>
                
                {isNFTVerified && (
                  <HoverCard openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="inline-flex items-center">
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
                
                <span className="text-gray-500 text-sm truncate max-w-[80px] sm:max-w-none">
                  @{reply.profiles.username || 'unknown'}
                </span>
                <span className="text-gray-500 mx-1 text-xs">·</span>
                <span className="text-gray-500 text-xs">{timeAgo}</span>
              </div>
              
              <div className="mt-1 text-sm text-gray-100 break-words">{reply.content}</div>
              
              {reply.image_url && (
                <div className="mt-2 max-w-full">
                  <img 
                    src={reply.image_url} 
                    alt="Reply media"
                    className="rounded-xl max-h-60 object-contain w-auto border border-gray-800" 
                  />
                </div>
              )}
              
              <div className="flex mt-3 space-x-6 text-xs text-gray-500">
                <button 
                  onClick={handleReply} 
                  className="flex items-center hover:text-crypto-blue transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{reply.children?.length || 0}</span>
                </button>
                
                <button 
                  className="flex items-center hover:text-green-500 transition-colors"
                >
                  <Repeat className="h-4 w-4 mr-1" />
                  <span>0</span>
                </button>
                
                <button 
                  onClick={handleLike} 
                  className={`flex items-center transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
                >
                  <Heart className="h-4 w-4 mr-1" fill={liked ? "currentColor" : "none"} />
                  <span>0</span>
                </button>
                
                <button className="flex items-center hover:text-crypto-blue transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {isReplying && (
          <div className="ml-11 mb-3 mr-4">
            <ReplyComposer 
              tweetId={reply.tweet_id} 
              parentReplyId={reply.id}
              onReplySuccess={() => {
                setIsReplying(false);
                onReplySuccess();
              }}
              onCancel={() => setIsReplying(false)}
              placeholder="Reply to this comment..."
            />
          </div>
        )}
        
        {reply.children && reply.children.length > 0 && (
          <div>
            {reply.children.map((childReply) => (
              <ReplyItem 
                key={childReply.id} 
                reply={childReply} 
                onReplySuccess={onReplySuccess} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RenderRepliesTree = ({ replies, onReplySuccess, level = 0 }: RenderRepliesTreeProps) => {
  return (
    <div>
      {replies.map((reply) => (
        <ReplyItem 
          key={reply.id} 
          reply={reply} 
          onReplySuccess={onReplySuccess} 
          level={level} 
        />
      ))}
    </div>
  );
};

export default RenderRepliesTree;
