
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
            
            {/* Wallet badge for Ethereum */}
            {ethereumAddress && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg width="14" height="22" viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 0L0 11.1935L7 8.11613V0Z" fill="#8A92B2"/>
                    <path d="M7 8.11621L0 11.1935L7 15.3226V8.11621Z" fill="#62688F"/>
                    <path d="M14 11.1935L7 0V8.11613L14 11.1935Z" fill="#62688F"/>
                    <path d="M7 15.3226L14 11.1935L7 8.11621V15.3226Z" fill="#454A75"/>
                    <path d="M0 12.5162L7 22.0001V16.6453L0 12.5162Z" fill="#8A92B2"/>
                    <path d="M7 16.6453V22.0001L14 12.5162L7 16.6453Z" fill="#62688F"/>
                  </svg>
                </div>
              </div>
            )}
            
            {/* Wallet badge for Solana */}
            {!ethereumAddress && solanaAddress && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.8254 12.3363C19.7332 12.2068 19.5952 12.125 19.4572 12.125H1.14999C0.932058 12.125 0.776053 12.3226 0.776053 12.5409C0.776053 12.6022 0.794114 12.6636 0.821205 12.7249L1.7523 14.9863C1.86353 15.2181 2.09146 15.375 2.33747 15.375H18.0245C18.2705 15.375 18.4895 15.2181 18.6097 14.9863L19.5408 12.7249C19.6159 12.559 19.5679 12.3704 19.3839 12.25M14.9641 10.5H18.6007C18.8187 10.5 18.9747 10.3023 18.9747 10.0841C18.9747 10.0227 18.9566 9.96136 18.9295 9.9L17.9984 7.63864C17.8872 7.40682 17.6593 7.25 17.4133 7.25H13.3138C13.0958 7.25 12.9398 7.44773 12.9398 7.66591C12.9398 7.72727 12.9579 7.78864 12.985 7.85L13.9161 10.1114C14.0273 10.3432 14.2642 10.5 14.5012 10.5H14.9641ZM0.803144 9.9C0.728022 10.0295 0.776053 10.1932 0.866244 10.3136C0.958396 10.434 1.09637 10.5 1.23434 10.5H8.76568C9.01169 10.5 9.23962 10.3432 9.35085 10.1114L10.282 7.85C10.357 7.68409 10.3091 7.49545 10.1252 7.375C10.053 7.29545 9.95088 7.25 9.83966 7.25H2.58667C2.34066 7.25 2.12177 7.40682 2.00151 7.63864L0.803144 9.9ZM10.1252 1.625C10.053 1.54545 9.95088 1.5 9.83966 1.5H2.58667C2.34066 1.5 2.12177 1.65682 2.00151 1.88864L0.803144 4.15C0.728022 4.27955 0.776053 4.44318 0.866244 4.56364C0.958396 4.68409 1.09637 4.75 1.23434 4.75H8.76568C9.01169 4.75 9.23962 4.59318 9.35085 4.36136L10.282 2.1C10.357 1.93409 10.3091 1.74545 10.1252 1.625ZM17.4133 1.5H13.3138C13.0958 1.5 12.9398 1.69773 12.9398 1.91591C12.9398 1.97727 12.9579 2.03864 12.985 2.1L13.9161 4.36136C14.0273 4.59318 14.2642 4.75 14.5012 4.75H18.6007C18.8187 4.75 18.9747 4.55227 18.9747 4.33409C18.9747 4.27273 18.9566 4.21136 18.9295 4.15L17.9984 1.88864C17.8872 1.65682 17.6593 1.5 17.4133 1.5Z" fill="#9945FF"/>
                  </svg>
                </div>
              </div>
            )}
            
            {/* NFT button for current user */}
            {isCurrentUser && hasWallet && (
              <Button 
                onClick={onOpenNFTBrowser}
                variant="outline" 
                size="sm"
                className="absolute bottom-8 right-0 rounded-full bg-white shadow-md"
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

          {/* Verified NFT badge - made more visible with red background */}
          {isNFTVerified && (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="inline-flex items-center">
                  <Badge className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </Badge>
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

          {/* Wallet badge */}
          {hasWallet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Wallet className="h-4 w-4 text-blue-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Crypto wallet connected</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        
        {/* Wallet connect buttons moved to a separate section right above the following/followers count */}
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
            {ethereumAddress && (
              <div className="flex items-center text-xs bg-gray-100 rounded-full px-3 py-1">
                <Wallet className="h-3 w-3 mr-1 text-blue-500" />
                <span className="truncate max-w-[120px]">ETH: {ethereumAddress.substring(0, 6)}...{ethereumAddress.substring(ethereumAddress.length - 4)}</span>
              </div>
            )}
            {solanaAddress && (
              <div className="flex items-center text-xs bg-gray-100 rounded-full px-3 py-1">
                <Wallet className="h-3 w-3 mr-1 text-purple-500" />
                <span className="truncate max-w-[120px]">SOL: {solanaAddress.substring(0, 6)}...{solanaAddress.substring(solanaAddress.length - 4)}</span>
              </div>
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
