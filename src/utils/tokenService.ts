
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

// Track API rate limiting to avoid excessive retries
const apiFailures = {
  dexTools: {
    failures: 0,
    lastFailure: 0,
    backoffPeriod: 30000, // Initial 30 second backoff
    maxConsecutiveRequests: 2, // Limit concurrent requests to prevent rate limiting
    currentRequests: 0
  }
};

// Reset the backoff period when API starts working again
const resetBackoff = (api: 'dexTools') => {
  apiFailures[api].failures = 0;
  apiFailures[api].backoffPeriod = 30000;
};

// Increase backoff period exponentially
const increaseBackoff = (api: 'dexTools') => {
  apiFailures[api].failures += 1;
  apiFailures[api].lastFailure = Date.now();
  // Exponential backoff with a cap at 5 minutes
  apiFailures[api].backoffPeriod = Math.min(apiFailures[api].backoffPeriod * 2, 5 * 60 * 1000);
  console.warn(`Increasing backoff period for ${api} API to ${apiFailures[api].backoffPeriod}ms after ${apiFailures[api].failures} failures`);
};

// Check if we should skip API calls due to recent failures
const shouldSkipApiCall = (api: 'dexTools'): boolean => {
  const now = Date.now();
  const { failures, lastFailure, backoffPeriod, currentRequests, maxConsecutiveRequests } = apiFailures[api];
  
  // If we're already at the maximum number of concurrent requests
  if (currentRequests >= maxConsecutiveRequests) {
    return true;
  }
  
  // If we have recent failures and we're still in the backoff period
  if (failures > 0 && (now - lastFailure) < backoffPeriod) {
    return true;
  }
  
  // If too many consecutive failures, back off more
  if (failures > 5) {
    return true;
  }
  
  return false;
};

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
    try {
      await setCachedData(
        cacheKey,
        result,
        CACHE_DURATIONS.MEDIUM,
        'solana'
      );
    } catch (cacheError) {
      console.warn(`Error caching token data: ${cacheError}`);
      // Continue despite cache error - we still have the data
    }
    
    // Store in memory cache
    inMemoryCache[memoryCacheKey] = {
      data: result,
      timestamp: now
    };
    
    // In the background, start the enrichment process for more complete data
    // Using a small delay to not block the UI thread
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
    // If we've had multiple API failures, skip enrichment temporarily
    if (shouldSkipApiCall('dexTools')) {
      console.log(`Skipping DexTools enrichment due to recent API failures. Will retry later.`);
      return;
    }

    // Process tokens in smaller batches to avoid overwhelming the API
    const batchSize = 2; // Reduced from 3 to 2 to decrease likelihood of rate limiting
    let enrichedTokens: Token[] = [...basicTokens];
    
    for (let i = 0; i < basicTokens.length; i += batchSize) {
      const batch = basicTokens.slice(i, i + batchSize);
      
      // Process each batch with a delay between batches
      const batchPromises = batch.map(async (token) => {
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
      
      const batchResults = await Promise.all(batchPromises);
      
      // Update our enriched tokens array
      batchResults.forEach((enrichedToken, index) => {
        const originalIndex = i + index;
        if (originalIndex < enrichedTokens.length) {
          enrichedTokens[originalIndex] = enrichedToken;
        }
      });
      
      // Add delay between batches to avoid rate limiting - increased from 1 second to 2 seconds
      if (i + batchSize < basicTokens.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!enrichedTokens.length) return;
    
    // Update caches with enriched data
    const result = { tokens: enrichedTokens, solPrice };
    
    try {
      await setCachedData(cacheKey, result, CACHE_DURATIONS.MEDIUM, 'solana');
    } catch (cacheError) {
      console.warn(`Error updating cache with enriched tokens: ${cacheError}`);
      // Continue despite cache error
    }
    
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
  
  // Check if we should skip API calls due to rate limiting
  if (shouldSkipApiCall('dexTools')) {
    return token;
  }

  try {
    // Increment current requests counter
    apiFailures.dexTools.currentRequests++;

    // We'll try to get both token info and price data, but only use what succeeds
    let tokenInfo: DexToolsTokenInfo | null = null;
    let priceData: DexToolsTokenPrice | null = null;
    
    try {
      // Try to get token metadata from DexTools via Supabase Edge Function
      // This moves the API call to the server to avoid CORS issues
      const { data: infoData, error: infoError } = await supabase.functions.invoke('getDexToolsInfo', {
        body: { tokenAddress, chain: 'solana', type: 'token' }
      });
      
      if (!infoError && infoData && infoData.success) {
        tokenInfo = infoData.data;
      }
    } catch (infoErr) {
      console.warn(`Error fetching DexTools token info: ${infoErr}`);
    }
    
    // Add a small delay between requests to help avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Try to get token price data from DexTools via Supabase Edge Function
      const { data: priceDataResponse, error: priceError } = await supabase.functions.invoke('getDexToolsInfo', {
        body: { tokenAddress, chain: 'solana', type: 'price' }
      });
      
      if (!priceError && priceDataResponse && priceDataResponse.success) {
        priceData = priceDataResponse.data;
      }
    } catch (priceErr) {
      console.warn(`Error fetching DexTools price: ${priceErr}`);
    }
    
    // If either API call succeeds, reset backoff
    if (tokenInfo || priceData) {
      resetBackoff('dexTools');
    } else {
      increaseBackoff('dexTools');
    }
    
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
  } catch (error) {
    // If we get an error, increase backoff period
    increaseBackoff('dexTools');
    return token;
  } finally {
    // Decrement current requests counter
    apiFailures.dexTools.currentRequests--;
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
