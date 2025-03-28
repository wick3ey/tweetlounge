
import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader, ImagePlus, Link2, MapPin, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import CoverImageCropper from './CoverImageCropper';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import NFTBrowser from './NFTBrowser';
import { 
  connectEthereumWallet, 
  connectSolanaWallet, 
  updateWalletAddress, 
  WalletType 
} from '@/utils/walletConnector';
import { CryptoButton } from '@/components/ui/crypto-button';

interface ProfileEditFormProps {
  onClose?: () => void;
}

const ProfileEditForm = ({ onClose }: ProfileEditFormProps) => {
  const { user } = useAuth();
  const { profile, isLoading, error, updateProfile, refreshProfile } = useProfile();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [ethereumAddress, setEthereumAddress] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  
  // For cover image cropper
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  
  // For NFT browser
  const [isNFTBrowserOpen, setIsNFTBrowserOpen] = useState(false);
  
  // Load profile data when component mounts
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setAvatarUrl(profile.avatar_url);
      setCoverUrl(profile.cover_url);
      setEthereumAddress(profile.ethereum_address);
      setSolanaAddress(profile.solana_address);
    }
  }, [profile]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Validate website format
      let formattedWebsite = website.trim();
      if (formattedWebsite && !formattedWebsite.match(/^https?:\/\//)) {
        formattedWebsite = 'https://' + formattedWebsite;
      }
      
      // Validate location length
      if (location.length > 30) {
        toast({
          title: 'Location too long',
          description: 'Location must be 30 characters or less.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      
      await updateProfile({
        username,
        display_name: displayName,
        bio,
        location,
        website: formattedWebsite,
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const connectWallet = async (walletType: WalletType) => {
    if (!user) return;
    
    setConnectingWallet(true);
    
    try {
      const result = walletType === 'ethereum' 
        ? await connectEthereumWallet() 
        : await connectSolanaWallet();
      
      if (!result.success) {
        toast({
          title: 'Connection Error',
          description: result.error || `Failed to connect ${walletType} wallet`,
          variant: 'destructive',
        });
        return;
      }
      
      // Update wallet address in database
      const updateResult = await updateWalletAddress(user.id, walletType, result.address!);
      
      if (!updateResult.success) {
        toast({
          title: 'Update Error',
          description: updateResult.error || `Failed to save ${walletType} wallet address`,
          variant: 'destructive',
        });
        return;
      }
      
      // Update local state
      if (walletType === 'ethereum') {
        setEthereumAddress(result.address!);
      } else {
        setSolanaAddress(result.address!);
      }
      
      // Refresh profile data
      await refreshProfile();
      
      toast({
        title: 'Wallet Connected',
        description: `Your ${walletType === 'ethereum' ? 'Ethereum (MetaMask)' : 'Solana (Phantom)'} wallet has been connected successfully.`,
      });
      
    } catch (error) {
      console.error(`Error connecting ${walletType} wallet:`, error);
      toast({
        title: 'Error',
        description: `Failed to connect ${walletType} wallet: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setConnectingWallet(false);
    }
  };
  
  const handleOpenNFTBrowser = () => {
    if (!ethereumAddress && !solanaAddress) {
      toast({
        title: 'No Wallet Connected',
        description: 'Please connect at least one wallet to browse your NFTs.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsNFTBrowserOpen(true);
  };
  
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update the profile with the new avatar URL
      await updateProfile({ 
        avatar_url: urlData.publicUrl
      });
      
      // Update local state
      setAvatarUrl(urlData.publicUrl);
      
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleCoverImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setCoverImageFile(file);
    setIsCropperOpen(true);
  };
  
  const handleCroppedCoverImage = async (croppedImage: Blob) => {
    // The actual upload is now handled within the CoverImageCropper component
    // Here we just update our local state for UI updates
    if (coverUrl) {
      URL.revokeObjectURL(coverUrl);
    }
    
    // Create a URL for preview
    const localCoverUrl = URL.createObjectURL(croppedImage);
    setCoverUrl(localCoverUrl);
    
    // Refresh the profile to get the updated cover URL from the database
    await refreshProfile();
  };
  
  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    } else if (username) {
      return username.substring(0, 2).toUpperCase();
    } else {
      return user?.email?.substring(0, 2).toUpperCase() || 'UN';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="h-8 w-8 animate-spin text-crypto-blue" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-crypto-red">
        Error loading profile: {error}
      </div>
    );
  }
  
  return (
    <div className="text-crypto-text">
      {/* Cover Image Section */}
      <div className="relative mb-16">
        <AspectRatio ratio={3/1} className="bg-crypto-darkgray w-full">
          <div className="h-full w-full relative">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-crypto-black flex items-center justify-center">
                <p className="text-crypto-lightgray">No cover image</p>
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
              <label className="cursor-pointer">
                <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-full flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  <span>Change cover</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCoverImageSelect}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </AspectRatio>
        
        <div className="absolute -bottom-12 left-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-crypto-darkgray">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Profile" />
              ) : null}
              <AvatarFallback className="bg-crypto-blue text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer">
                <ImagePlus className="h-8 w-8 text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
              </label>
            </div>
            
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <Loader className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-8 px-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input 
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea 
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            className="min-h-[100px] bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" /> Location
          </Label>
          <Input 
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Malmö"
            maxLength={30}
            className="bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
          />
          <p className="text-xs text-crypto-lightgray">{location.length}/30 characters</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="website" className="flex items-center">
            <Link2 className="h-4 w-4 mr-1" /> Website
          </Label>
          <Input 
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g., https://www.google.com"
            className="bg-crypto-black border-crypto-gray text-crypto-text focus:border-crypto-blue"
          />
          <p className="text-xs text-crypto-lightgray">Enter your website URL</p>
        </div>
        
        <Separator className="my-6 bg-crypto-gray" />
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Wallet className="h-5 w-5 mr-2" /> 
            Connect Crypto Wallets
          </h3>
          <p className="text-sm text-crypto-lightgray">
            Connect your crypto wallets to use your NFTs as profile pictures
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-crypto-gray rounded-md p-4 bg-crypto-black">
              <h4 className="font-medium">Ethereum (MetaMask)</h4>
              {ethereumAddress ? (
                <div className="mt-2">
                  <p className="text-xs font-mono bg-crypto-darkgray p-2 rounded break-all text-crypto-text">
                    {ethereumAddress}
                  </p>
                  <p className="text-xs text-crypto-green mt-1">✓ Connected</p>
                </div>
              ) : (
                <p className="text-xs text-crypto-lightgray mt-1">Not connected</p>
              )}
              <CryptoButton 
                type="button"
                size="sm" 
                className="mt-3 w-full"
                disabled={connectingWallet}
                onClick={() => connectWallet('ethereum')}
              >
                {connectingWallet ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : null}
                {ethereumAddress ? 'Reconnect Wallet' : 'Connect MetaMask'}
              </CryptoButton>
            </div>
            
            <div className="border border-crypto-gray rounded-md p-4 bg-crypto-black">
              <h4 className="font-medium">Solana (Phantom)</h4>
              {solanaAddress ? (
                <div className="mt-2">
                  <p className="text-xs font-mono bg-crypto-darkgray p-2 rounded break-all text-crypto-text">
                    {solanaAddress}
                  </p>
                  <p className="text-xs text-crypto-green mt-1">✓ Connected</p>
                </div>
              ) : (
                <p className="text-xs text-crypto-lightgray mt-1">Not connected</p>
              )}
              <CryptoButton 
                type="button"
                size="sm" 
                className="mt-3 w-full"
                disabled={connectingWallet}
                onClick={() => connectWallet('solana')}
              >
                {connectingWallet ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : null}
                {solanaAddress ? 'Reconnect Wallet' : 'Connect Phantom'}
              </CryptoButton>
            </div>
          </div>
          
          <CryptoButton 
            type="button" 
            variant="outline" 
            className="w-full mt-2 border-crypto-gray text-crypto-text hover:bg-crypto-gray/20" 
            disabled={!ethereumAddress && !solanaAddress}
            onClick={handleOpenNFTBrowser}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Browse NFTs for Profile Picture
          </CryptoButton>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <CryptoButton 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="border-crypto-gray text-crypto-text hover:bg-crypto-gray/20"
          >
            Cancel
          </CryptoButton>
          <CryptoButton 
            type="submit" 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save'
            )}
          </CryptoButton>
        </div>
      </form>
      
      <CoverImageCropper 
        imageFile={coverImageFile}
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onSave={handleCroppedCoverImage}
      />
      
      <Dialog open={isNFTBrowserOpen} onOpenChange={setIsNFTBrowserOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-crypto-darkgray border-crypto-gray">
          <DialogHeader>
            <DialogTitle className="text-crypto-blue">Choose NFT as Profile Picture</DialogTitle>
          </DialogHeader>
          <NFTBrowser 
            ethereumAddress={ethereumAddress} 
            solanaAddress={solanaAddress} 
            onNFTSelected={() => setIsNFTBrowserOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileEditForm;
