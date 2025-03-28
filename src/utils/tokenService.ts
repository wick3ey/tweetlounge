
import { supabase } from '@/integrations/supabase/client';

export interface Token {
  name: string;
  symbol: string;
  logo?: string;
  amount: string;
  decimals: number;
  address: string;
  chain: 'solana';
  explorerUrl?: string;
}

/**
 * Fetch tokens from a Solana wallet address
 * @param address The wallet address
 * @returns Promise with array of tokens
 */
export const fetchWalletTokens = async (
  address: string
): Promise<Token[]> => {
  try {
    console.log(`Fetching Solana tokens for address: ${address}`);
    
    try {
      // Call our Supabase edge function to get tokens with correct metadata
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
      
      // Process tokens and add explorer URL if not present
      return data.tokens.map((token: any) => ({
        ...token,
        chain: 'solana' as const,
        explorerUrl: token.explorerUrl || getExplorerUrl(token.address)
      }));
    } catch (err) {
      console.error('Error fetching Solana tokens:', err);
      return []; // Return empty array on error
    }
  } catch (error) {
    console.error(`Error in fetchWalletTokens:`, error);
    return []; // Return empty array in case of error
  }
};

/**
 * Get explorer URL for a token or address
 * @param address The token or wallet address
 * @returns The explorer URL
 */
const getExplorerUrl = (address: string): string => {
  return `https://solscan.io/token/${address}`;
};
