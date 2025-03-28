
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
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';

// Badge component
const CryptoTag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-web3-primary/10 text-web3-primary dark:bg-web3-primary/20 dark:text-web3-highlight">
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
  const [isCompactView, setIsCompactView] = useState(false);
  
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="glass-card p-8 flex flex-col items-center">
          <Loader className="h-12 w-12 animate-spin text-web3-secondary" />
          <p className="mt-4 gradient-text font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="glass-card p-8 max-w-md">
          <div className="text-red-500 mb-4 text-center">Error loading profile: {error}</div>
          <Button 
            onClick={() => window.location.reload()}
            className="web3-button w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">Profile not found or you're not logged in.</div>
          <Button 
            onClick={() => window.location.reload()}
            className="web3-button w-full"
          >Try Again</Button>
        </div>
      </div>
    );
  }
  
  const formatWebsiteUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    return url.startsWith('http') ? url : `https://${url}`;
  };
  
  return (
    <div className="w-full transition-all duration-300">
      <div className="flex justify-end p-2 gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1 hidden sm:inline">Compact view</span>
          <Switch 
            checked={isCompactView}
            onCheckedChange={setIsCompactView}
            className="data-[state=checked]:bg-web3-primary"
          />
        </div>
        <ThemeToggle />
      </div>
      
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
      />
      
      <div className="border-b border-border">
        <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full flex justify-between bg-transparent border-b px-0 h-auto">
            <TabsTrigger 
              value="posts" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-web3-primary data-[state=active]:text-web3-primary"
            >
              <MessageSquare className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="replies" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-web3-primary data-[state=active]:text-web3-primary"
            >
              <Reply className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Replies</span>
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-web3-primary data-[state=active]:text-web3-primary"
            >
              <FileImage className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              className="flex-1 py-4 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-web3-primary data-[state=active]:text-web3-primary"
            >
              <Coins className="mr-2 h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {activeTab === 'posts' && (
                <div className="glass-card p-8 text-center max-w-md mx-auto">
                  <div className="text-xl font-bold mb-2 gradient-text">No posts yet</div>
                  <p className="text-gray-500 dark:text-gray-400 text-center mb-6">When you post, your tweets will show up here</p>
                  {isCurrentUser && (
                    <Button className="web3-button px-6 py-2">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create your first post
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="replies" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="glass-card p-8 text-center max-w-md mx-auto">
                <Reply className="h-12 w-12 text-web3-secondary mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 gradient-text">No replies yet</div>
                <p className="text-gray-500 dark:text-gray-400 text-center">When you reply to someone, it will show up here</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="media" className="mt-0 pt-4">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="glass-card p-8 text-center max-w-md mx-auto">
                <Image className="h-12 w-12 text-web3-accent mb-4 mx-auto" />
                <div className="text-xl font-bold mb-2 gradient-text">No media yet</div>
                <p className="text-gray-500 dark:text-gray-400 text-center">When you post photos or videos, they will show up here</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="assets" className="mt-0 pt-4">
            {profile.solana_address ? (
              <div className={`transition-all duration-300 ${isCompactView ? 'px-2' : 'px-4'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-lg gradient-text">Wallet Assets</h2>
                  <div className="flex gap-2">
                    <Toggle variant="outline" size="sm" className="text-xs h-8">
                      Hide small balances
                    </Toggle>
                    <Toggle variant="outline" size="sm" className="text-xs h-8">
                      Show %
                    </Toggle>
                  </div>
                </div>
                <WalletAssets 
                  solanaAddress={profile.solana_address}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="glass-card p-8 text-center max-w-md mx-auto">
                  <Coins className="h-12 w-12 text-web3-muted mb-4 mx-auto" />
                  <div className="text-xl font-bold mb-2 gradient-text">No wallet connected</div>
                  <p className="text-gray-500 dark:text-gray-400 text-center mb-4">Connect your Solana wallet to view your assets</p>
                  {isCurrentUser && (
                    <Button 
                      variant="outline" 
                      className="group border-web3-primary/30 hover:bg-web3-primary/10 dark:text-white"
                      onClick={() => toast({
                        title: "Connect Wallet",
                        description: "Please connect your Solana wallet in the profile section above.",
                      })}
                    >
                      <Wallet className="h-4 w-4 mr-2 group-hover:text-web3-primary" />
                      Connect Solana Wallet
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-web3-navy border-web3-muted">
          <DialogHeader>
            <DialogTitle className="gradient-text">Edit profile</DialogTitle>
          </DialogHeader>
          <ProfileEditForm onClose={handleCloseEditForm} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showNFTBrowser} onOpenChange={setShowNFTBrowser}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-web3-navy border-web3-muted">
          <DialogHeader>
            <DialogTitle className="gradient-text">Choose NFT as Profile Picture</DialogTitle>
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
    </div>
  );
};

export default Profile;
