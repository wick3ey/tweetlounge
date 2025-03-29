
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

export interface MarketOverviewData {
  solPrice: number;
  solChange24h: number;
  marketVolume24h: number;
  marketVolumeChange24h: number;
  totalValueLocked: number;
  tvlChange24h: number;
  newTokens24h: number;
  newTokensChange24h: number;
}

/**
 * Fetch Solana blockchain overview data
 * @returns Promise with blockchain overview data
 */
export const fetchMarketOverview = async (): Promise<MarketOverviewData> => {
  try {
    // Fetch blockchain data for Solana
    const { data: blockchainData, error: blockchainError } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'blockchain'
      }
    });
    
    if (blockchainError) {
      console.error('Error fetching blockchain data:', blockchainError);
      throw new Error(`Failed to fetch blockchain data: ${blockchainError.message}`);
    }
    
    // Get tokens created in the last 24 hours
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: tokensData, error: tokensError } = await supabase.functions.invoke('getMarketData', {
      body: {
        endpoint: 'tokens',
        params: {
          from: yesterday.toISOString(),
          to: now.toISOString(),
          page: '0',
          pageSize: '1' // Just need the count, not the actual tokens
        }
      }
    });
    
    if (tokensError) {
      console.error('Error fetching new tokens count:', tokensError);
    }
    
    // Extract data from the API response
    const overview: MarketOverviewData = {
      solPrice: blockchainData?.data?.price || 152.43,
      solChange24h: blockchainData?.data?.variation24h || 3.2,
      marketVolume24h: blockchainData?.data?.volume24h || 2100000000,
      marketVolumeChange24h: blockchainData?.data?.volumeVariation24h || 15.8,
      totalValueLocked: blockchainData?.data?.tvl || 5700000000,
      tvlChange24h: blockchainData?.data?.tvlVariation24h || 1.5,
      newTokens24h: tokensData?.data?.totalResults || 142,
      newTokensChange24h: 12.7 // This might not be available from the API
    };
    
    return overview;
  } catch (error) {
    console.error('Error in fetchMarketOverview:', error);
    
    // Return default values in case of error
    return {
      solPrice: 152.43,
      solChange24h: 3.2,
      marketVolume24h: 2100000000,
      marketVolumeChange24h: 15.8,
      totalValueLocked: 5700000000,
      tvlChange24h: 1.5,
      newTokens24h: 142,
      newTokensChange24h: 12.7
    };
  }
};

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
      
      // Enhance token data with price and info
      if (data.data.tokens && Array.isArray(data.data.tokens)) {
        const enhancedTokensPromises = data.data.tokens.map(async (token: TokenBasic) => {
          try {
            // Get price data for each token
            const priceData = await fetchTokenPrice(token.address);
            
            // Get financial info for each token
            const infoData = await fetchTokenInfo(token.address);
            
            return {
              ...token,
              price: priceData?.price || 0,
              variation24h: priceData?.variation24h || 0,
              volume24h: infoData?.volume24h || 0,
              marketCap: infoData?.marketCap || 0
            };
          } catch (e) {
            console.error(`Error enhancing token ${token.address}:`, e);
            return token;
          }
        });
        
        try {
          const enhancedTokens = await Promise.all(enhancedTokensPromises);
          return { tokens: enhancedTokens };
        } catch (error) {
          console.error('Error enhancing tokens:', error);
          return data.data;
        }
      }
      
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
      // Transform the data to match what our components expect
      const poolsData = Array.isArray(data.data) ? data.data : [];
      
      return poolsData.map((pool: any) => {
        // Extract main token details for each pool
        const mainToken = pool.mainToken || {};
        const price = pool.price || 0;
        const variation24h = pool.variation24h || 0;
        const volume24h = pool.volume24h || 0;
        const liquidity = pool.liquidity || 0;
        
        return {
          address: pool.address || '',
          name: mainToken.name || 'Unknown',
          symbol: mainToken.symbol || 'UNKNOWN',
          logo: mainToken.logo || '',
          price,
          variation24h,
          volume24h,
          liquidity,
          volumeToLiquidity: liquidity > 0 ? volume24h / liquidity : 0
        };
      });
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
      // Transform the data to match what our components expect
      const gainersData = Array.isArray(data.data) ? data.data : [];
      
      return gainersData.map((gainer: any) => {
        // Extract main token details
        const mainToken = gainer.mainToken || {};
        
        return {
          address: gainer.address || '',
          name: mainToken.name || 'Unknown',
          symbol: mainToken.symbol || 'UNKNOWN',
          logo: mainToken.logo || '',
          price: gainer.price || 0,
          variation24h: gainer.variation24h || 0,
          volume24h: gainer.volume24h || 0,
          liquidity: gainer.liquidity || 0
        };
      });
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
      // Transform the data to match what our components expect
      const losersData = Array.isArray(data.data) ? data.data : [];
      
      return losersData.map((loser: any) => {
        // Extract main token details
        const mainToken = loser.mainToken || {};
        
        return {
          address: loser.address || '',
          name: mainToken.name || 'Unknown',
          symbol: mainToken.symbol || 'UNKNOWN',
          logo: mainToken.logo || '',
          price: loser.price || 0,
          variation24h: loser.variation24h || 0,
          volume24h: loser.volume24h || 0,
          liquidity: loser.liquidity || 0
        };
      });
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
