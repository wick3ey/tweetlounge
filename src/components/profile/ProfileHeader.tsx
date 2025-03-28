
import { useState } from 'react';
import { CalendarDays, LinkIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistance } from 'date-fns';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
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

  return (
    <div className="border-b border-gray-200 pb-4">
      {/* Cover photo */}
      <div 
        className="h-48 bg-twitter-extraExtraLight relative"
        style={coverUrl ? {
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        {/* Profile picture */}
        <div className="absolute -bottom-16 left-4">
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
            className="rounded-full font-semibold" 
            onClick={onEditProfile}
          >
            Edit profile
          </Button>
        ) : (
          <Button 
            variant={following ? "outline" : "default"}
            className={`rounded-full font-semibold ${following ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' : ''}`}
            onClick={handleFollowClick}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-4 mt-10">
        <h1 className="text-xl font-bold">{displayName}</h1>
        <h2 className="text-gray-500">@{username}</h2>
        
        {bio && <p className="mt-3 text-gray-900">{bio}</p>}
        
        <div className="flex items-center text-gray-500 mt-3 text-sm gap-4">
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>{joinedString}</span>
          </div>
        </div>
        
        <div className="flex gap-5 mt-3">
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
