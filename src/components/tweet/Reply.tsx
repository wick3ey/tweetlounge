
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, Heart, Repeat, Share2, MoreHorizontal } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { likeTweet, checkIfUserLikedTweet } from '@/services/tweetService';
import { useToast } from '@/components/ui/use-toast';

interface ReplyProps {
  reply: {
    id: string;
    content: string;
    created_at: string;
    image_url?: string;
    profiles: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
      avatar_nft_id?: string;
      avatar_nft_chain?: string;
    };
  };
  expanded?: boolean;
}

const Reply = ({ reply, expanded = false }: ReplyProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  
  if (!reply || !reply.profiles) {
    return null;
  }
  
  // Enhanced time formatting function with multiple fallback mechanisms
  const getTimeAgo = (dateString: string) => {
    // First validation: check if dateString exists and is a string
    if (!dateString || typeof dateString !== 'string') {
      console.warn("Missing or invalid date string type:", dateString);
      return "recently";
    }
    
    try {
      // Replace any invalid formats that might cause issues
      // Sometimes dates come in unexpected formats
      const cleanedDateString = dateString.trim();
      
      // Create date object and verify it's valid
      const date = new Date(cleanedDateString);
      
      // Thorough validation to catch any NaN dates
      if (isNaN(date.getTime()) || date.toString() === "Invalid Date") {
        console.warn("Invalid date object created from:", cleanedDateString);
        return "recently";
      }
      
      // Extra validation: check if date is unreasonably in the future or past
      const now = new Date();
      const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
      if (date > new Date(now.getTime() + oneYearInMs) || 
          date < new Date(now.getTime() - 10 * oneYearInMs)) {
        console.warn("Date out of reasonable range:", cleanedDateString);
        return "recently";
      }
      
      // If we pass all checks, format the date
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.warn("Error formatting date:", error, "for date string:", dateString);
      return "recently";
    }
  };
  
  // Safely get the time ago value
  const timeAgo = getTimeAgo(reply.created_at);
  const isNFTVerified = reply.profiles.avatar_nft_id && reply.profiles.avatar_nft_chain;
  const isMobile = useIsMobile();
  
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
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
      const success = await likeTweet(reply.id);
      
      if (success) {
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikesCount(prevCount => newLikedState ? prevCount + 1 : prevCount - 1);
        
        toast({
          title: newLikedState ? "Liked" : "Unliked",
          description: newLikedState ? "You liked this reply" : "You unliked this reply",
        });
      }
    } catch (error) {
      console.error("Error liking reply:", error);
      toast({
        title: "Action Failed",
        description: "Failed to like the reply. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className={`p-3 sm:p-4 border-t border-gray-800 bg-crypto-darkgray hover:bg-gray-900/30 transition-colors ${expanded ? 'pb-6' : ''}`}>
      <div className="flex gap-2 sm:gap-3">
        <Link to={`/profile/${reply.profiles.username}`} className="flex-shrink-0">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            {reply.profiles.avatar_url ? (
              <AvatarImage src={reply.profiles.avatar_url} alt={reply.profiles.display_name || reply.profiles.username || 'User'} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white text-xs sm:text-sm">
              {getInitials(reply.profiles.display_name || reply.profiles.username || 'User')}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 break-words">
          <div className="flex flex-wrap items-center gap-x-1 justify-between">
            <div className="flex items-center flex-wrap">
              <Link 
                to={`/profile/${reply.profiles.username}`} 
                className="font-bold hover:underline text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none"
              >
                {reply.profiles.display_name || reply.profiles.username || 'User'}
              </Link>
              
              {isNFTVerified && (
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="inline-flex items-center ml-1">
                      <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white stroke-[3]" />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-xs sm:text-sm z-50">
                    <p className="font-semibold">Verified NFT Owner</p>
                    <p className="text-gray-500 mt-1">
                      This user owns the NFT used as their profile picture.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
              
              <span className="text-gray-500 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none ml-1">
                @{reply.profiles.username || 'unknown'}
              </span>
              <span className="text-gray-500 mx-1 text-xs hidden sm:inline">·</span>
              <span className="text-gray-500 text-xs w-full sm:w-auto sm:inline-block">{timeAgo}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-white rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[140px] bg-gray-900 text-white border-gray-700">
                <DropdownMenuItem>
                  Follow @{reply.profiles.username}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Block @{reply.profiles.username}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Report post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-1 text-xs sm:text-sm text-gray-100 break-words">{reply.content}</div>
          
          {reply.image_url && (
            <div className="mt-2 max-w-full">
              <img 
                src={reply.image_url} 
                alt="Reply media"
                className="rounded-xl max-h-36 sm:max-h-60 object-contain w-auto" 
              />
            </div>
          )}
          
          {expanded && (
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <button className="flex items-center transition-colors hover:text-crypto-blue">
                <MessageCircle className="h-4 w-4 mr-1" />
                <span>Reply</span>
              </button>
              
              <button className="flex items-center transition-colors hover:text-green-500">
                <Repeat className="h-4 w-4 mr-1" />
                <span>Retweet</span>
              </button>
              
              <button 
                onClick={handleLike} 
                className={`flex items-center transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <Heart className="h-4 w-4 mr-1" fill={liked ? "currentColor" : "none"} />
                <span>{formatNumber(likesCount)}</span>
              </button>
              
              <button className="flex items-center hover:text-crypto-blue transition-colors">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reply;
