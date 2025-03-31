
import { supabase } from '@/lib/supabase';
import { CACHE_DURATIONS, getCachedData, setCachedData } from '@/utils/cacheService';
import { cacheTokenLogo } from '@/services/storageService';

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

// Process logos from market data
const processLogos = async (marketData: MarketData) => {
  console.log('Processing logos from market data...');
  
  try {
    // Process in batches to avoid overwhelming the system
    const processTokenBatch = async (tokens: Array<TokenData | HotPool>) => {
      for (const token of tokens) {
        if (token.logoUrl && token.symbol) {
          try {
            await cacheTokenLogo(token.symbol, token.logoUrl);
          } catch (err) {
            console.warn(`Failed to cache logo for ${token.symbol}:`, err);
          }
        }
      }
    };
    
    // Process gainers
    if (marketData.gainers && marketData.gainers.length > 0) {
      await processTokenBatch(marketData.gainers);
    }
    
    // Process losers
    if (marketData.losers && marketData.losers.length > 0) {
      await processTokenBatch(marketData.losers);
    }
    
    // Process hot pools
    if (marketData.hotPools && marketData.hotPools.length > 0) {
      await processTokenBatch(marketData.hotPools);
    }
    
    console.log('Market logo processing complete');
  } catch (error) {
    console.error('Error processing market logos:', error);
  }
};

// Fetch market data from API
export const fetchMarketData = async (): Promise<MarketData> => {
  try {
    // First, try to get cached data
    const cachedData = await getCachedData<MarketData>(MARKET_DATA_CACHE_KEY);
    if (cachedData) {
      console.log('Using cached market data from database');
      
      // Process logos from cached data in the background
      processLogos(cachedData).catch(err => {
        console.warn('Background logo processing failed:', err);
      });
      
      return cachedData;
    }

    console.log('Fetching fresh market data from edge function');
    const { data, error } = await supabase.functions.invoke('fetchCryptoData', {
      body: JSON.stringify({ cache_key: MARKET_DATA_CACHE_KEY })
    });

    if (error) {
      console.error('Error from edge function:', error);
      throw error;
    }

    if (!data) {
      console.error('No data returned from edge function');
      throw new Error('No data returned from edge function');
    }

    // Store in local memory cache as well
    marketDataCache.data = data as MarketData;
    marketDataCache.timestamp = Date.now();
    marketDataCache.error = null;

    // Process logos from new data in the background
    processLogos(data as MarketData).catch(err => {
      console.warn('Background logo processing failed for new data:', err);
    });

    // Data from the Edge Function is already cached in the database
    return data as MarketData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    marketDataCache.error = error.message;
    
    // Return empty data structure if nothing is available
    return {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
  }
};

// Hook for using market data
export const useMarketData = () => {
  const [data, setData] = React.useState<MarketData | null>(marketDataCache.data);
  const [loading, setLoading] = React.useState<boolean>(!marketDataCache.data);
  const [error, setError] = React.useState<string | null>(marketDataCache.error);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in useMarketData:', errorMessage);
    } finally {
      setLoading(false);
      marketDataCache.isLoading = false;
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
