
import { supabase } from '@/integrations/supabase/client';

export interface Token {
  name: string;
  symbol: string;
  logo?: string;
  amount: string;
  usdValue?: string;
  decimals: number;
  address: string;
  chain: 'solana';
  explorerUrl?: string;
  dexScreenerUrl?: string;
}

export interface TokensResponse {
  tokens: Token[];
  solPrice?: number;
}

/**
 * Fetch tokens from a wallet address
 * @param address The wallet address
 * @returns Promise with array of tokens and SOL price
 */
export const fetchWalletTokens = async (
  address: string
): Promise<TokensResponse> => {
  try {
    console.log(`Fetching Solana tokens for address: ${address}`);
    
    // Call our Supabase edge function to securely access token data
    const { data, error } = await supabase.functions.invoke('getWalletTokens', {
      body: { address, chain: 'solana' }
    });
    
    if (error) {
      console.error(`Error fetching Solana tokens:`, error);
      throw new Error(`Failed to fetch Solana tokens: ${error.message}`);
    }
    
    // The response should have a tokens array
    if (!data) {
      console.error(`No data returned for Solana tokens`);
      return { tokens: [] };
    }
    
    console.log(`Solana tokens raw response:`, data);
    
    if (!data.tokens || !Array.isArray(data.tokens)) {
      console.error(`Invalid token data response structure for Solana:`, data);
      return { tokens: [] };
    }
    
    // Process the tokens
    const processedTokens = data.tokens.map((token: any) => {
      // Function to format token name for unknown tokens
      const formatTokenName = (tokenAddress: string) => {
        if (token.name && token.name !== 'UNKNOWN') return token.name;
        
        // Truncate address: first 4 and last 5 characters
        return tokenAddress ? 
          `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-5)}` : 
          'Unknown';
      };

      const tokenAddress = token.address || address;
      const formattedName = formatTokenName(tokenAddress);
      
      return {
        ...token,
        name: formattedName,
        symbol: token.symbol !== 'UNKNOWN' ? token.symbol : formattedName,
        chain: 'solana',
        explorerUrl: getExplorerUrl(tokenAddress),
        dexScreenerUrl: getDexScreenerUrl(tokenAddress)
      };
    });
    
    console.log(`Successfully processed ${processedTokens.length} Solana tokens`);
    return { 
      tokens: processedTokens,
      solPrice: data.solPrice 
    };
    
  } catch (error) {
    console.error(`Error in fetchWalletTokens for Solana:`, error);
    return { tokens: [] }; // Return empty array in case of error
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

/**
 * Get DexScreener URL for a token
 * @param address The token address
 * @returns The DexScreener URL
 */
const getDexScreenerUrl = (address: string): string => {
  return `https://dexscreener.com/solana/${address}`;
};
