
import { supabase } from '@/integrations/supabase/client';
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export interface Token {
  name: string;
  symbol: string;
  logo?: string;
  amount: string;
  decimals: number;
  address: string;
  chain: 'ethereum' | 'solana';
  explorerUrl?: string;
}

/**
 * Fetch tokens from a wallet address
 * @param address The wallet address
 * @param chain The blockchain (ethereum or solana)
 * @returns Promise with array of tokens
 */
export const fetchWalletTokens = async (
  address: string,
  chain: 'ethereum' | 'solana'
): Promise<Token[]> => {
  try {
    console.log(`Fetching ${chain} tokens for address: ${address}`);
    
    // For Solana we now use our Supabase edge function
    if (chain === 'solana') {
      try {
        const { data, error } = await supabase.functions.invoke('getMetaplexTokens', {
          body: { address }
        });
        
        if (error) {
          console.error(`Error fetching Solana tokens:`, error);
          throw new Error(`Failed to fetch Solana tokens: ${error.message}`);
        }
        
        // The response should have a tokens array
        if (!data || !data.tokens || !Array.isArray(data.tokens)) {
          console.error(`Invalid response for Solana tokens:`, data);
          return [];
        }
        
        console.log(`Successfully retrieved ${data.tokens.length} Solana tokens`);
        
        // Process tokens and add explorer URL
        return data.tokens.map((token: any) => ({
          ...token,
          chain: 'solana',
          explorerUrl: getExplorerUrl('solana', token.address)
        }));
      } catch (err) {
        console.error('Error fetching Solana tokens:', err);
        return []; // Return empty array on error
      }
    } 
    
    // For Ethereum, we'll keep the mock implementation for now
    else {
      // Mock data for Ethereum tokens
      const mockEthTokens = [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          logo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
          amount: '2.34',
          decimals: 18,
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          chain: 'ethereum' as const,
          explorerUrl: getExplorerUrl('ethereum', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        },
        {
          name: 'Chainlink',
          symbol: 'LINK',
          logo: 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
          amount: '75.32',
          decimals: 18,
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          chain: 'ethereum' as const,
          explorerUrl: getExplorerUrl('ethereum', '0x514910771af9ca656af840dff83e8264ecf986ca')
        },
        {
          name: 'USD Coin',
          symbol: 'USDC',
          logo: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          amount: '250.00',
          decimals: 6,
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chain: 'ethereum' as const,
          explorerUrl: getExplorerUrl('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
        }
      ];
      
      console.log('Ethereum tokens response:', mockEthTokens);
      console.log(`Successfully retrieved ${mockEthTokens.length} Ethereum tokens`);
      return mockEthTokens;
    }
    
  } catch (error) {
    console.error(`Error in fetchWalletTokens for ${chain}:`, error);
    return []; // Return empty array in case of error
  }
};

/**
 * Get explorer URL for a token or address
 * @param chain The blockchain
 * @param address The token or wallet address
 * @returns The explorer URL
 */
const getExplorerUrl = (chain: 'ethereum' | 'solana', address: string): string => {
  if (chain === 'solana') {
    return `https://solscan.io/token/${address}`;
  } else {
    return `https://etherscan.io/token/${address}`;
  }
};
