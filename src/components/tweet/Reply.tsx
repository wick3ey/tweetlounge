
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

const Reply = ({ reply }: ReplyProps) => {
  // Add defensive check for reply data
  if (!reply || !reply.profiles) {
    return null;
  }
  
  const timeAgo = formatDistanceToNow(new Date(reply.created_at), { addSuffix: true });
  const isNFTVerified = reply.profiles.avatar_nft_id && reply.profiles.avatar_nft_chain;
  const isMobile = useIsMobile();
  
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-2 sm:p-4 border-t border-gray-800 bg-crypto-darkgray">
      <div className="flex gap-2 sm:gap-3">
        <Link to={`/profile/${reply.profiles.username}`} className="flex-shrink-0">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
            {reply.profiles.avatar_url ? (
              <AvatarImage src={reply.profiles.avatar_url} alt={reply.profiles.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white text-xs sm:text-sm">
              {getInitials(reply.profiles.display_name || reply.profiles.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 break-words">
          <div className="flex flex-wrap items-center gap-x-1">
            <div className="flex items-center flex-wrap max-w-full">
              <Link 
                to={`/profile/${reply.profiles.username}`} 
                className="font-bold hover:underline text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none"
              >
                {reply.profiles.display_name || reply.profiles.username}
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
                @{reply.profiles.username}
              </span>
            </div>
            <span className="text-gray-500 mx-1 text-xs hidden sm:inline">·</span>
            <span className="text-gray-500 text-xs w-full sm:w-auto sm:inline-block">{timeAgo}</span>
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
        </div>
      </div>
    </div>
  );
};

export default Reply;
