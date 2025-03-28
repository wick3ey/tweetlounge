
import { useState, useEffect } from 'react';
import { NFT, fetchEthereumNFTs, fetchSolanaNFTs, setNFTAsProfilePicture } from '@/utils/nftService';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader, AlertCircle } from 'lucide-react';

interface NFTBrowserProps {
  ethereumAddress?: string | null;
  solanaAddress?: string | null;
  onNFTSelected?: () => void;
}

const NFTBrowser = ({ 
  ethereumAddress, 
  solanaAddress, 
  onNFTSelected 
}: NFTBrowserProps) => {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const { toast } = useToast();
  
  const [ethNFTs, setEthNFTs] = useState<NFT[]>([]);
  const [solNFTs, setSolNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState<{ethereum: boolean, solana: boolean}>({
    ethereum: false,
    solana: false
  });
  const [error, setError] = useState<{ethereum?: string, solana?: string}>({});
  
  // Fetch NFTs when wallet addresses change
  useEffect(() => {
    const fetchNFTs = async () => {
      // Fetch Ethereum NFTs if address exists
      if (ethereumAddress) {
        setLoading(prev => ({ ...prev, ethereum: true }));
        try {
          const nfts = await fetchEthereumNFTs(ethereumAddress);
          setEthNFTs(nfts);
          setError(prev => ({ ...prev, ethereum: undefined }));
        } catch (err) {
          console.error('Error fetching Ethereum NFTs:', err);
          setError(prev => ({ ...prev, ethereum: 'Failed to load Ethereum NFTs' }));
        } finally {
          setLoading(prev => ({ ...prev, ethereum: false }));
        }
      }
      
      // Fetch Solana NFTs if address exists
      if (solanaAddress) {
        setLoading(prev => ({ ...prev, solana: true }));
        try {
          const nfts = await fetchSolanaNFTs(solanaAddress);
          setSolNFTs(nfts);
          setError(prev => ({ ...prev, solana: undefined }));
        } catch (err) {
          console.error('Error fetching Solana NFTs:', err);
          setError(prev => ({ ...prev, solana: 'Failed to load Solana NFTs' }));
        } finally {
          setLoading(prev => ({ ...prev, solana: false }));
        }
      }
    };
    
    fetchNFTs();
  }, [ethereumAddress, solanaAddress]);
  
  const handleSelectNFT = async (nft: NFT) => {
    if (!user) return;
    
    try {
      const result = await setNFTAsProfilePicture(user.id, nft.imageUrl, nft.id);
      
      if (result.success) {
        toast({
          title: 'Profile Picture Updated',
          description: `Your profile picture has been set to ${nft.name}`,
        });
        
        // Refresh profile data to show new avatar
        await refreshProfile();
        
        if (onNFTSelected) {
          onNFTSelected();
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile picture',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error setting NFT as profile picture:', err);
      toast({
        title: 'Error',
        description: 'Failed to set NFT as profile picture',
        variant: 'destructive',
      });
    }
  };
  
  const renderNFTGrid = (nfts: NFT[], isLoading: boolean, errorMessage?: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader className="h-8 w-8 animate-spin text-twitter-blue" />
        </div>
      );
    }
    
    if (errorMessage) {
      return (
        <div className="flex items-center justify-center p-6 text-red-500">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span>{errorMessage}</span>
        </div>
      );
    }
    
    if (nfts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No NFTs found in this wallet
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {nfts.map(nft => (
          <div key={nft.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-square overflow-hidden">
              <img 
                src={nft.imageUrl} 
                alt={nft.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Error';
                }}
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{nft.name}</h3>
              <Button 
                onClick={() => handleSelectNFT(nft)} 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
              >
                Use as Profile Picture
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="border rounded-md">
      <h2 className="text-xl font-semibold px-4 pt-4">Choose NFT as Profile Picture</h2>
      <p className="text-gray-500 text-sm px-4 pb-4">Select one of your NFTs to use as your profile picture</p>
      
      <Tabs defaultValue={ethereumAddress ? "ethereum" : "solana"}>
        <TabsList className="w-full">
          <TabsTrigger 
            value="ethereum" 
            disabled={!ethereumAddress}
            className="flex-1"
          >
            Ethereum NFTs
          </TabsTrigger>
          <TabsTrigger 
            value="solana" 
            disabled={!solanaAddress}
            className="flex-1"
          >
            Solana NFTs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ethereum" className="min-h-[200px]">
          {ethereumAddress ? (
            renderNFTGrid(ethNFTs, loading.ethereum, error.ethereum)
          ) : (
            <div className="text-center py-8 text-gray-500">
              Connect your Ethereum wallet to view your NFTs
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="solana" className="min-h-[200px]">
          {solanaAddress ? (
            renderNFTGrid(solNFTs, loading.solana, error.solana)
          ) : (
            <div className="text-center py-8 text-gray-500">
              Connect your Solana wallet to view your NFTs
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NFTBrowser;
