
import { useState } from 'react';
import { CalendarDays, LinkIcon, MapPin, Wallet, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistance } from 'date-fns';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { connectEthereumWallet, connectSolanaWallet, updateWalletAddress } from '@/utils/walletConnector';
import { useToast } from '@/components/ui/use-toast';
import { NFT, fetchEthereumNFTs, fetchSolanaNFTs, setNFTAsProfilePicture } from '@/utils/nftService';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  ethereumAddress?: string | null;
  solanaAddress?: string | null;
  isCurrentUser: boolean;
  followersCount: number;
  followingCount: number;
  joinedDate: string;
  onEditProfile?: () => void;
  onOpenNFTBrowser?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  isNFTVerified?: boolean;
}

const ProfileHeader = ({
  userId,
  username,
  displayName,
  avatarUrl,
  coverUrl,
  bio,
  location,
  website,
  ethereumAddress,
  solanaAddress,
  isCurrentUser,
  followersCount,
  followingCount,
  joinedDate,
  onEditProfile,
  onOpenNFTBrowser,
  onFollow,
  isFollowing = false,
  isNFTVerified = false
}: ProfileHeaderProps) => {
  const [following, setFollowing] = useState(isFollowing);
  const { toast } = useToast();
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  
  const handleFollowClick = () => {
    setFollowing(!following);
    if (onFollow) onFollow();
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    } else if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'UN';
  };

  const joinedString = joinedDate 
    ? `Joined ${formatDistance(new Date(joinedDate), new Date(), { addSuffix: true })}`
    : 'Recently joined';

  // Function to get domain from URL
  const getDomainFromUrl = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  // Function to connect wallet
  const handleConnectWallet = async (type: 'ethereum' | 'solana') => {
    if (!isCurrentUser) return;
    
    setIsConnectingWallet(true);
    try {
      const result = type === 'ethereum' 
        ? await connectEthereumWallet() 
        : await connectSolanaWallet();
      
      if (result.success && result.address) {
        const updateResult = await updateWalletAddress(userId, type, result.address);
        
        if (updateResult.success) {
          toast({
            title: "Wallet connected",
            description: `Your ${type} wallet has been successfully connected.`,
          });
          
          // Fetch NFTs after wallet connection
          const nfts = type === 'ethereum' 
            ? await fetchEthereumNFTs(result.address)
            : await fetchSolanaNFTs(result.address);
          
          if (nfts.length > 0) {
            toast({
              title: "NFTs found",
              description: `Found ${nfts.length} NFTs in your wallet. You can set one as your profile picture.`,
            });
          }
          
          // Reload the page to update the profile
          window.location.reload();
        } else {
          toast({
            title: "Error",
            description: updateResult.error || `Failed to update your profile with the ${type} wallet address.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Connection failed",
          description: result.error || `Failed to connect to your ${type} wallet.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection error",
        description: "An unexpected error occurred while connecting your wallet.",
        variant: "destructive",
      });
    } finally {
      setIsConnectingWallet(false);
    }
  };
  
  const hasWallet = !!ethereumAddress || !!solanaAddress;

  return (
    <div className="border-b border-gray-200 pb-0">
      {/* Cover photo with Twitter-style aspect ratio (3:1) */}
      <AspectRatio ratio={3/1} className="bg-twitter-extraExtraLight">
        {coverUrl && (
          <div className="h-full w-full overflow-hidden">
            <img 
              src={coverUrl} 
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!coverUrl && (
          <div className="h-full w-full bg-twitter-extraExtraLight" />
        )}
      </AspectRatio>
      
      {/* Profile picture */}
      <div className="relative px-4">
        <div className="absolute -top-16">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-white">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-twitter-blue text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {/* NFT button for current user */}
            {isCurrentUser && hasWallet && (
              <Button 
                onClick={onOpenNFTBrowser}
                variant="outline" 
                size="sm"
                className="absolute bottom-0 right-0 rounded-full bg-white shadow-md"
                title="Set NFT as profile picture"
              >
                <img src="https://openseauserdata.com/files/265128aa51521c90f7905e5a43dcb456_new.svg" alt="NFT" className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Profile actions */}
      <div className="pt-2 px-4 flex justify-end">
        {isCurrentUser ? (
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="rounded-full font-semibold border-gray-300 hover:bg-gray-100" 
              onClick={onEditProfile}
            >
              Edit profile
            </Button>
          </div>
        ) : (
          <Button 
            variant={following ? "outline" : "default"}
            className={`rounded-full font-semibold ${following ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-gray-300' : 'bg-black hover:bg-black/90'}`}
            onClick={handleFollowClick}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>
      
      {/* Profile info */}
      <div className="px-4 mt-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{displayName}</h1>

          {/* Modern Twitter-style Verified Badge */}
          {isNFTVerified && (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="inline-flex items-center">
                  <div className="bg-red-500 rounded-full p-0.5 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-sm">
                <p className="font-semibold">Verified NFT Owner</p>
                <p className="text-gray-500 mt-1">
                  This profile is using an NFT as their profile picture that they verifiably own. 
                  The red checkmark confirms ownership of this digital asset on the blockchain.
                </p>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
        <h2 className="text-gray-500">@{username}</h2>
        
        {bio && <p className="mt-3 text-gray-900">{bio}</p>}
        
        <div className="flex flex-wrap items-center text-gray-500 mt-3 text-sm gap-4">
          {location && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{location}</span>
            </div>
          )}
          
          {website && (
            <div className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-1" />
              <a 
                href={website.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-twitter-blue hover:underline"
              >
                {getDomainFromUrl(website.startsWith('http') ? website : `https://${website}`)}
              </a>
            </div>
          )}
          
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>{joinedString}</span>
          </div>
        </div>
        
        {/* Wallet connect buttons */}
        {isCurrentUser && (
          <div className="flex space-x-2 items-center mt-4">
            {!ethereumAddress && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-medium border-gray-300 hover:bg-gray-100"
                onClick={() => handleConnectWallet('ethereum')}
                disabled={isConnectingWallet}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Connect ETH
              </Button>
            )}
            {!solanaAddress && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-medium border-gray-300 hover:bg-gray-100"
                onClick={() => handleConnectWallet('solana')}
                disabled={isConnectingWallet}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Connect SOL
              </Button>
            )}
          </div>
        )}
        
        <div className="flex gap-5 mt-3 mb-4">
          <a href="#" className="text-gray-900 hover:underline">
            <span className="font-bold">{followingCount}</span>{' '}
            <span className="text-gray-500">Following</span>
          </a>
          <a href="#" className="text-gray-900 hover:underline">
            <span className="font-bold">{followersCount}</span>{' '}
            <span className="text-gray-500">Followers</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
