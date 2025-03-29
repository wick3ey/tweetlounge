import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { getProfileById } from '@/services/profileService';

// Badge component
const CryptoTag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-crypto-blue/10 text-crypto-blue dark:bg-crypto-blue/20 dark:text-crypto-lightgray">
    {children}
  </div>
);

interface ProfileProps {
  profileUsername?: string;
  profileUserId?: string | null;
}

const Profile = ({ profileUsername, profileUserId }: ProfileProps) => {
  const { user } = useAuth();
  const { profile: currentUserProfile, isLoading: currentProfileLoading, error: currentProfileError } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const { username } = useParams<{ username: string }>();
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const [showNFTBrowser, setShowNFTBrowser] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if we're viewing the current user's profile
  const effectiveUsername = profileUsername || username;
  const isCurrentUser = !effectiveUsername || (currentUserProfile?.username === effectiveUsername);
  
  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // If it's the current user's profile, use the profile from context
        if (isCurrentUser && currentUserProfile) {
          setProfileData(currentUserProfile);
          
          // Fetch creation date for current user
          if (user) {
            const { data, error } = await supabase
              .from('profiles')
              .select('created_at')
              .eq('id', user.id)
              .single();
              
            if (!error && data) {
              setUserCreatedAt(data.created_at);
            }
          }
        } 
        // Otherwise fetch the profile by username or ID
        else {
          let profileResult;
          
          if (profileUserId) {
            profileResult = await getProfileById(profileUserId);
          } else if (effectiveUsername) {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('username', effectiveUsername)
              .single();
              
            if (error) throw error;
            profileResult = data;
          }
          
          if (!profileResult) {
            throw new Error('Profile not found');
          }
          
          setProfileData(profileResult);
          setUserCreatedAt(profileResult.created_at);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setError(error.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
  }, [isCurrentUser, currentUserProfile, effectiveUsername, profileUserId, user]);
  
  useEffect(() => {
    const checkNFTVerification = async () => {
      if (profileData && user) {
        console.log("Checking NFT verification for profile:", profileData);
        const isVerified = await verifyNFTOwnership(
          isCurrentUser ? user.id : profileData.id,
          profileData.ethereum_address,
          profileData.solana_address
        );
        console.log("NFT verification result:", isVerified);
        setIsNFTVerified(isVerified);
      }
    };
    
    if (!isLoading && profileData) {
      checkNFTVerification();
    }
  }, [profileData, isLoading, user, isCurrentUser]);
  
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
    if (profileData?.avatar_url) {
      setShowProfileImage(true);
    }
  };
  
  // If still loading data or waiting for current user profile
  if (isLoading || (isCurrentUser && currentProfileLoading)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl flex flex-col items-center">
          <Loader className="h-12 w-12 animate-spin text-crypto-blue" />
          <p className="mt-4 text-crypto-blue font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  // If there was an error fetching the profile
  if (error || (isCurrentUser && currentProfileError)) {
    const errorMessage = error || currentProfileError;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md">
          <div className="text-crypto-red mb-4 text-center">Error loading profile: {errorMessage}</div>
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
  
  // If no profile data was found
  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md text-center">
          <div className="text-crypto-lightgray mb-4">Profile not found.</div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-crypto-blue hover:bg-crypto-darkblue text-white px-4 py-2 rounded-lg"
          >Try Again</button>
        </div>
      </div>
    );
  }
  
  const formatWebsiteUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    return url.startsWith('http') ? url : `https://${url}`;
  };
  
  return (
    <div className="w-full bg-crypto-black text-crypto-text">
      <ProfileHeader
        userId={profileData.id || ''}
        username={profileData.username || 'username'}
        displayName={profileData.display_name || 'Display Name'}
        avatarUrl={profileData.avatar_url || undefined}
        coverUrl={profileData.cover_url || undefined}
        bio={profileData.bio || undefined}
        location={profileData.location || undefined}
        website={profileData.website ? formatWebsiteUrl(profileData.website) : undefined}
        ethereumAddress={profileData.ethereum_address}
        solanaAddress={profileData.solana_address}
        isCurrentUser={isCurrentUser}
        followersCount={profileData.followers_count || 0}
        followingCount={profileData.following_count || 0}
        joinedDate={userCreatedAt || new Date().toISOString()}
        onEditProfile={handleEditProfile}
        onOpenNFTBrowser={handleOpenNFTBrowser}
        isNFTVerified={isNFTVerified}
        onAvatarClick={handleOpenProfileImage}
      />
      
      <ProfileTabs 
        userId={profileData.id || ''} 
        isCurrentUser={isCurrentUser}
        solanaAddress={profileData.solana_address}
      />
      
      {isCurrentUser && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-crypto-darkgray border-crypto-gray">
            <DialogHeader>
              <DialogTitle className="text-crypto-blue">Edit profile</DialogTitle>
            </DialogHeader>
            <ProfileEditForm onClose={handleCloseEditForm} />
          </DialogContent>
        </Dialog>
      )}
      
      {isCurrentUser && (
        <Dialog open={showNFTBrowser} onOpenChange={setShowNFTBrowser}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-crypto-darkgray border-crypto-gray">
            <DialogHeader>
              <DialogTitle className="text-crypto-blue">Choose NFT as Profile Picture</DialogTitle>
            </DialogHeader>
            {profileData && (
              <NFTBrowser 
                ethereumAddress={profileData.ethereum_address} 
                solanaAddress={profileData.solana_address}
                onNFTSelected={handleCloseNFTBrowser}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog for enlarged profile image */}
      <Dialog open={showProfileImage} onOpenChange={setShowProfileImage}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden bg-crypto-darkgray border-crypto-gray p-0">
          <div className="relative w-full">
            {profileData?.avatar_url && (
              <img 
                src={profileData.avatar_url} 
                alt={profileData.display_name || profileData.username || 'Profile'} 
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
