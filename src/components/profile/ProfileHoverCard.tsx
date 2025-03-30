
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, Link as LinkIcon, MapPin, VerifiedIcon, User2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getProfileByUsername, followUser, unfollowUser, isFollowing } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { VerifiedBadge } from '@/components/ui/badge';

interface ProfileHoverCardProps {
  username: string;
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
}

const ProfileHoverCard = ({ username, children, direction = 'right' }: ProfileHoverCardProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const fetchProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      const profileData = await getProfileByUsername(username);
      setProfile(profileData);
      setHasAttemptedFetch(true);
      
      if (user && profileData) {
        const followStatus = await isFollowing(profileData.id);
        setIsFollowingUser(followStatus);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setHasAttemptedFetch(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFollow = async () => {
    if (!profile || !user || isUpdatingFollow) return;
    
    setIsUpdatingFollow(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(profile.id);
        setIsFollowingUser(false);
        toast({
          title: "Unfollowed",
          description: `You are no longer following @${profile.username}`,
        });
      } else {
        await followUser(profile.id);
        setIsFollowingUser(true);
        toast({
          title: "Following",
          description: `You are now following @${profile.username}`,
        });
      }
      
      // Update the profile to get updated follower count
      fetchProfile();
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        title: "Error",
        description: "There was a problem updating your follow status",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingFollow(false);
    }
  };
  
  return (
    <HoverCard>
      <HoverCardTrigger asChild onMouseEnter={() => {
        if (!profile && !loading && !hasAttemptedFetch) {
          fetchProfile();
        }
      }}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 bg-crypto-darkgray border-crypto-gray text-crypto-text shadow-xl"
        align={direction === 'left' ? 'start' : direction === 'right' ? 'end' : undefined}
        side={direction === 'top' ? 'top' : direction === 'bottom' ? 'bottom' : undefined}
      >
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin h-5 w-5 border-2 border-crypto-blue border-t-transparent rounded-full"></div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <Link to={`/profile/${profile.username}`}>
                <Avatar className="h-12 w-12 border-2 border-crypto-gray/50">
                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                  <AvatarFallback className="bg-crypto-blue text-white">
                    {profile.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              {user && user.id !== profile.id && (
                <Button 
                  variant={isFollowingUser ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={isUpdatingFollow}
                  className={isFollowingUser 
                    ? "border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text" 
                    : "bg-crypto-blue hover:bg-crypto-darkblue"
                  }
                >
                  {isFollowingUser ? "Following" : "Follow"}
                </Button>
              )}
            </div>
            
            <div>
              <div className="flex items-center">
                <Link 
                  to={`/profile/${profile.username}`}
                  className="font-bold text-lg hover:underline flex items-center"
                >
                  {profile.display_name || profile.username}
                  {(profile.avatar_nft_id && profile.avatar_nft_chain) && (
                    <VerifiedBadge className="ml-1.5" />
                  )}
                </Link>
              </div>
              <Link 
                to={`/profile/${profile.username}`}
                className="text-crypto-lightgray hover:underline"
              >
                @{profile.username}
              </Link>
            </div>
            
            {profile.bio && (
              <p className="text-sm text-crypto-text">{profile.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-y-1 text-xs text-crypto-lightgray">
              {profile.location && (
                <div className="flex items-center mr-3">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  <span>{profile.location}</span>
                </div>
              )}
              
              {profile.website && (
                <div className="flex items-center mr-3">
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-crypto-blue hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              )}
              
              <div className="flex items-center w-full mt-1">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
              </div>
            </div>
            
            <div className="flex text-sm">
              <Link 
                to={`/profile/${profile.username}`} 
                className="mr-4 hover:underline"
              >
                <span className="font-bold text-crypto-text">{profile.following_count || 0}</span>{" "}
                <span className="text-crypto-lightgray">Following</span>
              </Link>
              <Link 
                to={`/profile/${profile.username}`}
                className="hover:underline"
              >
                <span className="font-bold text-crypto-text">{profile.followers_count || 0}</span>{" "}
                <span className="text-crypto-lightgray">Followers</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <User2 className="h-8 w-8 text-crypto-gray mb-2" />
            <p className="text-crypto-lightgray">{username ? `Could not find @${username}` : "User not found"}</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default ProfileHoverCard;
