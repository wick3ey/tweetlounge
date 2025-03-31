
import { CACHE_DURATIONS, getCachedData, setCachedData } from "@/utils/cacheService";

// Types for the market data
export interface TokenData {
  symbol: string;
  name: string;
  address: string;
  price: number;
  variation24h: number;
  rank: number;
  exchange: string;
  pool: string;
  logoUrl: string;
}

export interface HotPool {
  symbol: string;
  name: string;
  tokenAddress: string;
  poolAddress: string;
  rank: number;
  exchange: string;
  creationTime: string;
  logoUrl: string;
}

export interface MarketData {
  gainers: TokenData[];
  losers: TokenData[];
  hotPools: HotPool[];
  lastUpdated: string;
}

// Cache key
const MARKET_DATA_CACHE_KEY = 'market_data';

// In-memory cache
let marketDataCache: {
  data: MarketData | null;
  timestamp: number;
  isLoading: boolean;
  error: string | null;
} = {
  data: null,
  timestamp: 0,
  isLoading: false,
  error: null
};

// Fetch market data from API
export const fetchMarketData = async (): Promise<MarketData> => {
  if (marketDataCache.isLoading) {
    console.log('Market data is already being fetched, waiting...');
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!marketDataCache.isLoading) {
          clearInterval(checkInterval);
          if (marketDataCache.error) {
            reject(new Error(marketDataCache.error));
          } else if (marketDataCache.data) {
            resolve(marketDataCache.data);
          } else {
            reject(new Error('No market data available'));
          }
        }
      }, 100);
    });
  }

  marketDataCache.isLoading = true;
  marketDataCache.error = null;

  try {
    // First try to get data from database cache
    const cachedData = await getCachedData<MarketData>(MARKET_DATA_CACHE_KEY);
    if (cachedData) {
      console.log('Using cached market data');
      marketDataCache.data = cachedData;
      marketDataCache.timestamp = Date.now();
      return cachedData;
    }

    console.log('Fetching fresh market data from API');
    const response = await fetch('https://f3oci3ty.xyz/api/crypto');
    
    if (!response.ok) {
      throw new Error(`API response error: ${response.status} ${response.statusText}`);
    }

    const data: MarketData = await response.json();
    
    // Cache the data
    await setCachedData(MARKET_DATA_CACHE_KEY, data, CACHE_DURATIONS.SHORT);
    
    marketDataCache.data = data;
    marketDataCache.timestamp = Date.now();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching market data:', errorMessage);
    marketDataCache.error = errorMessage;
    
    if (marketDataCache.data) {
      return marketDataCache.data;
    }
    
    // Return empty data structure if nothing is available
    return {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
  } finally {
    marketDataCache.isLoading = false;
  }
};

// Hook for using market data
export const useMarketData = () => {
  const [data, setData] = React.useState<MarketData | null>(marketDataCache.data);
  const [loading, setLoading] = React.useState<boolean>(!marketDataCache.data);
  const [error, setError] = React.useState<string | null>(marketDataCache.error);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const freshData = await fetchMarketData();
      setData(freshData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    marketData: data,
    loading,
    error,
    refreshData: fetchData
  };
};

import React from 'react';
