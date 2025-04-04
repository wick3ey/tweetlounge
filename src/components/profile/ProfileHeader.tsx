import { useState, useEffect } from 'react';
import { CalendarDays, LinkIcon, MapPin, Wallet, Check, Users, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistance } from 'date-fns';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { connectEthereumWallet, connectSolanaWallet, updateWalletAddress } from '@/utils/walletConnector';
import { useToast } from '@/components/ui/use-toast';
import { NFT, fetchEthereumNFTs, fetchSolanaNFTs, setNFTAsProfilePicture } from '@/utils/nftService';
import { CryptoButton } from '@/components/ui/crypto-button';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, getFollowers, getFollowing } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import FollowersList from '@/components/profile/FollowersList';
import { fetchWalletTokens } from '@/utils/tokenService';

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
  onAvatarClick?: () => void;
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
  onAvatarClick,
  isFollowing = false,
  isNFTVerified = false
}: ProfileHeaderProps) => {
  const [following, setFollowing] = useState(isFollowing);
  const [followersCountState, setFollowersCountState] = useState(followersCount);
  const [followingCountState, setFollowingCountState] = useState(followingCount);
  const { toast } = useToast();
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const { user } = useAuth();
  const [isCheckingFollowStatus, setIsCheckingFollowStatus] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!userId || !user || isCurrentUser) return;
      
      try {
        setIsCheckingFollowStatus(true);
        const followStatus = await checkIsFollowing(userId);
        setFollowing(followStatus);
      } catch (error) {
        console.error("Error checking follow status:", error);
      } finally {
        setIsCheckingFollowStatus(false);
      }
    };
    
    checkFollowStatus();
  }, [userId, user, isCurrentUser]);

  useEffect(() => {
    setFollowersCountState(followersCount);
    setFollowingCountState(followingCount);
  }, [followersCount, followingCount]);

  const handleFollowClick = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }
    
    if (isCurrentUser) return;
    
    setIsUpdatingFollow(true);
    
    try {
      if (following) {
        const success = await unfollowUser(userId);
        if (success) {
          setFollowing(false);
          setFollowersCountState(prev => Math.max(0, prev - 1));
          toast({
            title: "Unfollowed",
            description: `You are no longer following ${displayName}`,
          });
        }
      } 
      else {
        const success = await followUser(userId);
        if (success) {
          setFollowing(true);
          setFollowersCountState(prev => prev + 1);
          toast({
            title: "Following",
            description: `You are now following ${displayName}`,
          });
        }
      }
      
      if (onFollow) onFollow();
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast({
        title: "Action Failed",
        description: "Could not update follow status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingFollow(false);
    }
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

  const getDomainFromUrl = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

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
          
          const nfts = type === 'ethereum' 
            ? await fetchEthereumNFTs(result.address)
            : await fetchSolanaNFTs(result.address);
          
          if (nfts.length > 0) {
            toast({
              title: "NFTs found",
              description: `Found ${nfts.length} NFTs in your wallet. You can set one as your profile picture.`,
            });
          }
          
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

  const fetchFollowers = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingFollowers(true);
      const data = await getFollowers(userId);
      setFollowers(data);
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast({
        title: "Error",
        description: "Failed to load followers",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const fetchFollowing = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingFollowing(true);
      const data = await getFollowing(userId);
      setFollowingUsers(data);
    } catch (error) {
      console.error("Error fetching following:", error);
      toast({
        title: "Error",
        description: "Failed to load following",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  const handleShowFollowers = async () => {
    await fetchFollowers();
    setShowFollowersDialog(true);
  };

  const handleShowFollowing = async () => {
    await fetchFollowing();
    setShowFollowingDialog(true);
  };

  const hasWallet = !!ethereumAddress || !!solanaAddress;

  const solscanLink = solanaAddress ? `https://solscan.io/address/${solanaAddress}` : null;

  useEffect(() => {
    const fetchBalance = async () => {
      if (!solanaAddress) return;
      
      try {
        setIsLoadingBalance(true);
        const result = await fetchWalletTokens(solanaAddress);
        
        if (result && result.tokens) {
          let totalUsdValue = 0;
          result.tokens.forEach(token => {
            if (token.usdValue) {
              totalUsdValue += parseFloat(token.usdValue);
            }
          });
          
          setWalletBalance(totalUsdValue.toFixed(2));
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    };
    
    fetchBalance();
  }, [solanaAddress]);

  return (
    <div className="border-b border-crypto-gray pb-0">
      <AspectRatio ratio={3/1} className="bg-crypto-darkgray">
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
          <div className="h-full w-full bg-crypto-darkgray" />
        )}
      </AspectRatio>
      
      <div className="relative px-4">
        <div className="absolute -top-16">
          <div className="relative">
            <Avatar 
              className="h-32 w-32 border-4 border-crypto-black cursor-pointer"
              onClick={onAvatarClick}
            >
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-crypto-blue text-white text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            {isCurrentUser && hasWallet && (
              <CryptoButton 
                onClick={onOpenNFTBrowser}
                variant="outline" 
                size="sm"
                className="absolute bottom-0 right-0 rounded-full bg-crypto-darkgray border-crypto-gray text-crypto-text shadow-md"
                title="Set NFT as profile picture"
              >
                NFT
              </CryptoButton>
            )}
          </div>
        </div>
      </div>
      
      <div className="pt-2 px-4 flex justify-end">
        {isCurrentUser ? (
          <div className="flex space-x-3">
            <CryptoButton 
              variant="outline" 
              className="rounded-full font-semibold border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text" 
              onClick={onEditProfile}
            >
              Edit profile
            </CryptoButton>
          </div>
        ) : (
          <CryptoButton 
            variant={following ? "outline" : "default"}
            className={`rounded-full font-semibold ${following ? 'hover:bg-crypto-red/10 hover:text-crypto-red hover:border-crypto-red/20 border-crypto-gray text-crypto-text' : 'bg-crypto-blue hover:bg-crypto-darkblue text-white'}`}
            onClick={handleFollowClick}
            disabled={isCheckingFollowStatus || isUpdatingFollow}
          >
            {isUpdatingFollow ? 
              (following ? 'Unfollowing...' : 'Following...') : 
              (following ? 'Following' : 'Follow')}
          </CryptoButton>
        )}
      </div>
      
      <div className="px-4 mt-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-crypto-text">{displayName}</h1>

          {isNFTVerified && (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="inline-flex items-center">
                  <div className="bg-crypto-blue rounded-full p-0.5 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-crypto-text stroke-[3]" />
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-sm bg-crypto-darkgray border-crypto-gray text-crypto-text">
                <p className="font-semibold">Verified NFT Owner</p>
                <p className="text-crypto-lightgray mt-1">
                  This profile is using an NFT as their profile picture that they verifiably own. 
                  The blue checkmark confirms ownership of this digital asset on the blockchain.
                </p>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
        <h2 className="text-crypto-lightgray">@{username}</h2>
        
        <div className="mt-3 text-crypto-text">
          {bio && <p className="mb-2">{bio}</p>}
          
          {solanaAddress && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-1 text-crypto-green" />
                <span className="text-crypto-green font-semibold">
                  {isLoadingBalance ? 'Loading balance...' : walletBalance ? `$${walletBalance} USD` : 'Balance unavailable'}
                </span>
              </div>
              
              <div className="inline-flex rounded-md px-2.5 py-1 text-xs bg-crypto-darkgray border border-crypto-gray">
                <div className="flex items-center space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-crypto-green"></div>
                  <span className="text-crypto-lightgray">Connected Phantom wallet</span>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-crypto-blue">
                <Wallet className="h-4 w-4 mr-1" />
                <a 
                  href={solscanLink || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View on Solscan
                </a>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center text-crypto-lightgray mt-3 text-sm gap-4">
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
                className="text-crypto-blue hover:underline"
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
        
        {isCurrentUser && (
          <div className="flex space-x-2 items-center mt-4">
            {!ethereumAddress && (
              <CryptoButton
                variant="outline"
                size="sm"
                className="rounded-full font-medium border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text"
                onClick={() => handleConnectWallet('ethereum')}
                disabled={isConnectingWallet}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Connect ETH
              </CryptoButton>
            )}
            {!solanaAddress && (
              <CryptoButton
                variant="outline"
                size="sm"
                className="rounded-full font-medium border-crypto-gray hover:bg-crypto-gray/20 text-crypto-text"
                onClick={() => handleConnectWallet('solana')}
                disabled={isConnectingWallet}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Connect SOL
              </CryptoButton>
            )}
          </div>
        )}
        
        <div className="flex gap-5 mt-3 mb-4">
          <button 
            onClick={handleShowFollowing}
            className="text-crypto-text hover:underline flex items-center"
          >
            <span className="font-bold">{followingCountState}</span>{' '}
            <span className="text-crypto-lightgray ml-1">Following</span>
          </button>
          <button 
            onClick={handleShowFollowers}
            className="text-crypto-text hover:underline flex items-center"
          >
            <span className="font-bold">{followersCountState}</span>{' '}
            <span className="text-crypto-lightgray ml-1">Followers</span>
          </button>
        </div>
      </div>

      <Dialog open={showFollowersDialog} onOpenChange={setShowFollowersDialog}>
        <DialogContent className="sm:max-w-md bg-crypto-darkgray border-crypto-gray">
          <DialogHeader>
            <DialogTitle className="text-crypto-blue flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Followers
            </DialogTitle>
          </DialogHeader>
          <FollowersList 
            profiles={followers} 
            isLoading={isLoadingFollowers} 
            currentUserId={user?.id}
            onFollowChange={fetchFollowers}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowingDialog} onOpenChange={setShowFollowingDialog}>
        <DialogContent className="sm:max-w-md bg-crypto-darkgray border-crypto-gray">
          <DialogHeader>
            <DialogTitle className="text-crypto-blue flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Following
            </DialogTitle>
          </DialogHeader>
          <FollowersList 
            profiles={followingUsers} 
            isLoading={isLoadingFollowing} 
            currentUserId={user?.id}
            onFollowChange={fetchFollowing}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileHeader;
