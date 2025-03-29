
import { useEffect, useState } from 'react';
import { getCachedData, setCachedData, CACHE_DURATIONS } from './cacheService';

// Interface for the cryptocurrency data
export interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

// Interface for market statistics data
export interface MarketStats {
  total_market_cap: number;
  total_volume: number;
  btc_dominance: number;
  eth_dominance: number;
  active_cryptocurrencies: number;
  market_cap_change_percentage_24h: number;
  fear_greed_value?: number;
  fear_greed_label?: string;
}

// Cache keys
const CACHE_KEYS = {
  CRYPTO_DATA: 'crypto_data',
  MARKET_STATS: 'market_stats'
};

// Shared global cache objects - these will be shared across all component instances
const globalCryptoCache = {
  data: [] as CryptoCurrency[],
  timestamp: 0,
  isLoading: false,
  lastError: null as string | null
};

const globalStatsCache = {
  data: null as MarketStats | null,
  timestamp: 0,
  isLoading: false,
  lastError: null as string | null
};

// Memory cache duration in milliseconds (5 minutes for in-memory cache)
const MEMORY_CACHE_DURATION = 5 * 60 * 1000;
// Minimum time between API refresh attempts (1 minute) to prevent API spam
const MIN_REFRESH_INTERVAL = 60 * 1000;

// Fallback data to use when the API fails
const getFallbackCryptoData = (): CryptoCurrency[] => {
  const fallbackData: CryptoCurrency[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 62364, change: -1.67 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3015, change: -3.04 },
    { id: 'tether', name: 'Tether', symbol: 'USDT', price: 0.999, change: 0.02 },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: 600, change: -3.62 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 124, change: -3.28 },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 0.52, change: -2.90 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.44, change: -3.91 },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.12, change: -6.48 },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7.5, change: -4.2 },
    { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: 0.00002, change: -5.3 }
  ];
  return fallbackData;
};

// Fallback market stats
const getFallbackMarketStats = (): MarketStats => {
  return {
    total_market_cap: 2821150162185,
    total_volume: 110950262631,
    btc_dominance: 58.86,
    eth_dominance: 8.00,
    active_cryptocurrencies: 17159,
    market_cap_change_percentage_24h: -5.83,
    fear_greed_value: 50,
    fear_greed_label: 'Neutral'
  };
};

// Function to fetch crypto data from the Supabase cache
const fetchCryptoData = async (): Promise<CryptoCurrency[]> => {
  // Check if data is already being fetched by another component
  if (globalCryptoCache.isLoading) {
    console.log('Another component is already fetching crypto data, waiting...');
    // Wait for the existing request to complete
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!globalCryptoCache.isLoading) {
          clearInterval(checkInterval);
          if (globalCryptoCache.lastError) {
            reject(new Error(globalCryptoCache.lastError));
          } else {
            resolve(globalCryptoCache.data);
          }
        }
      }, 100);
    });
  }
  
  // Set loading flag to prevent duplicate requests
  globalCryptoCache.isLoading = true;
  globalCryptoCache.lastError = null;
  
  try {
    // Check database cache
    const cachedData = await getCachedData<CryptoCurrency[]>(CACHE_KEYS.CRYPTO_DATA);
    if (cachedData && cachedData.length > 0) {
      console.log('Using database cached crypto data');
      globalCryptoCache.data = cachedData;
      globalCryptoCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.warn('No cached crypto data available, using fallback data');
    const fallbackData = getFallbackCryptoData();
    globalCryptoCache.data = fallbackData;
    globalCryptoCache.timestamp = Date.now();
    return fallbackData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in fetchCryptoData:', errorMessage);
    globalCryptoCache.lastError = errorMessage;
    
    // Return fallback data if we have no valid data
    const fallbackData = getFallbackCryptoData();
    globalCryptoCache.data = fallbackData;
    return fallbackData;
  } finally {
    // Reset loading flag
    globalCryptoCache.isLoading = false;
  }
};

// Function to fetch market stats from the Supabase cache
const fetchMarketStats = async (): Promise<MarketStats> => {
  // Check if data is already being fetched by another component
  if (globalStatsCache.isLoading) {
    console.log('Another component is already fetching market stats, waiting...');
    // Wait for the existing request to complete
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!globalStatsCache.isLoading) {
          clearInterval(checkInterval);
          if (globalStatsCache.lastError) {
            reject(new Error(globalStatsCache.lastError));
          } else if (globalStatsCache.data) {
            resolve(globalStatsCache.data);
          } else {
            reject(new Error('No market stats data available'));
          }
        }
      }, 100);
    });
  }
  
  // Set loading flag to prevent duplicate requests
  globalStatsCache.isLoading = true;
  globalStatsCache.lastError = null;
  
  try {
    // Check database cache
    const cachedData = await getCachedData<MarketStats>(CACHE_KEYS.MARKET_STATS);
    if (cachedData) {
      console.log('Using database cached market stats data');
      globalStatsCache.data = cachedData;
      globalStatsCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.warn('No cached market stats available, using fallback data');
    const fallbackStats = getFallbackMarketStats();
    globalStatsCache.data = fallbackStats;
    globalStatsCache.timestamp = Date.now();
    return fallbackStats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in fetchMarketStats:', errorMessage);
    globalStatsCache.lastError = errorMessage;
    
    // Return fallback data
    const fallbackStats = getFallbackMarketStats();
    globalStatsCache.data = fallbackStats;
    return fallbackStats;
  } finally {
    // Reset loading flag
    globalStatsCache.isLoading = false;
  }
};

