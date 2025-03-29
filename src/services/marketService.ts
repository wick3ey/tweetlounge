
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
