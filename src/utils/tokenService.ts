
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
  logoURI?: string; // Added for compatibility
  priceChange24h?: number; // Added for price change percentage
}

export interface TokensResponse {
  tokens: Token[];
  solPrice?: number;
}

interface DexToolsTokenInfo {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  description?: string;
  decimals: number;
  socialInfo?: {
    [key: string]: string;
  };
  creationTime?: string;
  creationBlock?: number;
}

interface DexToolsTokenPrice {
  price: number;
  variation24h: number;
  price24h: number;
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
    
    // Process the tokens with enhanced information from DexTools API
    const processedTokensPromises = data.tokens.map(async (token: any) => {
      const tokenAddress = token.address || address;
      
      try {
        // Try to fetch additional token information from DexTools API
        const enrichedToken = await enrichTokenWithDexToolsInfo(token);
        return enrichedToken;
      } catch (error) {
        console.warn(`Could not fetch DexTools data for token ${tokenAddress}:`, error);
        
        // Fallback to basic formatting if DexTools API fails
        const formattedName = formatTokenName(tokenAddress, token.name);
        
        return {
          ...token,
          name: formattedName,
          symbol: token.symbol !== 'UNKNOWN' ? token.symbol : formattedName,
          chain: 'solana',
          explorerUrl: getExplorerUrl(tokenAddress),
          dexScreenerUrl: getDexScreenerUrl(tokenAddress),
          logoURI: token.logo, // Map logo to logoURI for compatibility
          priceChange24h: token.priceChange24h || 0 // Default to 0 if not provided
        };
      }
    });
    
    const processedTokens = await Promise.all(processedTokensPromises);
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
 * Function to format token name for unknown tokens
 */
const formatTokenName = (tokenAddress: string, name?: string): string => {
  if (name && name !== 'UNKNOWN') return name;
  
  // Truncate address: first 4 and last 5 characters
  return tokenAddress ? 
    `${tokenAddress.slice(0, 4)}...${tokenAddress.slice(-5)}` : 
    'Unknown';
};

/**
 * Enrich token with data from DexTools API
 */
const enrichTokenWithDexToolsInfo = async (token: any): Promise<Token> => {
  const tokenAddress = token.address;
  
  // Skip API calls for known tokens like SOL that we already have good data for
  if (token.symbol === 'SOL' && token.name === 'Solana' && token.logo) {
    return {
      ...token,
      chain: 'solana',
      explorerUrl: getExplorerUrl(tokenAddress),
      dexScreenerUrl: getDexScreenerUrl(tokenAddress),
      logoURI: token.logo,
      priceChange24h: token.priceChange24h || 0
    };
  }
  
  // Get token metadata from DexTools
  const tokenInfo = await fetchDexToolsTokenInfo(tokenAddress);
  
  // Get token price data from DexTools
  const priceData = await fetchDexToolsTokenPrice(tokenAddress);
  
  // Calculate USD value based on token amount and price
  let usdValue: string | undefined = token.usdValue;
  if (priceData && priceData.price) {
    const amount = parseFloat(token.amount);
    // Ensure we have a valid number for the calculation
    if (!isNaN(amount)) {
      usdValue = (amount * priceData.price).toFixed(2);
    }
  }
  
  return {
    name: tokenInfo?.name || formatTokenName(tokenAddress, token.name),
    symbol: tokenInfo?.symbol || (token.symbol !== 'UNKNOWN' ? token.symbol : formatTokenName(tokenAddress, token.name)),
    logo: tokenInfo?.logo || token.logo,
    logoURI: tokenInfo?.logo || token.logo,
    amount: token.amount,
    usdValue: usdValue,
    decimals: tokenInfo?.decimals || token.decimals,
    address: tokenAddress,
    chain: 'solana',
    explorerUrl: getExplorerUrl(tokenAddress),
    dexScreenerUrl: getDexScreenerUrl(tokenAddress),
    priceChange24h: priceData?.variation24h || token.priceChange24h || 0
  };
};

/**
 * Fetch token info from DexTools API
 */
const fetchDexToolsTokenInfo = async (tokenAddress: string): Promise<DexToolsTokenInfo | null> => {
  try {
    console.log(`Fetching DexTools info for token: ${tokenAddress}`);
    const response = await fetch(`https://public-api.dextools.io/trial/v2/token/solana/${tokenAddress}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': 'XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd'
      }
    });
    
    if (!response.ok) {
      console.warn(`DexTools API returned status ${response.status} for token ${tokenAddress}`);
      return null;
    }
    
    const result = await response.json();
    if (result.statusCode === 200 && result.data) {
      console.log(`Successfully fetched DexTools token info for ${tokenAddress}`);
      return result.data;
    }
    
    return null;
  } catch (error) {
    console.warn(`Error fetching DexTools token info for ${tokenAddress}:`, error);
    return null;
  }
};

/**
 * Fetch token price from DexTools API
 */
const fetchDexToolsTokenPrice = async (tokenAddress: string): Promise<DexToolsTokenPrice | null> => {
  try {
    console.log(`Fetching DexTools price for token: ${tokenAddress}`);
    const response = await fetch(`https://public-api.dextools.io/trial/v2/token/solana/${tokenAddress}/price`, {
      method: 'GET',
      headers: {
        'X-API-KEY': 'XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd'
      }
    });
    
    if (!response.ok) {
      console.warn(`DexTools API returned status ${response.status} for token price ${tokenAddress}`);
      return null;
    }
    
    const result = await response.json();
    if (result.statusCode === 200 && result.data) {
      console.log(`Successfully fetched DexTools price info for ${tokenAddress}`);
      return result.data;
    }
    
    return null;
  } catch (error) {
    console.warn(`Error fetching DexTools price for ${tokenAddress}:`, error);
    return null;
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
