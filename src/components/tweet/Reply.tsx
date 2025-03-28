
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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
  const timeAgo = formatDistanceToNow(new Date(reply.created_at), { addSuffix: true });
  const isNFTVerified = reply.profiles.avatar_nft_id && reply.profiles.avatar_nft_chain;
  
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 border-t border-gray-800">
      <div className="flex gap-3">
        <Link to={`/profile/${reply.profiles.username}`}>
          <Avatar className="h-8 w-8">
            {reply.profiles.avatar_url ? (
              <AvatarImage src={reply.profiles.avatar_url} alt={reply.profiles.display_name} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white">
              {getInitials(reply.profiles.display_name || reply.profiles.username)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <div className="flex items-center">
            <Link to={`/profile/${reply.profiles.username}`} className="font-bold hover:underline text-sm">
              {reply.profiles.display_name}
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
            
            <span className="text-gray-500 ml-1 text-sm">
              @{reply.profiles.username}
            </span>
            <span className="text-gray-500 mx-1 text-xs">·</span>
            <span className="text-gray-500 text-xs">{timeAgo}</span>
          </div>
          
          <div className="mt-1 text-sm text-gray-100">{reply.content}</div>
          
          {reply.image_url && (
            <div className="mt-2">
              <img 
                src={reply.image_url} 
                alt="Reply media"
                className="rounded-xl max-h-60 object-contain" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reply;
