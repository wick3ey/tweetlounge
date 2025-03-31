
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

// In-memory cache with optimized structure
let marketDataCache: {
  data: MarketData | null;
  timestamp: number;
  isLoading: boolean;
  error: string | null;
  version: number; // Used to track cache freshness
} = {
  data: null,
  timestamp: 0,
  isLoading: false,
  error: null,
  version: 0
};

// Fallback data structure - created once to avoid memory allocation
const FALLBACK_DATA: MarketData = {
  gainers: [],
  losers: [],
  hotPools: [],
  lastUpdated: new Date().toISOString()
};

// Helper to extract financial info, handling both formats
export const extractFinancialInfo = (financialInfo: FinancialInfo | ApiFinancialResponse): FinancialInfo => {
  if ('statusCode' in financialInfo && financialInfo.data) {
    return financialInfo.data;
  }
  return financialInfo as FinancialInfo;
};

// Fetch market data from API with improved error handling and performance
export const fetchMarketData = async (forceRefresh = false): Promise<MarketData> => {
  try {
    // Don't fetch again if we have fresh data (less than 30 seconds old) unless forced
    if (
      !forceRefresh && 
      marketDataCache.data && 
      Date.now() - marketDataCache.timestamp < 30000
    ) {
      console.log('Using in-memory market data cache');
      return marketDataCache.data;
    }
    
    // Prevent concurrent fetches
    if (marketDataCache.isLoading) {
      console.log('Market data fetch already in progress, waiting...');
      // Wait for the current fetch to complete
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!marketDataCache.isLoading) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
      
      // Return the result of the concurrent fetch if successful
      if (marketDataCache.data) {
        return marketDataCache.data;
      }
    }
    
    marketDataCache.isLoading = true;
    const cacheVersion = ++marketDataCache.version;
    
    try {
      // If not forced refresh, first try to get cached data
      if (!forceRefresh) {
        const cachedData = await getCachedData<MarketData>(MARKET_DATA_CACHE_KEY);
        if (cachedData) {
          console.log('Using cached market data from database');
          // Only update cache if this is still the most recent request
          if (cacheVersion === marketDataCache.version) {
            marketDataCache.data = cachedData;
            marketDataCache.timestamp = Date.now();
            marketDataCache.error = null;
            marketDataCache.isLoading = false;
          }
          return cachedData;
        }
      }

      console.log('Fetching fresh market data from edge function');
      
      // Set shorter timeout for the edge function call
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Edge function timeout')), 6000) // Shorter timeout (6s)
      );
      
      // Call the edge function with a timeout
      const fetchPromise = supabase.functions.invoke('fetchCryptoData', {
        body: JSON.stringify({ 
          cache_key: MARKET_DATA_CACHE_KEY,
          trigger: forceRefresh ? 'manual' : 'initial' 
        }),
        // Add cache buster
        headers: { 
          'Cache-Control': 'no-cache', 
          'X-Request-Time': Date.now().toString() 
        }
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
        
        // Only update cache if this is still the most recent request
        if (cacheVersion === marketDataCache.version) {
          // Store in local memory cache
          marketDataCache.data = fallbackData as MarketData;
          marketDataCache.timestamp = Date.now();
          marketDataCache.error = data.error;
          marketDataCache.isLoading = false;
        }
        
        return fallbackData as MarketData;
      }

      // Only update cache if this is still the most recent request
      if (cacheVersion === marketDataCache.version) {
        // Store in local memory cache
        marketDataCache.data = data as MarketData;
        marketDataCache.timestamp = Date.now();
        marketDataCache.error = null;
        marketDataCache.isLoading = false;
      }

      // Store in database cache
      await setCachedData(MARKET_DATA_CACHE_KEY, data, CACHE_DURATIONS.MEDIUM, 'edge-function');

      return data as MarketData;
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Only update cache if this is still the most recent request
      if (cacheVersion === marketDataCache.version) {
        marketDataCache.error = error.message;
        marketDataCache.isLoading = false;
      }
      
      // Try to get expired cached data as a last resort
      try {
        const { data: expiredCache } = await supabase
          .from('market_cache')
          .select('data')
          .eq('cache_key', MARKET_DATA_CACHE_KEY)
          .single();
          
        if (expiredCache && expiredCache.data) {
          console.log('Using expired cached data due to error');
          return expiredCache.data as MarketData;
        }
      } catch (cacheError) {
        console.error('Failed to retrieve expired cache:', cacheError);
      }
      
      // Return in-memory cache if available
      if (marketDataCache.data) {
        console.log('Using memory cached data due to error');
        return marketDataCache.data;
      }
      
      // Last resort fallback
      return { ...FALLBACK_DATA, lastUpdated: new Date().toISOString() };
    }
  } catch (outerError) {
    console.error('Outer error in fetchMarketData:', outerError);
    marketDataCache.isLoading = false;
    
    // Return in-memory cache as fallback if available
    if (marketDataCache.data) {
      return marketDataCache.data;
    }
    
    // Last resort fallback
    return { ...FALLBACK_DATA, lastUpdated: new Date().toISOString() };
  }
};

import React, { useState, useCallback, useEffect } from 'react';

// Optimized hook for using market data
export const useMarketData = () => {
  const [data, setData] = useState<MarketData | null>(marketDataCache.data);
  const [loading, setLoading] = useState<boolean>(!marketDataCache.data);
  const [error, setError] = useState<string | null>(marketDataCache.error);
  const [retries, setRetries] = useState<number>(0);
  const maxRetries = 2;

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (marketDataCache.isLoading && !forceRefresh) {
      return; // Prevent multiple simultaneous fetches
    }
    
    setLoading(true);
    
    try {
      const freshData = await fetchMarketData(forceRefresh);
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
        const nextRetry = Math.pow(1.5, retries) * 2000; // 2s, 3s, 4.5s
        console.log(`Will retry in ${nextRetry}ms (attempt ${retries + 1}/${maxRetries})`);
        
        setTimeout(() => {
          setRetries(r => r + 1);
          fetchData();
        }, nextRetry);
      }
    } finally {
      setLoading(false);
    }
  }, [retries]);

  // Initial load and refresh on interval
  useEffect(() => {
    fetchData();
    
    // More responsive refresh - shorter interval (3 min instead of 5)
    const intervalId = setInterval(() => fetchData(), 3 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    marketData: data,
    loading,
    error,
    refreshData: useCallback(() => fetchData(true), [fetchData])
  };
};
