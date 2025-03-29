
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CryptoButton } from '@/components/ui/crypto-button';
import { Loader, Check, UserRound } from 'lucide-react';
import { followUser, unfollowUser } from '@/services/profileService';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface ProfileItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_following?: boolean;
}

interface FollowersListProps {
  profiles: ProfileItem[];
  isLoading: boolean;
  currentUserId?: string;
  onFollowChange?: () => void;
}

const FollowersList = ({ profiles, isLoading, currentUserId, onFollowChange }: FollowersListProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});

  // Initialize following status from the profiles data
  useEffect(() => {
    const initialStatus: Record<string, boolean> = {};
    profiles.forEach(profile => {
      initialStatus[profile.id] = !!profile.is_following;
    });
    setFollowingStatus(initialStatus);
  }, [profiles]);

  const handleFollowToggle = async (profileId: string, currentlyFollowing: boolean) => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    setLoadingStatus(prev => ({ ...prev, [profileId]: true }));

    try {
      if (currentlyFollowing) {
        const success = await unfollowUser(profileId);
        if (success) {
          setFollowingStatus(prev => ({ ...prev, [profileId]: false }));
          toast({
            title: "Unfollowed",
            description: "You are no longer following this user",
          });
        }
      } else {
        const success = await followUser(profileId);
        if (success) {
          setFollowingStatus(prev => ({ ...prev, [profileId]: true }));
          toast({
            title: "Following",
            description: "You are now following this user",
          });
        }
      }

      if (onFollowChange) {
        onFollowChange();
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast({
        title: "Action Failed",
        description: "Could not update follow status",
        variant: "destructive",
      });
    } finally {
      setLoadingStatus(prev => ({ ...prev, [profileId]: false }));
    }
  };

  const navigateToProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="py-6 text-center text-crypto-lightgray">
        <UserRound className="h-12 w-12 mx-auto mb-3 text-crypto-blue/50" />
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <ul className="divide-y divide-crypto-gray">
        {profiles.map((profile) => (
          <li key={profile.id} className="py-3 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigateToProfile(profile.username)}
            >
              <Avatar className="h-10 w-10 cursor-pointer">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                ) : null}
                <AvatarFallback className="bg-crypto-blue text-white">
                  {profile.display_name?.substring(0, 2).toUpperCase() || profile.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-crypto-text">{profile.display_name}</p>
                <p className="text-sm text-crypto-lightgray">@{profile.username}</p>
              </div>
            </div>
            
            {currentUserId && currentUserId !== profile.id && (
              <CryptoButton
                variant={followingStatus[profile.id] ? "outline" : "default"}
                size="sm"
                className={`rounded-full ${
                  followingStatus[profile.id] 
                    ? 'hover:bg-crypto-red/10 hover:text-crypto-red hover:border-crypto-red/20 border-crypto-gray text-crypto-text' 
                    : 'bg-crypto-blue hover:bg-crypto-darkblue text-white'
                }`}
                onClick={() => handleFollowToggle(profile.id, !!followingStatus[profile.id])}
                disabled={loadingStatus[profile.id]}
              >
                {loadingStatus[profile.id] ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : followingStatus[profile.id] ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Following
                  </>
                ) : (
                  'Follow'
                )}
              </CryptoButton>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FollowersList;
