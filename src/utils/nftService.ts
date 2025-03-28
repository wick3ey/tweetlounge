
// NFT types and service functions
import { supabase } from '@/integrations/supabase/client';

export interface NFT {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  tokenAddress: string;
  tokenId?: string;
  chain: 'ethereum' | 'solana';
}

/**
 * Fetch Ethereum NFTs using Alchemy API
 * @param address Ethereum wallet address
 * @returns Promise with array of NFTs
 */
export const fetchEthereumNFTs = async (address: string): Promise<NFT[]> => {
  try {
    console.log(`Fetching Ethereum NFTs for address: ${address}`);
    
    // Add your Alchemy API key here
    const apiKey = 'demo'; // Replace with actual API key in production
    const baseURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}/getNFTs/`;
    const url = `${baseURL}?owner=${address}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching Ethereum NFTs: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.ownedNfts || !Array.isArray(data.ownedNfts)) {
      console.warn('Invalid response from Alchemy API:', data);
      return [];
    }
    
    return data.ownedNfts.map(nft => ({
      id: `${nft.contract.address}-${nft.id.tokenId}`,
      name: nft.title || 'Unnamed NFT',
      description: nft.description || '',
      imageUrl: nft.media[0]?.raw || 'https://placehold.co/200x200?text=No+Image',
      tokenAddress: nft.contract.address,
      tokenId: nft.id.tokenId,
      chain: 'ethereum'
    }));
  } catch (error) {
    console.error('Error fetching Ethereum NFTs:', error);
    return [];
  }
};

/**
 * Fetch Solana NFTs using QuickNode API
 * @param address Solana wallet address
 * @returns Promise with array of NFTs
 */
export const fetchSolanaNFTs = async (address: string): Promise<NFT[]> => {
  try {
    console.log(`Fetching Solana NFTs for address: ${address}`);
    
    const QUICKNODE_API = 'https://dawn-few-emerald.solana-mainnet.quiknode.pro/090366e8738eb8dd20229127dadeb4e499f6cf5e/';
    
    const response = await fetch(QUICKNODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          limit: 50,
          options: {
            showFungible: false,
            showCollectionMetadata: true
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching Solana NFTs: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.result || !data.result.items || !Array.isArray(data.result.items)) {
      console.error('Invalid response from QuickNode API:', data);
      return [];
    }
    
    // Map QuickNode API response to our NFT interface
    return data.result.items.map((item: any) => {
      const asset = item.asset;
      return {
        id: asset.id,
        name: asset.content?.metadata?.name || 'Unnamed NFT',
        description: asset.content?.metadata?.description,
        imageUrl: asset.content?.links?.image || 'https://placehold.co/200x200?text=No+Image',
        tokenAddress: asset.id,
        chain: 'solana'
      };
    });
  } catch (error) {
    console.error('Error fetching Solana NFTs:', error);
    return [];
  }
};

/**
 * Set an NFT as profile picture
 * @param userId User ID
 * @param imageUrl NFT image URL
 * @returns Promise with update result
 */
export const setNFTAsProfilePicture = async (
  userId: string,
  imageUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: imageUrl })
      .eq('id', userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error setting NFT as profile picture:', error);
    return {
      success: false,
      error: error.message || 'Failed to set NFT as profile picture'
    };
  }
};
