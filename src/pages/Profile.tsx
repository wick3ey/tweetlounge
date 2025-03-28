
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader, 
  Settings, 
  Image, 
  Reply, 
  Coins, 
  Wallet,
  MessageSquare,
  FileImage,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { verifyNFTOwnership } from '@/utils/nftService';
import NFTBrowser from '@/components/profile/NFTBrowser';
import WalletAssets from '@/components/profile/WalletAssets';
import { CryptoButton } from '@/components/ui/crypto-button';

// Badge component
const CryptoTag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-crypto-blue/10 text-crypto-blue dark:bg-crypto-blue/20 dark:text-crypto-lightgray">
    {children}
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading, error } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState('posts');
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const [showNFTBrowser, setShowNFTBrowser] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  
  const isCurrentUser = !username || (profile?.username === username);
  
  useEffect(() => {
    const fetchUserCreationDate = async () => {
      if (user) {
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
          
          if (data) {
            setUserCreatedAt(data.created_at);
          }
        } catch (error) {
          console.error("Error in fetchUserCreationDate:", error);
        }
      }
    };
    
    fetchUserCreationDate();
  }, [user]);
  
  useEffect(() => {
    const checkNFTVerification = async () => {
      if (profile && user) {
        console.log("Checking NFT verification for profile:", profile);
        const isVerified = await verifyNFTOwnership(
          user.id,
          profile.ethereum_address,
          profile.solana_address
        );
        console.log("NFT verification result:", isVerified);
        setIsNFTVerified(isVerified);
      }
    };
    
    if (!isLoading && profile) {
      checkNFTVerification();
    }
  }, [profile, isLoading, user]);
  
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
    if (profile?.avatar_url) {
      setShowProfileImage(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl flex flex-col items-center">
          <Loader className="h-12 w-12 animate-spin text-crypto-blue" />
          <p className="mt-4 text-crypto-blue font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md">
          <div className="text-crypto-red mb-4 text-center">Error loading profile: {error}</div>
          <CryptoButton 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </CryptoButton>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl max-w-md text-center">
          <div className="text-crypto-lightgray mb-4">Profile not found or you're not logged in.</div>
          <CryptoButton 
            onClick={() => window.location.reload()}
            className="w-full"
          >Try Again</CryptoButton>
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
        userId={user?.id || ''}
        username={profile.username || 'username'}
        displayName={profile.display_name || 'Display Name'}
        avatarUrl={profile.avatar_url || undefined}
        coverUrl={profile.cover_url || undefined}
        bio={profile.bio || undefined}
        location={profile.location || undefined}
        website={profile.website ? formatWebsiteUrl(profile.website) : undefined}
        ethereumAddress={profile.ethereum_address}
        solanaAddress={profile.solana_address}
        isCurrentUser={isCurrentUser}
        followersCount={0} // placeholder
        followingCount={0} // placeholder
        joinedDate={userCreatedAt || new Date().toISOString()}
        onEditProfile={handleEditProfile}
        onOpenNFTBrowser={handleOpenNFTBrowser}
        isNFTVerified={isNFTVerified}
        onAvatarClick={handleOpenProfileImage}
      />
      
      <div className="border-b border-crypto-gray">
        <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full flex justify-between bg-transparent border-b border-crypto-gray px-0 h-auto">
            <TabsTrigger 
              value="posts" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
            >
              <MessageSquare className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="replies" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
            >
              <Reply className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Replies</span>
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
            >
              <FileImage className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-crypto-blue data-[state=active]:text-crypto-blue"
            >
              <Coins className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {activeTab === 'posts' && (
                <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                  <div className="text-xl font-bold mb-2 text-crypto-text">No posts yet</div>
                  <p className="text-crypto-lightgray text-center mb-6">When you post, your tweets will show up here</p>
                  {isCurrentUser && (
                    <CryptoButton className="px-6 py-2">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create your first post
                    </CryptoButton>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="replies" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Reply className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No replies yet</div>
                <p className="text-crypto-lightgray text-center">When you reply to someone, it will show up here</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="media" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                <Image className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 text-crypto-text">No media yet</div>
                <p className="text-crypto-lightgray text-center">When you post photos or videos, they will show up here</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="assets" className="mt-0 pt-4">
            {profile.solana_address ? (
              <div className="px-4">
                <div className="mb-4">
                  <h2 className="font-bold text-lg text-crypto-blue">Wallet Assets</h2>
                </div>
                <WalletAssets 
                  solanaAddress={profile.solana_address}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="bg-crypto-darkgray border border-crypto-gray p-8 rounded-xl text-center max-w-md mx-auto">
                  <Coins className="h-12 w-12 text-crypto-blue mb-4 mx-auto" />
                  <div className="text-xl font-bold mb-2 text-crypto-text">No wallet connected</div>
                  <p className="text-crypto-lightgray text-center mb-4">Connect your Solana wallet to view your assets</p>
                  {isCurrentUser && (
                    <CryptoButton 
                      variant="outline" 
                      className="group border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text"
                      onClick={() => toast({
                        title: "Connect Wallet",
                        description: "Please connect your Solana wallet in the profile section above.",
                      })}
                    >
                      <Wallet className="h-4 w-4 mr-2 group-hover:text-crypto-blue" />
                      Connect Solana Wallet
                    </CryptoButton>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
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
          {profile && (
            <NFTBrowser 
              ethereumAddress={profile.ethereum_address} 
              solanaAddress={profile.solana_address}
              onNFTSelected={handleCloseNFTBrowser}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for enlarged profile image */}
      <Dialog open={showProfileImage} onOpenChange={setShowProfileImage}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden bg-crypto-darkgray border-crypto-gray p-0">
          <div className="relative w-full">
            {profile?.avatar_url && (
              <img 
                src={profile.avatar_url} 
                alt={profile.display_name || profile.username || 'Profile'} 
                className="w-full h-auto"
              />
            )}
            <Button 
              variant="ghost" 
              className="absolute top-2 right-2 rounded-full p-2 bg-crypto-black/50 hover:bg-crypto-black/70"
              onClick={() => setShowProfileImage(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
