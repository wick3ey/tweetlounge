
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CryptoButton } from '@/components/ui/crypto-button';
import { Skeleton } from '@/components/ui/skeleton';
import { followUser, unfollowUser, isFollowing } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { UsersIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedBadge } from '@/components/ui/badge';

interface WhoToFollowProps {
  limit?: number;
}

export const WhoToFollow: React.FC<WhoToFollowProps> = ({ limit = 3 }) => {
  const { user } = useAuth();

  // Query to fetch suggested profiles to follow
  const { data: suggestedProfiles, isLoading, refetch } = useQuery({
    queryKey: ['suggested-profiles', limit],
    queryFn: async () => {
      try {
        // Fetch random profiles from the database instead of using hardcoded usernames
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, avatar_nft_id, avatar_nft_chain')
          .limit(limit + 5); // Fetch a few extra in case we need to filter out the current user
        
        if (error) {
          console.error('Error fetching profiles:', error);
          return [];
        }
        
        // Filter out the current user and limit to the requested number
        const filteredProfiles = profiles
          .filter(profile => !user || profile.id !== user.id)
          .slice(0, limit);
        
        // Check if the current user is following each profile
        const profilesWithFollowStatus = await Promise.all(
          filteredProfiles.map(async (profile) => {
            const isUserFollowing = user ? await isFollowing(profile.id) : false;
            return {
              ...profile,
              isFollowing: isUserFollowing
            };
          })
        );
        
        return profilesWithFollowStatus;
      } catch (error) {
        console.error('Error in suggested profiles query:', error);
        return [];
      }
    },
    enabled: true,
  });

  const handleFollow = async (profileId: string) => {
    if (!user) return;
    
    await followUser(profileId);
    refetch();
  };
  
  const handleUnfollow = async (profileId: string) => {
    if (!user) return;
    
    await unfollowUser(profileId);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <UsersIcon size={18} className="text-crypto-blue" />
          <h3 className="font-medium">Who to Follow</h3>
        </div>
        {Array(limit).fill(0).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!suggestedProfiles || suggestedProfiles.length === 0) {
    return (
      <div className="p-3 border border-gray-800 rounded-lg bg-black">
        <div className="flex items-center gap-2 mb-2">
          <UsersIcon size={18} className="text-crypto-blue" />
          <h3 className="font-medium">Who to Follow</h3>
        </div>
        <p className="text-sm text-gray-400">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <UsersIcon size={18} className="text-crypto-blue" />
        <h3 className="font-medium">Who to Follow</h3>
      </div>
      {suggestedProfiles.map((profile) => (
        <div key={profile.id} className="flex items-center gap-3 p-2 hover:bg-gray-900/40 rounded-lg transition-colors">
          <Link to={`/profile/${profile.username}`} className="flex-shrink-0">
            <Avatar className="h-10 w-10 border border-gray-800">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-gray-800 text-white">
                {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${profile.username}`} className="font-medium text-sm hover:underline block truncate flex items-center">
              {profile.display_name || profile.username}
              {(profile.avatar_nft_id && profile.avatar_nft_chain) && (
                <VerifiedBadge className="ml-1" />
              )}
            </Link>
            <Link to={`/profile/${profile.username}`} className="text-gray-500 text-xs hover:underline block truncate">
              @{profile.username}
            </Link>
          </div>
          {user && (
            profile.isFollowing ? (
              <CryptoButton 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs"
                onClick={() => handleUnfollow(profile.id)}
              >
                Unfollow
              </CryptoButton>
            ) : (
              <CryptoButton 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => handleFollow(profile.id)}
              >
                Follow
              </CryptoButton>
            )
          )}
        </div>
      ))}
    </div>
  );
};
