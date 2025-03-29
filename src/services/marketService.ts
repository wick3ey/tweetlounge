
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

// Create a client-side cache for token metadata
const TOKEN_METADATA_CACHE: {[key: string]: {data: TokenInfo | null, timestamp: number}} = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const FAILED_REQUESTS: {[key: string]: {count: number, lastAttempt: number}} = {};
const RETRY_AFTER = 5 * 60 * 1000; // 5 minutes

// Primary function to fetch Solana chain information
export const fetchSolanaStats = async (): Promise<SolanaMarketStats | null> => {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getSolanaStats', {});
    
    if (error) {
      console.error('Error fetching Solana stats:', error);
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
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTopTokens', {
      body: { chain: 'solana' }
    });
    
    if (error) {
      console.error('Error fetching top tokens:', error);
      return null;
    }
    
    // Fix for data structure - ensure we correctly process the nested response
    if (data && typeof data === 'object') {
      // Check if data has the expected structure with gainers and losers properties
      if (data.gainers && data.losers) {
        return data as TopTokensData;
      }
      
      // Handle the case where gainers/losers are nested under statusCode/data
      if (data.gainers?.data && data.losers?.data) {
        return {
          gainers: Array.isArray(data.gainers.data) ? data.gainers.data : [],
          losers: Array.isArray(data.losers.data) ? data.losers.data : []
        };
      }
    }
    
    console.error('Unexpected data format for top tokens:', data);
    return null;
  } catch (error) {
    console.error('Error in fetchTopTokens:', error);
    return null;
  }
};

// Function to fetch hot pools
export const fetchHotPools = async (): Promise<HotPoolsData | null> => {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getHotPools', {
      body: { chain: 'solana' }
    });
    
    if (error) {
      console.error('Error fetching hot pools:', error);
      return null;
    }
    
    // Fix for data structure - ensure we correctly process the nested response
    if (data && typeof data === 'object') {
      // Check if data has the hotPools property directly
      if (Array.isArray(data.hotPools)) {
        return { hotPools: data.hotPools };
      }
      
      // Handle the case where hotPools is nested under hotPools.data
      if (data.hotPools?.data && Array.isArray(data.hotPools.data)) {
        return { hotPools: data.hotPools.data };
      }
    }
    
    console.error('Unexpected data format for hot pools:', data);
    return null;
  } catch (error) {
    console.error('Error in fetchHotPools:', error);
    return null;
  }
};

// Function to fetch token details by address
export const fetchTokenDetails = async (address: string): Promise<TokenInfo | null> => {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTokenDetails', {
      body: { chain: 'solana', address }
    });
    
    if (error) {
      console.error(`Error fetching token details for ${address}:`, error);
      return null;
    }
    
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
    
    // Check if we have a valid cached response
    const cachedData = TOKEN_METADATA_CACHE[address];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }
    
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getTokenMetadata', {
      body: { chain: 'solana', address }
    });
    
    if (error) {
      console.error(`Error fetching token metadata for ${address}:`, error);
      
      // Track failed requests
      if (!FAILED_REQUESTS[address]) {
        FAILED_REQUESTS[address] = { count: 0, lastAttempt: 0 };
      }
      FAILED_REQUESTS[address].count++;
      FAILED_REQUESTS[address].lastAttempt = Date.now();
      
      // Return cached data even if expired
      if (cachedData) {
        return cachedData.data;
      }
      
      return null;
    }
    
    // Reset failure count on successful request
    if (FAILED_REQUESTS[address]) {
      delete FAILED_REQUESTS[address];
    }
    
    // Process and cache the data
    let tokenData: TokenInfo | null = null;
    
    // Check if the data has a nested structure
    if (data && data.data) {
      tokenData = data.data as TokenInfo;
    } else {
      tokenData = data as TokenInfo;
    }
    
    // Update cache
    TOKEN_METADATA_CACHE[address] = {
      data: tokenData,
      timestamp: Date.now()
    };
    
    return tokenData;
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
    
    return null;
  }
};

// Function to fetch recent tokens
export const fetchRecentTokens = async (limit: number = 10): Promise<TokenInfo[]> => {
  try {
    // Call Supabase function to securely access the DEXTools API
    const { data, error } = await supabase.functions.invoke('getRecentTokens', {
      body: { chain: 'solana', limit }
    });
    
    if (error) {
      console.error('Error fetching recent tokens:', error);
      return [];
    }
    
    return data as TokenInfo[];
  } catch (error) {
    console.error('Error in fetchRecentTokens:', error);
    return [];
  }
};
