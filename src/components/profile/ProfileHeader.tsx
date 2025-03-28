
import { useState } from 'react';
import { CalendarDays, LinkIcon, MapPin, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistance } from 'date-fns';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  ethereumAddress?: string | null;
  solanaAddress?: string | null;
  isCurrentUser: boolean;
  followersCount: number;
  followingCount: number;
  joinedDate: string;
  onEditProfile?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
}

const ProfileHeader = ({
  username,
  displayName,
  avatarUrl,
  coverUrl,
  bio,
  location,
  website,
  ethereumAddress,
  solanaAddress,
  isCurrentUser,
  followersCount,
  followingCount,
  joinedDate,
  onEditProfile,
  onFollow,
  isFollowing = false
}: ProfileHeaderProps) => {
  const [following, setFollowing] = useState(isFollowing);
  
  const handleFollowClick = () => {
    setFollowing(!following);
    if (onFollow) onFollow();
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    } else if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'UN';
  };

  const joinedString = joinedDate 
    ? `Joined ${formatDistance(new Date(joinedDate), new Date(), { addSuffix: true })}`
    : 'Recently joined';

  // Function to get domain from URL
  const getDomainFromUrl = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };
  
  const hasWallet = !!ethereumAddress || !!solanaAddress;

  return (
    <div className="border-b border-gray-200 pb-0">
      {/* Cover photo with Twitter-style aspect ratio (3:1) */}
      <AspectRatio ratio={3/1} className="bg-twitter-extraExtraLight">
        {coverUrl && (
          <div className="h-full w-full overflow-hidden">
            <img 
              src={coverUrl} 
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!coverUrl && (
          <div className="h-full w-full bg-twitter-extraExtraLight" />
        )}
      </AspectRatio>
      
      {/* Profile picture */}
      <div className="relative px-4">
        <div className="absolute -top-16">
          <Avatar className="h-32 w-32 border-4 border-white">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-twitter-blue text-white text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      {/* Profile actions */}
      <div className="pt-2 px-4 flex justify-end">
        {isCurrentUser ? (
          <Button 
            variant="outline" 
            className="rounded-full font-semibold border-gray-300 hover:bg-gray-100" 
            onClick={onEditProfile}
          >
            Edit profile
          </Button>
        ) : (
          <Button 
            variant={following ? "outline" : "default"}
            className={`rounded-full font-semibold ${following ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-gray-300' : 'bg-black hover:bg-black/90'}`}
            onClick={handleFollowClick}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-4 mt-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{displayName}</h1>
          {hasWallet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Wallet className="h-4 w-4 text-blue-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Crypto wallet connected</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <h2 className="text-gray-500">@{username}</h2>
        
        {bio && <p className="mt-3 text-gray-900">{bio}</p>}
        
        <div className="flex flex-wrap items-center text-gray-500 mt-3 text-sm gap-4">
          {location && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{location}</span>
            </div>
          )}
          
          {website && (
            <div className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-1" />
              <a 
                href={website.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-twitter-blue hover:underline"
              >
                {getDomainFromUrl(website.startsWith('http') ? website : `https://${website}`)}
              </a>
            </div>
          )}
          
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>{joinedString}</span>
          </div>
        </div>
        
        <div className="flex gap-5 mt-3 mb-4">
          <a href="#" className="text-gray-900 hover:underline">
            <span className="font-bold">{followingCount}</span>{' '}
            <span className="text-gray-500">Following</span>
          </a>
          <a href="#" className="text-gray-900 hover:underline">
            <span className="font-bold">{followersCount}</span>{' '}
            <span className="text-gray-500">Followers</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
