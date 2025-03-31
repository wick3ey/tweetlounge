
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getCachedData, setCachedData, CACHE_DURATIONS } from './cacheService';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
  lastUpdated?: string;
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

// List of cryptocurrency IDs to display
const DISPLAY_CRYPTO_IDS = [
  'bitcoin', // BTC
  'ethereum', // ETH
  'solana', // SOL
  'cardano', // ADA
  'polkadot', // DOT
  'ripple', // XRP
  'algorand', // ALGO
  'dogecoin', // DOGE
  'the-graph', // GRT
  'hedera-hashgraph', // HBAR
  'chainlink', // LINK
  'sui', // SUI
  'hype', // HYPE
  'pepe', // PEPE
  'ondo-finance' // ONDO
];

// Fallback data to use when the API fails
const getFallbackCryptoData = (): CryptoCurrency[] => {
  const fallbackData: CryptoCurrency[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 62364, change: -1.67 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3015, change: -3.04 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 124, change: -3.28 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.44, change: -3.91 },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7.5, change: -4.2 },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 0.52, change: -2.90 },
    { id: 'algorand', name: 'Algorand', symbol: 'ALGO', price: 0.18, change: -2.50 },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.12, change: -6.48 },
    { id: 'the-graph', name: 'The Graph', symbol: 'GRT', price: 0.15, change: -3.2 },
    { id: 'hedera-hashgraph', name: 'Hedera', symbol: 'HBAR', price: 0.09, change: -2.8 },
    { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: 13.5, change: -1.2 },
    { id: 'sui', name: 'Sui', symbol: 'SUI', price: 1.2, change: -2.4 },
    { id: 'hype', name: 'Hype', symbol: 'HYPE', price: 0.005, change: -8.3 },
    { id: 'pepe', name: 'Pepe', symbol: 'PEPE', price: 0.00001, change: -5.1 },
    { id: 'ondo-finance', name: 'Ondo Finance', symbol: 'ONDO', price: 1.05, change: 0.8 }
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
    // First try to get data from database cache
    const cachedData = await getCachedData<CryptoCurrency[]>(CACHE_KEYS.CRYPTO_DATA);
    if (cachedData && cachedData.length > 0) {
      console.log('Using database cached crypto data');
      globalCryptoCache.data = cachedData;
      globalCryptoCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.warn('No cached crypto data available in database, triggering backend refresh');
    
    // Trigger the backend to refresh data
    await triggerDataRefresh();
    
    // Wait a moment for the backend to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try fetching again from cache
    const freshData = await getCachedData<CryptoCurrency[]>(CACHE_KEYS.CRYPTO_DATA);
    if (freshData && freshData.length > 0) {
      console.log('Using newly fetched crypto data');
      globalCryptoCache.data = freshData;
      globalCryptoCache.timestamp = Date.now();
      return freshData;
    }
    
    // If still no data, use fallback
    console.warn('Still no cached data available after refresh, using fallback data');
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
    // First try to get data from database cache
    const cachedData = await getCachedData<MarketStats>(CACHE_KEYS.MARKET_STATS);
    if (cachedData) {
      console.log('Using database cached market stats data');
      globalStatsCache.data = cachedData;
      globalStatsCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.warn('No cached market stats available in database, triggering backend refresh');
    
    // Trigger the backend to refresh data
    await triggerDataRefresh();
    
    // Wait a moment for the backend to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try fetching again from cache
    const freshData = await getCachedData<MarketStats>(CACHE_KEYS.MARKET_STATS);
    if (freshData) {
      console.log('Using newly fetched market stats data');
      globalStatsCache.data = freshData;
      globalStatsCache.timestamp = Date.now();
      return freshData;
    }
    
    // If still no data, use fallback
    console.warn('Still no cached data available after refresh, using fallback stats');
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
    await supabase.functions.invoke('fetchCryptoData', {
      body: { trigger: 'manual' }
    });
  } catch (error) {
    console.error('Failed to trigger data refresh:', error);
  }
};

