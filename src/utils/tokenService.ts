
import { supabase } from '@/integrations/supabase/client';
import { getCachedData, setCachedData, CACHE_DURATIONS } from './cacheService';

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

// Cache key prefix for wallet tokens
const WALLET_TOKENS_CACHE_KEY_PREFIX = 'wallet_tokens_';

// In-memory cache for faster repeat access
const inMemoryCache: Record<string, { data: TokensResponse, timestamp: number }> = {};
const MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    
    // Check in-memory cache first for fastest possible response
    const memoryCacheKey = `${WALLET_TOKENS_CACHE_KEY_PREFIX}${address}`;
    const now = Date.now();
    
    if (inMemoryCache[memoryCacheKey] && 
        (now - inMemoryCache[memoryCacheKey].timestamp) < MEMORY_CACHE_DURATION) {
      console.log(`Using in-memory cached wallet tokens for address: ${address}`);
      return inMemoryCache[memoryCacheKey].data;
    }
    
    // Then check persistent cache
    const cacheKey = `${WALLET_TOKENS_CACHE_KEY_PREFIX}${address}`;
    const cachedData = await getCachedData<TokensResponse>(cacheKey);
    
    if (cachedData && cachedData.tokens.length > 0) {
      console.log(`Using cached wallet tokens for address: ${address}`);
      
      // Store in memory cache for future use
      inMemoryCache[memoryCacheKey] = {
        data: cachedData,
        timestamp: now
      };
      
      return cachedData;
    }
    
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
    
    if (!data.tokens || !Array.isArray(data.tokens)) {
      console.error(`Invalid token data response structure for Solana:`, data);
      return { tokens: [] };
    }
    
    // For initial fast loading, let's create a simplified version first without full DexTools enrichment
    const basicProcessedTokens = data.tokens.map((token: any) => {
      const tokenAddress = token.address || address;
      const formattedName = formatTokenName(tokenAddress, token.name);
      
      return {
        name: formattedName,
        symbol: token.symbol !== 'UNKNOWN' ? token.symbol : formattedName,
        logo: token.logo,
        logoURI: token.logo,
        amount: token.amount,
        usdValue: token.usdValue,
        decimals: token.decimals,
        address: tokenAddress,
        chain: 'solana' as const,
        explorerUrl: getExplorerUrl(tokenAddress),
        dexScreenerUrl: getDexScreenerUrl(tokenAddress),
        priceChange24h: token.priceChange24h || 0
      };
    });
    
    const result = { 
      tokens: basicProcessedTokens,
      solPrice: data.solPrice 
    };
    
    // Cache the basic processed tokens data
    await setCachedData(
      cacheKey,
      result,
      CACHE_DURATIONS.MEDIUM,
      'solana'
    );
    
    // Store in memory cache
    inMemoryCache[memoryCacheKey] = {
      data: result,
      timestamp: now
    };
    
    // In the background, start the enrichment process for more complete data
    setTimeout(() => {
      enrichTokensInBackground(basicProcessedTokens, data.solPrice, cacheKey, memoryCacheKey);
    }, 100);
    
    return result;
    
  } catch (error) {
    console.error(`Error in fetchWalletTokens for Solana:`, error);
    return { tokens: [] }; // Return empty array in case of error
  }
};

/**
 * Enrich tokens in the background without blocking the UI
 */
const enrichTokensInBackground = async (
  basicTokens: Token[], 
  solPrice: number | undefined, 
  cacheKey: string,
  memoryCacheKey: string
) => {
  try {
    const enrichedTokensPromises = basicTokens.map(async (token) => {
      try {
        // Skip extra API calls for SOL
        if (token.symbol === 'SOL' && token.name === 'Solana') {
          return token;
        }
        
        // Try to enrich with DexTools data
        const enrichedToken = await enrichTokenWithDexToolsInfo(token);
        return enrichedToken;
      } catch (error) {
        console.warn(`Error enriching token ${token.address}:`, error);
        return token; // Keep original on error
      }
    });
    
    const enrichedTokens = await Promise.all(enrichedTokensPromises);
    
    // Update caches with enriched data
    const result = { tokens: enrichedTokens, solPrice };
    
    await setCachedData(cacheKey, result, CACHE_DURATIONS.MEDIUM, 'solana');
    
    inMemoryCache[memoryCacheKey] = {
      data: result,
      timestamp: Date.now()
    };
    
    console.log('Background token enrichment complete');
  } catch (error) {
    console.error('Error in background token enrichment:', error);
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
const enrichTokenWithDexToolsInfo = async (token: Token): Promise<Token> => {
  const tokenAddress = token.address;
  
  // Skip API calls for known tokens like SOL that we already have good data for
  if (token.symbol === 'SOL' && token.name === 'Solana' && token.logo) {
    return token;
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
    ...token,
    name: tokenInfo?.name || token.name,
    symbol: tokenInfo?.symbol || token.symbol,
    logo: tokenInfo?.logo || token.logo,
    logoURI: tokenInfo?.logo || token.logoURI,
    usdValue: usdValue,
    decimals: tokenInfo?.decimals || token.decimals,
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
