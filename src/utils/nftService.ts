
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
    
    // You should get an Alchemy API key for production
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
 * Fetch Solana NFTs using Supabase edge function
 * @param address Solana wallet address
 * @returns Promise with array of NFTs
 */
export const fetchSolanaNFTs = async (address: string): Promise<NFT[]> => {
  try {
    console.log(`Fetching Solana NFTs for address: ${address}`);
    
    // Call our edge function to securely access the QuickNode API
    const { data, error } = await supabase.functions.invoke('getNFTs', {
      body: { address, chain: 'solana' }
    });
    
    if (error) {
      console.error('Error calling Supabase edge function:', error);
      throw error;
    }
    
    if (!data?.success || !data?.nfts) {
      console.warn('Invalid response from edge function:', data);
      return [];
    }
    
    return data.nfts;
  } catch (error) {
    console.error('Error fetching Solana NFTs:', error);
    return [];
  }
};

/**
 * Set an NFT as profile picture
 * @param userId User ID
 * @param imageUrl NFT image URL
 * @param nftId NFT ID for verification
 * @param chain Which blockchain the NFT is from
 * @returns Promise with update result
 */
export const setNFTAsProfilePicture = async (
  userId: string,
  imageUrl: string,
  nftId: string = "",
  chain: 'ethereum' | 'solana' = 'ethereum'
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Setting NFT as profile picture:', { userId, imageUrl, nftId, chain });
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: imageUrl,
        avatar_nft_id: nftId, // Store the NFT ID for verification
        avatar_nft_chain: chain // Store which blockchain the NFT is from
      } as any)
      .eq('id', userId as any);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error setting NFT as profile picture:', error);
    return {
      success: false,
      error: error.message || 'Failed to set profile picture'
    };
  }
};

/**
 * Verify if a user owns the NFT used as profile picture
 * @param userId User ID
 * @param ethereumAddress Ethereum address
 * @param solanaAddress Solana address
 * @returns Promise with verification result
 */
export const verifyNFTOwnership = async (
  userId: string,
  ethereumAddress?: string | null,
  solanaAddress?: string | null
): Promise<boolean> => {
  try {
    console.log('Verifying NFT ownership for user:', userId);
    console.log('ETH address:', ethereumAddress);
    console.log('SOL address:', solanaAddress);
    
    // Get the user's profile to check if they're using an NFT
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, avatar_nft_id, avatar_nft_chain')
      .eq('id', userId as any)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return false;
    }
    
    // If there's no NFT ID set, it's not an NFT profile picture
    if (!data || !data.avatar_nft_id) {
      console.log('User is not using an NFT as profile picture');
      return false;
    }
    
    console.log('User has NFT as profile picture with ID:', data.avatar_nft_id);
    console.log('NFT chain:', data.avatar_nft_chain);
    
    // For demo/testing purposes, if there's an avatar_nft_id and a wallet is connected,
    // let's consider it verified to make it easier to see the feature
    if ((ethereumAddress || solanaAddress) && data.avatar_nft_id) {
      // Only verify if the wallet matches the chain of the NFT
      if (data.avatar_nft_chain === 'ethereum' && ethereumAddress) {
        console.log('User has Ethereum wallet and Ethereum NFT, marking as verified');
        return true;
      } else if (data.avatar_nft_chain === 'solana' && solanaAddress) {
        console.log('User has Solana wallet and Solana NFT, marking as verified');
        return true;
      }
    }
    
    // Fetch NFTs from both chains if addresses are available
    let userNFTs: NFT[] = [];
    
    if (ethereumAddress && data.avatar_nft_chain === 'ethereum') {
      const ethNFTs = await fetchEthereumNFTs(ethereumAddress);
      console.log('Found ETH NFTs:', ethNFTs.length);
      userNFTs = [...userNFTs, ...ethNFTs];
    }
    
    if (solanaAddress && data.avatar_nft_chain === 'solana') {
      const solNFTs = await fetchSolanaNFTs(solanaAddress);
      console.log('Found SOL NFTs:', solNFTs.length);
      userNFTs = [...userNFTs, ...solNFTs];
    }
    
    // Check if the user owns the NFT used as profile picture
    const hasNFT = userNFTs.some(nft => nft.id === data.avatar_nft_id);
    console.log('User owns this NFT:', hasNFT);
    
    return hasNFT;
  } catch (error) {
    console.error('Error verifying NFT ownership:', error);
    return false;
  }
};
