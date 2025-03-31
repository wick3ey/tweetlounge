
import { supabase } from '@/lib/supabase';
import { CACHE_DURATIONS, getCachedData, setCachedData } from '@/utils/cacheService';

// Types for the market data
export interface FinancialInfo {
  circulatingSupply: number | null;
  totalSupply: number;
  mcap: number | null;
  fdv: number;
  holders: number;
  transactions?: number;
}

export interface ApiFinancialResponse {
  statusCode: number;
  data: FinancialInfo;
}

export interface TokenData {
  symbol: string;
  name: string;
  address: string;
  price: number;
  mcap: number;
  variation24h: number;
  rank: number;
  exchange: string;
  pool: string;
  logoUrl: string;
  financialInfo: FinancialInfo | ApiFinancialResponse;
}

export interface HotPool {
  symbol: string;
  name: string;
  tokenAddress: string;
  poolAddress: string;
  mcap: number;
  rank: number;
  exchange: string;
  creationTime: string;
  logoUrl: string;
  financialInfo: FinancialInfo | ApiFinancialResponse;
}

export interface MarketData {
  gainers: TokenData[];
  losers: TokenData[];
  hotPools: HotPool[];
  lastUpdated: string;
}

// Cache key - must match the one used in the Edge Function
const MARKET_DATA_CACHE_KEY = 'market_data_v1';

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

// Helper to extract financial info, handling both formats
export const extractFinancialInfo = (financialInfo: FinancialInfo | ApiFinancialResponse): FinancialInfo => {
  if ('statusCode' in financialInfo && financialInfo.data) {
    return financialInfo.data;
  }
  return financialInfo as FinancialInfo;
};

// Fetch market data from API
export const fetchMarketData = async (): Promise<MarketData> => {
  try {
    // First, try to get cached data
    const cachedData = await getCachedData<MarketData>(MARKET_DATA_CACHE_KEY);
    if (cachedData) {
      console.log('Using cached market data from database');
      return cachedData;
    }

    console.log('Fetching fresh market data from edge function');
    
    // Set timeout for the edge function call
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Edge function timeout')), 12000)
    );
    
    // Call the edge function with a timeout
    const fetchPromise = supabase.functions.invoke('fetchCryptoData', {
      body: JSON.stringify({ cache_key: MARKET_DATA_CACHE_KEY }),
      // Add query string parameter to bust cache
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    // Race the fetch against the timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!result) {
      throw new Error('Edge function timed out');
    }
    
    const { data, error } = result as { data: any, error: any };

    if (error) {
      console.error('Error from edge function:', error);
      throw error;
    }

    if (!data) {
      console.error('No data returned from edge function');
      throw new Error('No data returned from edge function');
    }

    // Handle case where the edge function returned an error object with fallback data
    if (data.error && data.fallbackData) {
      console.warn('Edge function returned error with fallback data:', data.error);
      // Use the fallback data
      const fallbackData = data.fallbackData;
      
      // Add timestamp to fallback data
      fallbackData.lastUpdated = new Date().toISOString();
      
      // Store in local memory cache
      marketDataCache.data = fallbackData as MarketData;
      marketDataCache.timestamp = Date.now();
      marketDataCache.error = data.error;
      
      return fallbackData as MarketData;
    }

    // Store in local memory cache
    marketDataCache.data = data as MarketData;
    marketDataCache.timestamp = Date.now();
    marketDataCache.error = null;

    // Store in database cache
    await setCachedData(MARKET_DATA_CACHE_KEY, data, CACHE_DURATIONS.MEDIUM, 'edge-function');

    return data as MarketData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    marketDataCache.error = error.message;
    
    // Return empty data structure if nothing is available
    const fallbackData = {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
    
    if (marketDataCache.data) {
      console.log('Using memory cached data due to error');
      return marketDataCache.data;
    }
    
    return fallbackData;
  }
};

// Hook for using market data
export const useMarketData = () => {
  const [data, setData] = React.useState<MarketData | null>(marketDataCache.data);
  const [loading, setLoading] = React.useState<boolean>(!marketDataCache.data);
  const [error, setError] = React.useState<string | null>(marketDataCache.error);
  const [retries, setRetries] = React.useState<number>(0);
  const maxRetries = 3;

  const fetchData = React.useCallback(async () => {
    if (marketDataCache.isLoading) {
      return; // Prevent multiple simultaneous fetches
    }
    
    setLoading(true);
    marketDataCache.isLoading = true;
    
    try {
      const freshData = await fetchMarketData();
      setData(freshData);
      setError(null);
      setRetries(0); // Reset retries on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in useMarketData:', errorMessage);
      
      // If we have cached data, use it despite the error
      if (marketDataCache.data) {
        setData(marketDataCache.data);
      }
      
      // Auto-retry with exponential backoff if we don't have data
      if (!marketDataCache.data && retries < maxRetries) {
        const nextRetry = Math.pow(2, retries) * 2000; // 2s, 4s, 8s
        console.log(`Will retry in ${nextRetry}ms (attempt ${retries + 1}/${maxRetries})`);
        
        setTimeout(() => {
          setRetries(r => r + 1);
          fetchData();
        }, nextRetry);
      }
    } finally {
      setLoading(false);
      marketDataCache.isLoading = false;
    }
  }, [retries]);

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