// Custom hook to get crypto data with caching
export const useCryptoData = () => {
  const [cryptoData, setCryptoData] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<number>(0);
  
  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchCryptoData();
        
        // Filter to only show requested cryptocurrencies
        const filteredData = data.filter(crypto => DISPLAY_CRYPTO_IDS.includes(crypto.id));
        
        // Sort the data to match the order of DISPLAY_CRYPTO_IDS
        const sortedData = [...filteredData].sort((a, b) => {
          const indexA = DISPLAY_CRYPTO_IDS.indexOf(a.id);
          const indexB = DISPLAY_CRYPTO_IDS.indexOf(b.id);
          return indexA - indexB;
        });
        
        setCryptoData(sortedData);
        lastFetchRef.current = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Try to use cached data if available
        if (globalCryptoCache.data.length > 0) {
          setCryptoData(globalCryptoCache.data);
        } else {
          setCryptoData(getFallbackCryptoData());
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Setup periodic refresh
    const intervalId = setInterval(() => {
      // Only refresh if the cache is stale
      if (Date.now() - lastFetchRef.current > MEMORY_CACHE_DURATION) {
        fetchData();
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Create memoized refresh function
  const refreshData = useCallback(async () => {
    // Only refresh if not currently loading and not too soon
    if (!loading && Date.now() - lastFetchRef.current > MIN_REFRESH_INTERVAL) {
      setLoading(true);
      try {
        // Trigger backend refresh
        await triggerDataRefresh();
        
        // Wait a moment for the backend to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch the updated data
        const data = await fetchCryptoData();
        
        // Filter and sort as before
        const filteredData = data.filter(crypto => DISPLAY_CRYPTO_IDS.includes(crypto.id));
        const sortedData = [...filteredData].sort((a, b) => {
          const indexA = DISPLAY_CRYPTO_IDS.indexOf(a.id);
          const indexB = DISPLAY_CRYPTO_IDS.indexOf(b.id);
          return indexA - indexB;
        });
        
        setCryptoData(sortedData);
        lastFetchRef.current = Date.now();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }
  }, [loading]);
  
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
  const lastFetchRef = useRef<number>(globalStatsCache.timestamp);

  const fetchMarketStatsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentTime = Date.now();
      
      // Check if memory cache is valid (less than memory cache duration)
      if (globalStatsCache.data && currentTime - globalStatsCache.timestamp < MEMORY_CACHE_DURATION) {
        console.log('Using in-memory cached market stats data');
        // Add lastUpdated property to the data when setting it
        if (globalStatsCache.data) {
          const dataWithTimestamp = { 
            ...globalStatsCache.data, 
            lastUpdated: new Date(globalStatsCache.timestamp).toISOString() 
          };
          setMarketStats(dataWithTimestamp);
        } else {
          setMarketStats(null);
        }
        setLoading(false);
        return;
      }
      
      // Fetch new data from Supabase cache
      const freshData = await fetchMarketStats();
      if (freshData) {
        const dataWithTimestamp = { 
          ...freshData, 
          lastUpdated: new Date().toISOString() 
        };
        setMarketStats(dataWithTimestamp);
      } else {
        setMarketStats(null);
      }
      lastFetchRef.current = currentTime;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in getMarketStats:', errorMessage);
      
      // Fall back to memory cache if available, or use fallback data
      if (globalStatsCache.data) {
        const dataWithTimestamp = { 
          ...globalStatsCache.data, 
          lastUpdated: new Date(globalStatsCache.timestamp).toISOString() 
        };
        setMarketStats(dataWithTimestamp);
      } else {
        const fallbackData = getFallbackMarketStats();
        const fallbackWithTimestamp = { 
          ...fallbackData, 
          lastUpdated: new Date().toISOString() 
        };
        setMarketStats(fallbackWithTimestamp);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh data, but with rate limiting
  const refreshData = async () => {
    const currentTime = Date.now();
    
    // Rate limit refreshes to prevent API spam
    if (currentTime - lastFetchRef.current < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - using cached market stats');
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
      if (freshData) {
        const dataWithTimestamp = {
          ...freshData,
          lastUpdated: new Date().toISOString()
        };
        setMarketStats(dataWithTimestamp);
      }
      lastFetchRef.current = currentTime;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Fall back to existing data or fallback
      if (globalStatsCache.data) {
        const dataWithTimestamp = {
          ...globalStatsCache.data,
          lastUpdated: new Date(globalStatsCache.timestamp).toISOString()
        };
        setMarketStats(dataWithTimestamp);
      } else {
        const fallbackData = getFallbackMarketStats();
        const fallbackWithTimestamp = {
          ...fallbackData,
          lastUpdated: new Date().toISOString()
        };
        setMarketStats(fallbackWithTimestamp);
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMarketStatsData();
    
    // Set up a timer to refresh data periodically
    const intervalId = setInterval(() => {
      // Only refresh if the cache is stale
      if (Date.now() - lastFetchRef.current > MEMORY_CACHE_DURATION) {
        fetchMarketStatsData();
      }
    }, 60 * 1000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { marketStats, loading, error, refreshData };
};
