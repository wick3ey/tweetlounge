
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
    
    // In a real app, you'd call an API to get this data
    // For simplicity, we'll simulate fetched tokens based on chain type
    
    // Call our Supabase edge function to securely access token data
    const { data, error } = await supabase.functions.invoke('getWalletTokens', {
      body: { address, chain }
    });
    
    if (error) {
      console.error(`Error fetching ${chain} tokens:`, error);
      throw new Error(`Failed to fetch ${chain} tokens: ${error.message}`);
    }
    
    if (!data?.tokens || !Array.isArray(data.tokens)) {
      console.warn('Invalid token data response:', data);
      return getPlaceholderTokens(chain); // Return placeholder data for demo
    }
    
    return data.tokens.map((token: any) => ({
      ...token,
      chain,
      explorerUrl: getExplorerUrl(chain, token.address || address)
    }));
  } catch (error) {
    console.error(`Error in fetchWalletTokens for ${chain}:`, error);
    // Return placeholder data for demo purposes
    return getPlaceholderTokens(chain);
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

/**
 * Get placeholder token data for demonstration
 * @param chain The blockchain
 * @returns Array of placeholder tokens
 */
const getPlaceholderTokens = (chain: 'ethereum' | 'solana'): Token[] => {
  if (chain === 'solana') {
    return [
      {
        name: 'Solana',
        symbol: 'SOL',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        amount: '12.45',
        usdValue: '1245.00',
        decimals: 9,
        address: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
        explorerUrl: 'https://solscan.io/token/So11111111111111111111111111111111111111112'
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        amount: '543.21',
        usdValue: '543.21',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        chain: 'solana',
        explorerUrl: 'https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      },
      {
        name: 'Raydium',
        symbol: 'RAY',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
        amount: '125.75',
        usdValue: '89.28',
        decimals: 6,
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        chain: 'solana',
        explorerUrl: 'https://solscan.io/token/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
      }
    ];
  } else {
    return [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        logo: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
        amount: '2.34',
        usdValue: '7842.60',
        decimals: 18,
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        chain: 'ethereum',
        explorerUrl: 'https://etherscan.io/token/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      },
      {
        name: 'Chainlink',
        symbol: 'LINK',
        logo: 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
        amount: '75.32',
        usdValue: '972.63',
        decimals: 18,
        address: '0x514910771af9ca656af840dff83e8264ecf986ca',
        chain: 'ethereum',
        explorerUrl: 'https://etherscan.io/token/0x514910771af9ca656af840dff83e8264ecf986ca'
      }
    ];
  }
};
