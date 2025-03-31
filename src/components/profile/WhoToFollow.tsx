
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CryptoButton } from '@/components/ui/crypto-button';
import { Loader, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing, followUser, unfollowUser } from '@/services/profileService';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_following: boolean;
}

interface WhoToFollowProps {
  limit?: number;
}

const WhoToFollow: React.FC<WhoToFollowProps> = ({ limit = 3 }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // This is a simple implementation - in a real app, you might want 
        // to have a specific API for profile suggestions
        const profileData = await getFollowing('system'); // Using 'system' as a placeholder for suggested profiles
        
        // Filter out profiles the user is already following and limit the number
        const filteredProfiles = profileData
          .filter(profile => profile.id !== user.id)
          .slice(0, limit);
        
        setSuggestions(filteredProfiles);
        
        // Initialize following status
        const initialStatus: Record<string, boolean> = {};
        filteredProfiles.forEach(profile => {
          initialStatus[profile.id] = profile.is_following;
        });
        setFollowingStatus(initialStatus);
      } catch (error) {
        console.error('Failed to fetch profile suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user, limit]);

  const handleFollowToggle = async (profileId: string, currentlyFollowing: boolean) => {
    if (!user) {
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
        }
      } else {
        const success = await followUser(profileId);
        if (success) {
          setFollowingStatus(prev => ({ ...prev, [profileId]: true }));
        }
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

  return (
    <div className="rounded-lg border border-gray-800 bg-black p-4">
      <div className="flex items-center mb-4">
        <Users className="h-4 w-4 mr-2 text-crypto-blue" />
        <h3 className="font-medium">Who to Follow</h3>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24 bg-gray-800" />
                <Skeleton className="h-3 w-16 bg-gray-800" />
              </div>
              <Skeleton className="h-8 w-16 rounded-full bg-gray-800" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-500 text-sm">No suggestions available.</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((profile) => (
            <li key={profile.id} className="flex items-center justify-between">
              <Link 
                to={`/profile/${profile.username}`}
                className="flex items-center gap-2 hover:bg-gray-900 rounded p-1 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name || ''} />
                  ) : null}
                  <AvatarFallback className="bg-crypto-blue text-white">
                    {profile.display_name?.substring(0, 2).toUpperCase() || 
                     profile.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <p className="text-sm font-medium leading-none">{profile.display_name}</p>
                  <p className="text-xs text-gray-500">@{profile.username}</p>
                </div>
              </Link>
              
              <CryptoButton
                variant={followingStatus[profile.id] ? "outline" : "default"}
                size="sm"
                className={`rounded-full text-xs ${
                  followingStatus[profile.id] 
                    ? 'hover:bg-crypto-red/10 hover:text-crypto-red hover:border-crypto-red/20 border-crypto-gray text-crypto-text' 
                    : 'bg-crypto-blue hover:bg-crypto-darkblue text-white'
                }`}
                onClick={() => handleFollowToggle(profile.id, followingStatus[profile.id])}
                disabled={loadingStatus[profile.id]}
              >
                {loadingStatus[profile.id] ? (
                  <Loader className="h-3 w-3 animate-spin" />
                ) : followingStatus[profile.id] ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </CryptoButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WhoToFollow;
