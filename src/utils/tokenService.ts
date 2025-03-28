import { supabase } from '@/integrations/supabase/client';

export interface Token {
  name: string;
  symbol: string;
  logo?: string;
  amount: string;
  usdValue?: string;
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
    
    // Call our Supabase edge function to securely access token data
    const { data, error } = await supabase.functions.invoke('getWalletTokens', {
      body: { address, chain }
    });
    
    if (error) {
      console.error(`Error fetching ${chain} tokens:`, error);
      throw new Error(`Failed to fetch ${chain} tokens: ${error.message}`);
    }
    
    // The response should have a tokens array
    if (!data) {
      console.error(`No data returned for ${chain} tokens`);
      return [];
    }
    
    console.log(`${chain} tokens raw response:`, data);
    
    if (!data.tokens || !Array.isArray(data.tokens)) {
      console.error(`Invalid token data response structure for ${chain}:`, data);
      return [];
    }
    
    // Process the tokens
    const processedTokens = data.tokens.map((token: any) => {
      // Function to truncate address for unknown tokens
      const formatTokenName = (tokenAddress: string) => {
        if (token.name && token.name !== 'UNKNOWN') return token.name;
        
        // Truncate address: first 4 and last 5 characters
        return tokenAddress ? 
          `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-5)}` : 
          'Unknown Token';
      };

      return {
        ...token,
        name: formatTokenName(token.address || address),
        chain,
        explorerUrl: getExplorerUrl(chain, token.address || address)
      };
    });
    
    console.log(`Successfully processed ${processedTokens.length} ${chain} tokens`);
    return processedTokens;
    
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