// Trigger a fetch from the backend
const triggerDataRefresh = async (): Promise<void> => {
  try {
    console.log('Triggering backend data refresh...');
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.functions.invoke('fetchCryptoData', {
      body: { trigger: 'manual' }
    });
  } catch (error) {
    console.error('Failed to trigger data refresh:', error);
  }
};

// Custom hook to get cryptocurrency data with caching
export const useCryptoData = (): { 
  cryptoData: CryptoCurrency[]; 
  loading: boolean; 
  error: string | null;
  refreshData: () => Promise<void>;
} => {
  const [cryptoData, setCryptoData] = useState<CryptoCurrency[]>(globalCryptoCache.data);
  const [loading, setLoading] = useState<boolean>(!globalCryptoCache.data.length);
  const [error, setError] = useState<string | null>(globalCryptoCache.lastError);
  
  const getCryptoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentTime = Date.now();
      
      // Check if memory cache is valid (less than memory cache duration)
      if (globalCryptoCache.data.length > 0 && currentTime - globalCryptoCache.timestamp < MEMORY_CACHE_DURATION) {
        console.log('Using in-memory cached crypto data');
        setCryptoData(globalCryptoCache.data);
      } else {
        // Fetch new data from Supabase cache
        const freshData = await fetchCryptoData();
        setCryptoData(freshData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in getCryptoData:', errorMessage);
      
      // Fall back to memory cache if available, or use fallback data
      if (globalCryptoCache.data.length > 0) {
        setCryptoData(globalCryptoCache.data);
      } else {
        setCryptoData(getFallbackCryptoData());
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh data, but with rate limiting
  const refreshData = async () => {
    const currentTime = Date.now();
    
    // Rate limit refreshes to prevent API spam
    if (currentTime - globalCryptoCache.timestamp < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - using cached data');
      setCryptoData(globalCryptoCache.data.length > 0 ? globalCryptoCache.data : getFallbackCryptoData());
      return;
    }
    
    // Force refresh by triggering backend data fetch and then fetching from cache
    try {
      setLoading(true);
      
      // Trigger the backend to refresh data
      await triggerDataRefresh();
      
      // Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now fetch from the cache
      const freshData = await fetchCryptoData();
      setCryptoData(freshData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Fall back to existing data or fallback
      if (globalCryptoCache.data.length > 0) {
        setCryptoData(globalCryptoCache.data);
      } else {
        setCryptoData(getFallbackCryptoData());
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    getCryptoData();
    
    // Set up a timer to refresh data periodically (once every memory cache duration)
    const intervalId = setInterval(() => {
      getCryptoData();
    }, MEMORY_CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { cryptoData, loading, error, refreshData };
};

// Custom hook to get market stats with caching
export const useMarketStats = (): {
  marketStats: MarketStats | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
} => {
  const [marketStats, setMarketStats] = useState<MarketStats | null>(globalStatsCache.data);
  const [loading, setLoading] = useState<boolean>(!globalStatsCache.data);
  const [error, setError] = useState<string | null>(globalStatsCache.lastError);

  const getMarketStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentTime = Date.now();
      
      // Check if memory cache is valid (less than memory cache duration)
      if (globalStatsCache.data && currentTime - globalStatsCache.timestamp < MEMORY_CACHE_DURATION) {
        console.log('Using in-memory cached market stats data');
        setMarketStats(globalStatsCache.data);
      } else {
        // Fetch new data from Supabase cache
        const freshData = await fetchMarketStats();
        setMarketStats(freshData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in getMarketStats:', errorMessage);
      
      // Fall back to memory cache if available, or use fallback data
      if (globalStatsCache.data) {
        setMarketStats(globalStatsCache.data);
      } else {
        setMarketStats(getFallbackMarketStats());
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh data, but with rate limiting
  const refreshData = async () => {
    const currentTime = Date.now();
    
    // Rate limit refreshes to prevent API spam
    if (currentTime - globalStatsCache.timestamp < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - using cached market stats');
      setMarketStats(globalStatsCache.data || getFallbackMarketStats());
      return;
    }
    
    // Force refresh by triggering backend data fetch and then fetching from cache
    try {
      setLoading(true);
      
      // Trigger the backend to refresh data
      await triggerDataRefresh();
      
      // Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now fetch from the cache
      const freshData = await fetchMarketStats();
      setMarketStats(freshData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Fall back to existing data or fallback
      if (globalStatsCache.data) {
        setMarketStats(globalStatsCache.data);
      } else {
        setMarketStats(getFallbackMarketStats());
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    getMarketStats();
    
    // Set up a timer to refresh data periodically
    const intervalId = setInterval(() => {
      getMarketStats();
    }, MEMORY_CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { marketStats, loading, error, refreshData };
};
