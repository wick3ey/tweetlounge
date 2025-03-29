
import { supabase } from '@/integrations/supabase/client';

// Types for market data
export interface TokenBasic {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  decimals: number;
  creationTime?: string;
}

export interface TokenPrice {
  price: number;
  price24h: number;
  variation24h: number;
  price7d?: number;
  variation7d?: number;
}

export interface TokenInfo {
  volume24h: number;
  volume7d: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  holders: number;
  transactions24h: number;
}

export interface PoolInfo {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  price: number;
  variation24h: number;
  volume24h: number;
  liquidity: number;
  volumeToLiquidity?: number;
}

/**
 * Fetch recent tokens from Solana
 * @param page Page number
 * @param pageSize Number of tokens per page
 * @returns Promise with token data
 */
export const fetchRecentTokens = async (page = 0, pageSize = 20): Promise<any> => {
  try {
    const now = new Date().toISOString();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'tokens',
        params: {
          sort: 'creationTime',
          order: 'desc',
          from: oneYearAgo.toISOString(),
          to: now,
          page: page.toString(),
          pageSize: pageSize.toString()
        }
      }
    });
    
    if (error) {
      console.error('Error fetching recent tokens:', error);
      throw new Error(`Failed to fetch recent tokens: ${error.message}`);
    }
    
    if (data?.statusCode === 200 && data?.data) {
      console.log('Raw recent tokens data:', data.data);
      // Return the data as is, whether it's an array or an object with tokens array
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchRecentTokens:', error);
    return [];
  }
};

/**
 * Fetch token price data
 * @param tokenAddress Token address
 * @returns Promise with token price data
 */
export const fetchTokenPrice = async (tokenAddress: string): Promise<TokenPrice | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'price',
        tokenAddress
      }
    });
    
    if (error) {
      console.error(`Error fetching price for token ${tokenAddress}:`, error);
      return null;
    }
    
    if (data?.statusCode === 200 && data?.data) {
      return data.data as TokenPrice;
    }
    
    return null;
  } catch (error) {
    console.error(`Error in fetchTokenPrice for ${tokenAddress}:`, error);
    return null;
  }
};

/**
 * Fetch token financial information
 * @param tokenAddress Token address
 * @returns Promise with token info
 */
export const fetchTokenInfo = async (tokenAddress: string): Promise<TokenInfo | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'info',
        tokenAddress
      }
    });
    
    if (error) {
      console.error(`Error fetching info for token ${tokenAddress}:`, error);
      return null;
    }
    
    if (data?.statusCode === 200 && data?.data) {
      return data.data as TokenInfo;
    }
    
    return null;
  } catch (error) {
    console.error(`Error in fetchTokenInfo for ${tokenAddress}:`, error);
    return null;
  }
};

/**
 * Fetch hot pools ranking
 * @returns Promise with hot pools data
 */
export const fetchHotPools = async (): Promise<PoolInfo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'hotpools'
      }
    });
    
    if (error) {
      console.error('Error fetching hot pools:', error);
      throw new Error(`Failed to fetch hot pools: ${error.message}`);
    }
    
    if (data?.statusCode === 200 && data?.data) {
      return data.data as PoolInfo[];
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchHotPools:', error);
    return [];
  }
};

/**
 * Fetch top gainers
 * @param limit Number of tokens to fetch
 * @returns Promise with gainers data
 */
export const fetchGainers = async (limit = 10): Promise<PoolInfo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'gainers',
        params: {
          limit: limit.toString()
        }
      }
    });
    
    if (error) {
      console.error('Error fetching gainers:', error);
      throw new Error(`Failed to fetch gainers: ${error.message}`);
    }
    
    if (data?.statusCode === 200 && data?.data) {
      return data.data as PoolInfo[];
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchGainers:', error);
    return [];
  }
};

/**
 * Fetch top losers
 * @param limit Number of tokens to fetch
 * @returns Promise with losers data
 */
export const fetchLosers = async (limit = 10): Promise<PoolInfo[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'losers',
        params: {
          limit: limit.toString()
        }
      }
    });
    
    if (error) {
      console.error('Error fetching losers:', error);
      throw new Error(`Failed to fetch losers: ${error.message}`);
    }
    
    if (data?.statusCode === 200 && data?.data) {
      return data.data as PoolInfo[];
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchLosers:', error);
    return [];
  }
};

/**
 * Format a number to a human-readable string with appropriate suffix (K, M, B)
 * @param num Number to format
 * @param digits Number of decimal places
 * @returns Formatted string
 */
export const formatNumber = (num: number, digits = 2): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '$0';
  }
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return `$${(num / 1000000000).toFixed(digits)}B`;
  } else if (absNum >= 1000000) {
    return `$${(num / 1000000).toFixed(digits)}M`;
  } else if (absNum >= 1000) {
    return `$${(num / 1000).toFixed(digits)}K`;
  } else {
    return `$${num.toFixed(digits)}`;
  }
};

/**
 * Format a percentage value
 * @param percent Percentage value
 * @returns Formatted percentage string
 */
export const formatPercent = (percent: number): string => {
  if (percent === undefined || percent === null || isNaN(percent)) {
    return '0%';
  }
  
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

/**
 * Check if a percentage is positive
 * @param percent Percentage value
 * @returns Boolean indicating if positive
 */
export const isPositivePercent = (percent: number): boolean => {
  return percent > 0;
};
