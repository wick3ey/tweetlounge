
import { supabase } from "@/integrations/supabase/client";

// Basic types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  decimals?: number;
  creationTime?: string;
  creationBlock?: number;
  socialInfo?: {
    [key: string]: string;
  };
}

export interface PoolInfo {
  address: string;
  exchangeName: string;
  exchangeFactory: string;
  creationTime: string;
  mainToken: TokenInfo;
  sideToken: TokenInfo;
  fee: number;
  price?: number;
  price24h?: number;
  variation24h?: number;
  volume24h?: number;
  liquidity?: number;
  rank?: number;
}

export interface SolanaMarketStats {
  name: string;
  id: string;
  website: string;
  exchangeCount: number;
  tvl: number;
  tokenCount: number;
  poolCount: number;
}

export interface TopTokensData {
  gainers: PoolInfo[];
  losers: PoolInfo[];
}

export interface HotPoolsData {
  hotPools: PoolInfo[];
}

// Create a client-side cache for token metadata to reduce redundant requests
const TOKEN_METADATA_CACHE: {[key: string]: {data: TokenInfo | null, timestamp: number}} = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const FAILED_REQUESTS: {[key: string]: {count: number, lastAttempt: number}} = {};
const RETRY_AFTER = 5 * 60 * 1000; // 5 minutes

// Central function to call our cached market data endpoint
async function fetchCachedMarketData(
  endpoint: string,
  chain: string = 'solana',
  params: Record<string, string> = {},
  expirationMinutes: number = 30
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('getCachedMarketData', {
      body: {
        endpoint,
        chain,
        params,
        expirationMinutes
      }
    });
    
    if (error) {
      console.error(`Error fetching cached market data for ${endpoint}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error in fetchCachedMarketData for ${endpoint}:`, error);
    return null;
  }
}

// Primary function to fetch Solana chain information
export const fetchSolanaStats = async (): Promise<SolanaMarketStats | null> => {
  try {
    const data = await fetchCachedMarketData('blockchain', 'solana', {}, 60); // Cache for 1 hour
    
    if (!data) {
      console.error('No data returned from cached market data endpoint');
      return null;
    }
    
    return data as SolanaMarketStats;
  } catch (error) {
    console.error('Error in fetchSolanaStats:', error);
    return null;
  }
};

// Function to fetch top gainers and losers
export const fetchTopTokens = async (): Promise<TopTokensData | null> => {
  try {
    // Fetch gainers and losers in parallel
    const [gainers, losers] = await Promise.all([
      fetchCachedMarketData('ranking/gainers', 'solana', {}, 10), // Cache for 10 minutes
      fetchCachedMarketData('ranking/losers', 'solana', {}, 10)   // Cache for 10 minutes
    ]);
    
    return {
      gainers: Array.isArray(gainers) ? gainers : [],
      losers: Array.isArray(losers) ? losers : []
    };
  } catch (error) {
    console.error('Error in fetchTopTokens:', error);
    return null;
  }
};

// Function to fetch hot pools
export const fetchHotPools = async (): Promise<HotPoolsData | null> => {
  try {
    // Call the getHotPools edge function directly instead of going through getCachedMarketData
    const { data, error } = await supabase.functions.invoke('getHotPools', {
      body: { chain: 'solana' }
    });
    
    if (error) {
      console.error('Error fetching hot pools:', error);
      return null;
    }
    
    if (!data || !data.hotPools) {
      console.error('No hot pools data returned or invalid format');
      return null;
    }
    
    return data as HotPoolsData;
  } catch (error) {
    console.error('Error in fetchHotPools:', error);
    return null;
  }
};

// Function to fetch token details by address
export const fetchTokenDetails = async (address: string): Promise<TokenInfo | null> => {
  try {
    if (!address) {
      console.error('Token address is required for fetchTokenDetails');
      return null;
    }
    
    const data = await fetchCachedMarketData('token', 'solana', { address }, 60); // Cache for 1 hour
    
    return data as TokenInfo;
  } catch (error) {
    console.error(`Error in fetchTokenDetails for ${address}:`, error);
    return null;
  }
};

// Function to fetch token metadata with improved caching and error handling
export const fetchTokenMetadata = async (address: string): Promise<TokenInfo | null> => {
  try {
    // Check if we recently failed to fetch this token and should wait before retrying
    const failedRequest = FAILED_REQUESTS[address];
    if (failedRequest) {
      const now = Date.now();
      if (now - failedRequest.lastAttempt < RETRY_AFTER && failedRequest.count > 2) {
        console.log(`Skipping request for ${address} due to previous failures, will retry later`);
        return null;
      }
    }
    
    // Check if we have a valid cached response in memory
    const cachedData = TOKEN_METADATA_CACHE[address];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }
    
    // If not in memory cache, get from database cache via our edge function
    try {
      const { data, error } = await supabase.functions.invoke('getTokenMetadata', {
        body: { chain: 'solana', address }
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.statusCode === 200 && data.data) {
        // Update in-memory cache
        TOKEN_METADATA_CACHE[address] = {
          data: data.data,
          timestamp: Date.now()
        };
        
        // Reset failure count on successful request
        if (FAILED_REQUESTS[address]) {
          delete FAILED_REQUESTS[address];
        }
        
        return data.data;
      }
      
      // Handle case where data exists but isn't properly formatted
      throw new Error('Invalid data format returned from token metadata');
    } catch (error) {
      console.error(`Error fetching token metadata for ${address}:`, error);
      
      // Track failed requests
      if (!FAILED_REQUESTS[address]) {
        FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
      }
      FAILED_REQUESTS[address].count++;
      FAILED_REQUESTS[address].lastAttempt = Date.now();
      
      // Return cached data even if expired as fallback
      if (cachedData) {
        return cachedData.data;
      }
      
      // Create a minimum metadata object as last resort
      return {
        address,
        name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
        symbol: address.substring(0, 6).toUpperCase(),
      };
    }
  } catch (error) {
    console.error(`Error in fetchTokenMetadata for ${address}:`, error);
    
    // Track failed requests
    if (!FAILED_REQUESTS[address]) {
      FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
    }
    FAILED_REQUESTS[address].count++;
    FAILED_REQUESTS[address].lastAttempt = Date.now();
    
    // Return cached data even if expired as fallback
    const cachedData = TOKEN_METADATA_CACHE[address];
    if (cachedData) {
      return cachedData.data;
    }
    
    // Return minimal token info if all else fails
    return {
      address,
      name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
      symbol: address.substring(0, 6).toUpperCase(),
    };
  }
};

// Function to fetch recent tokens
export const fetchRecentTokens = async (limit: number = 10): Promise<TokenInfo[]> => {
  try {
    // Get cached recent tokens data
    const data = await fetchCachedMarketData(
      'token/recent', 
      'solana', 
      { page: '0', pageSize: limit.toString() },
      15 // Cache for 15 minutes
    );
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid or missing data from recent tokens endpoint');
      return [];
    }
    
    return data as TokenInfo[];
  } catch (error) {
    console.error('Error in fetchRecentTokens:', error);
    return [];
  }
};
