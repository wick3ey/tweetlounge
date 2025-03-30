
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { followUser, unfollowUser, isFollowing } from '@/services/profileService';
import { useToast } from '@/components/ui/use-toast';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { VerifiedBadge } from '@/components/ui/badge';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count?: number;
  following_count?: number;
  avatar_nft_id?: string;
  avatar_nft_chain?: string;
  location?: string;
}

interface ProfileHoverCardProps {
  profile: Profile;
  children: React.ReactNode;
  align?: "center" | "start" | "end";
}

const ProfileHoverCard: React.FC<ProfileHoverCardProps> = ({ profile, children, align = "center" }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (user && profile.id && user.id !== profile.id) {
        const status = await isFollowing(profile.id);
        setFollowing(status);
      }
    };
    
    checkFollowStatus();
  }, [user, profile.id]);

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to follow users",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let success;
      if (following) {
        success = await unfollowUser(profile.id);
        if (success) {
          toast({
            title: "Unfollowed",
            description: `You have unfollowed ${profile.display_name}`,
          });
        }
      } else {
        success = await followUser(profile.id);
        if (success) {
          toast({
            title: "Following",
            description: `You are now following ${profile.display_name}`,
          });
        }
      }
      
      if (success) {
        setFollowing(!following);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast({
        title: "Error",
        description: "There was a problem with your request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      
      <HoverCardContent 
        align={align} 
        className="w-80 bg-black border border-gray-800 p-0 shadow-lg rounded-xl"
      >
        <div className="flex flex-col space-y-3">
          {/* Header with profile info */}
          <div className="p-4">
            <div className="flex justify-between items-start">
              <Link to={`/profile/${profile.username}`}>
                <Avatar className="h-16 w-16 border-2 border-gray-800 hover:opacity-90 transition-opacity">
                  <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                  <AvatarFallback className="text-lg">
                    {profile.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              {user && user.id !== profile.id && (
                <Button 
                  variant={following ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={isLoading}
                  className={`rounded-full px-4 ${following ? 'text-white border-gray-700 hover:bg-gray-800 hover:text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>
            
            <div className="mt-2">
              <Link 
                to={`/profile/${profile.username}`}
                className="flex items-center hover:underline font-bold text-base"
              >
                {profile.display_name}
                {(profile.avatar_nft_id && profile.avatar_nft_chain) && (
                  <VerifiedBadge className="ml-1" />
                )}
              </Link>
              <p className="text-gray-500 text-sm">@{profile.username}</p>
            </div>
            
            {profile.bio && (
              <p className="mt-2 text-sm text-gray-200">{profile.bio}</p>
            )}
          </div>
          
          {/* Stats and location */}
          <div className="px-4 pb-4">
            {profile.location && (
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin size={14} className="mr-1" />
                <span>{profile.location}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm">
              <Link to={`/profile/${profile.username}`} className="flex items-center hover:underline">
                <span className="font-semibold text-white">{profile.following_count || 0}</span>
                <span className="text-gray-500 ml-1">Following</span>
              </Link>
              
              <Link to={`/profile/${profile.username}`} className="flex items-center hover:underline">
                <span className="font-semibold text-white">{profile.followers_count || 0}</span>
                <span className="text-gray-500 ml-1">Followers</span>
              </Link>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default ProfileHoverCard;
