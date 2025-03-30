
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import ProfileTabs from '@/components/profile/ProfileTabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, Settings, Image } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { verifyNFTOwnership } from '@/utils/nftService';
import NFTBrowser from '@/components/profile/NFTBrowser';
import { getProfileByUsername, isFollowing } from '@/services/profileService';
import { Profile as ProfileType } from '@/lib/supabase';

const CryptoTag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-crypto-blue/10 text-crypto-blue dark:bg-crypto-blue/20 dark:text-crypto-lightgray">
    {children}
  </div>
);

interface ProfileProps {
  username?: string;
  isOwnProfile: boolean;
}

const Profile = ({ username, isOwnProfile }: ProfileProps) => {
  const { user } = useAuth();
  const { profile: currentUserProfile, isLoading: currentProfileLoading, error: currentProfileError } = useProfile();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const [showNFTBrowser, setShowNFTBrowser] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  
  const [viewedProfile, setViewedProfile] = useState<ProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isUserFollowing, setIsUserFollowing] = useState(false);
  
  // Create full profile object for own profile or use viewed profile
  const fullProfileData: ProfileType | null = isOwnProfile && currentUserProfile ? {
    id: user?.id || '',
    username: currentUserProfile.username,
    display_name: currentUserProfile.display_name,
    bio: currentUserProfile.bio,
    avatar_url: currentUserProfile.avatar_url,
    cover_url: currentUserProfile.cover_url,
    location: currentUserProfile.location,
    website: currentUserProfile.website,
    updated_at: currentUserProfile.updated_at || new Date().toISOString(),
    created_at: userCreatedAt || new Date().toISOString(),
    ethereum_address: currentUserProfile.ethereum_address,
    solana_address: currentUserProfile.solana_address,
    avatar_nft_id: currentUserProfile.avatar_nft_id,
    avatar_nft_chain: currentUserProfile.avatar_nft_chain,
    followers_count: currentUserProfile.followers_count || 0,
    following_count: currentUserProfile.following_count || 0,
    replies_sort_order: currentUserProfile.replies_sort_order
  } : viewedProfile;
  
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (isOwnProfile || !user || !viewedProfile) return;
      
      try {
        const following = await isFollowing(viewedProfile.id);
        setIsUserFollowing(following);
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    };
    
    checkFollowStatus();
  }, [isOwnProfile, user, viewedProfile]);
  
  useEffect(() => {
    const fetchViewedProfile = async () => {
      if (!isOwnProfile && username) {
        try {
          setIsLoadingProfile(true);
          setProfileError(null);
          
          const profileData = await getProfileByUsername(username);
          if (profileData) {
            setViewedProfile(profileData);
            
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('id', profileData.id)
                .single();
                
              if (!error && data) {
                setUserCreatedAt(data.created_at);
              }
            } catch (err) {
              console.error("Error fetching user creation date:", err);
            }
          } else {
            setProfileError("Profile not found");
          }
        } catch (err) {
          console.error("Error fetching profile by username:", err);
          setProfileError("Failed to load profile");
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };
    
    fetchViewedProfile();
  }, [username, isOwnProfile]);
  
  useEffect(() => {
    const fetchUserCreationDate = async () => {
      if (user && isOwnProfile) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user creation date:", error);
            return;
          }
          
          if (data && 'created_at' in data) {
            setUserCreatedAt(data.created_at);
          }
        } catch (error) {
          console.error("Error in fetchUserCreationDate:", error);
        }
      }
    };
    
    fetchUserCreationDate();
  }, [user, isOwnProfile]);
  
  useEffect(() => {
    const checkNFTVerification = async () => {
      if (fullProfileData && user) {
        console.log("Checking NFT verification for profile:", fullProfileData);
        const isVerified = await verifyNFTOwnership(
          isOwnProfile ? user.id : fullProfileData.id,
          fullProfileData.ethereum_address,
          fullProfileData.solana_address
        );
        console.log("NFT verification result:", isVerified);
        setIsNFTVerified(isVerified);
      }
    };
    
    if (!isLoadingProfile && !currentProfileLoading && fullProfileData) {
      checkNFTVerification();
    }
  }, [fullProfileData, isLoadingProfile, currentProfileLoading, user, isOwnProfile]);
  
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  const handleCloseEditForm = () => {
    setIsEditing(false);
  };

  const handleOpenNFTBrowser = () => {
    setShowNFTBrowser(true);
  };

  const handleCloseNFTBrowser = () => {
    setShowNFTBrowser(false);
  };

  const handleOpenProfileImage = () => {
    if (fullProfileData?.avatar_url) {
      setShowProfileImage(true);
    }
  };
  
  const handleFollowAction = (newFollowState: boolean) => {
    setIsUserFollowing(newFollowState);
  };
  
  if (isLoading || currentProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl flex flex-col items-center">
          <Loader className="h-12 w-12 animate-spin text-crypto-blue" />
          <p className="mt-4 text-crypto-blue font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error || currentProfileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md">
          <div className="text-crypto-red mb-4 text-center">Error loading profile: {error || currentProfileError}</div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-crypto-blue hover:bg-crypto-darkblue text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (!fullProfileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md text-center">
          <div className="text-crypto-lightgray mb-4">Profile not found or you're not logged in.</div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-crypto-blue hover:bg-crypto-darkblue text-white px-4 py-2 rounded-lg"
          >Try Again</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-crypto-black text-crypto-text">
      {fullProfileData && (
        <ProfileHeader
          profile={fullProfileData}
          isCurrentUser={isOwnProfile}
          isFollowing={isUserFollowing}
          onFollowChange={handleFollowAction}
        />
      )}
      
      <ProfileTabs 
        userId={isOwnProfile ? (user?.id || '') : (fullProfileData?.id || '')}
        isCurrentUser={isOwnProfile}
        solanaAddress={fullProfileData?.solana_address}
      />
      
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-crypto-darkgray border-crypto-gray">
          <DialogHeader>
            <DialogTitle className="text-crypto-blue">Edit profile</DialogTitle>
          </DialogHeader>
          <ProfileEditForm onClose={handleCloseEditForm} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showNFTBrowser} onOpenChange={setShowNFTBrowser}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-crypto-darkgray border-crypto-gray">
          <DialogHeader>
            <DialogTitle className="text-crypto-blue">Choose NFT as Profile Picture</DialogTitle>
          </DialogHeader>
          {fullProfileData && (
            <NFTBrowser 
              ethereumAddress={fullProfileData.ethereum_address} 
              solanaAddress={fullProfileData.solana_address}
              onNFTSelected={handleCloseNFTBrowser}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileImage} onOpenChange={setShowProfileImage}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden bg-crypto-darkgray border-crypto-gray p-0">
          <div className="relative w-full">
            {fullProfileData?.avatar_url && (
              <img 
                src={fullProfileData.avatar_url} 
                alt={fullProfileData.display_name || fullProfileData.username || 'Profile'} 
                className="w-full h-auto"
              />
            )}
            <button 
              className="absolute top-2 right-2 rounded-full p-2 bg-crypto-black/50 hover:bg-crypto-black/70"
              onClick={() => setShowProfileImage(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
