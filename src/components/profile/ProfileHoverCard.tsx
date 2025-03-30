
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HoverCard,
  HoverCardTrigger,
  HoverCardContent 
} from '@/components/ui/hover-card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/badge';
import { UserPlus, MapPin, Link as LinkIcon, CheckCheck } from 'lucide-react';
import { followUser, unfollowUser, isFollowing } from '@/services/profileService';
import { toast } from '@/components/ui/use-toast';
import { Profile } from '@/lib/supabase';

interface ProfileHoverCardProps {
  profile: Partial<Profile>;
  children: React.ReactNode;
  direction?: 'left' | 'right';
  showBio?: boolean;
}

export const ProfileHoverCard: React.FC<ProfileHoverCardProps> = ({
  profile,
  children,
  direction = 'right',
  showBio = true,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUserFollowing, setIsUserFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Make sure we have the minimum required profile data
  const isProfileComplete = profile?.id && profile?.username && profile?.display_name;
  
  useEffect(() => {
    // Check follow status if we have valid IDs and not looking at our own profile
    const checkFollowStatus = async () => {
      if (user?.id && profile?.id && user.id !== profile.id) {
        try {
          const following = await isFollowing(profile.id);
          setIsUserFollowing(following);
        } catch (error) {
          console.error("Error checking follow status:", error);
        }
      }
    };
    
    if (isHovering) {
      checkFollowStatus();
    }
  }, [user?.id, profile?.id, isHovering]);
  
  const handleFollowAction = async () => {
    if (!user || !profile.id) return;
    
    setIsFollowLoading(true);
    try {
      if (isUserFollowing) {
        await unfollowUser(profile.id);
        setIsUserFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You have unfollowed ${profile.display_name}`,
        });
      } else {
        await followUser(profile.id);
        setIsUserFollowing(true);
        toast({
          title: "Following",
          description: `You are now following ${profile.display_name}`,
        });
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      });
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profile?.username) {
      navigate(`/profile/${profile.username}`);
    }
  };
  
  // If we don't have complete profile data, just render children without hover functionality
  if (!isProfileComplete) {
    return <>{children}</>;
  }
  
  return (
    <HoverCard openDelay={300} closeDelay={200} onOpenChange={setIsHovering}>
      <HoverCardTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </HoverCardTrigger>
      
      <HoverCardContent 
        className="w-80 p-0 bg-crypto-darkgray border-crypto-gray text-white"
        align={direction === 'right' ? 'start' : 'end'}
        side="bottom"
        sideOffset={5}
      >
        <div className="p-4 space-y-4">
          {/* Header with avatar and follow button */}
          <div className="flex justify-between items-start">
            <div onClick={handleProfileClick} className="cursor-pointer">
              <Avatar className="h-14 w-14 border-2 border-crypto-gray hover:border-crypto-blue transition-colors">
                <AvatarImage 
                  src={profile.avatar_url || ''} 
                  alt={profile.display_name}
                />
                <AvatarFallback className="bg-crypto-darkblue text-white text-lg">
                  {profile.display_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {user && user.id !== profile.id && (
              <Button
                variant={isUserFollowing ? "outline" : "default"}
                size="sm"
                className={`rounded-full ${isUserFollowing ? 'border-crypto-blue text-crypto-blue hover:bg-crypto-blue/10' : 'bg-crypto-blue hover:bg-crypto-darkblue'}`}
                onClick={handleFollowAction}
                disabled={isFollowLoading}
              >
                {isUserFollowing ? (
                  <>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* User info */}
          <div className="space-y-1">
            <div className="flex items-center">
              <h3 
                className="font-bold text-white hover:underline cursor-pointer" 
                onClick={handleProfileClick}
              >
                {profile.display_name}
                {profile.avatar_nft_id && profile.avatar_nft_chain && (
                  <VerifiedBadge className="ml-1 inline-block" />
                )}
              </h3>
            </div>
            <p className="text-gray-400">@{profile.username}</p>
          </div>
          
          {/* Bio section */}
          {showBio && profile.bio && (
            <p className="text-sm text-white/90">{profile.bio}</p>
          )}
          
          {/* Stats */}
          <div className="flex space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-white">{profile.following_count || 0}</span>
              <span className="text-gray-400">Following</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-white">{profile.followers_count || 0}</span>
              <span className="text-gray-400">Followers</span>
            </div>
          </div>
          
          {/* Location and website */}
          <div className="flex flex-col space-y-1">
            {profile.location && (
              <div className="flex items-center text-sm text-gray-400">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                <span>{profile.location}</span>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center text-sm">
                <LinkIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-crypto-blue hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default ProfileHoverCard;
