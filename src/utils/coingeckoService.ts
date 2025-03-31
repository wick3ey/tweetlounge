
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

// Create a more efficient data fetching hook with better caching
export const useCryptoData = () => {
  const [cryptoData, setCryptoData] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<number>(0);
  const fetchPromiseRef = useRef<Promise<CryptoCurrency[]> | null>(null);
  const cacheTimeRef = useRef<number>(60 * 1000); // Default 1 minute cache
  
  // Static fallback data to use when API fails
  const fallbackData: CryptoCurrency[] = useMemo(() => [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 84000, change: -2.1 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1900, change: -3.5 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 130, change: -4.2 },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 2.2, change: -1.8 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.70, change: -2.4 }
  ], []);
  
  // Optimized fetch function with caching and deduplication
  const fetchCryptoData = useCallback(async (forceFresh = false): Promise<CryptoCurrency[]> => {
    // Use cached data if it's fresh enough and not forced
    const now = Date.now();
    if (!forceFresh && now - lastFetchRef.current < cacheTimeRef.current && cryptoData.length > 0) {
      return cryptoData;
    }
    
    // If already fetching, return existing promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }
    
    // Create a new fetch promise
    const fetchPromise = new Promise<CryptoCurrency[]>(async (resolve, reject) => {
      try {
        setLoading(true);
        
        // Try to get from database cache first
        const { data: cacheData } = await supabase
          .from('market_cache')
          .select('data, expires_at')
          .eq('cache_key', 'crypto_data')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
          
        if (cacheData?.data) {
          console.log('Using cached crypto price data');
          // FIX: Add proper type assertion for cached data
          const cachedCryptoData = cacheData.data as unknown as CryptoCurrency[];
          setCryptoData(cachedCryptoData);
          setLoading(false);
          setError(null);
          lastFetchRef.current = now;
          resolve(cachedCryptoData);
          return;
        }
        
        // If cache miss, fetch from API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Format the data
          const formattedData: CryptoCurrency[] = data.map((coin: any) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change: coin.price_change_percentage_24h || 0
          }));
          
          // Cache the data
          setCryptoData(formattedData);
          setLoading(false);
          setError(null);
          lastFetchRef.current = now;
          
          // Store in database cache
          // FIX: Cast formattedData to Json type for Supabase
          await supabase
            .from('market_cache')
            .upsert({
              cache_key: 'crypto_data',
              data: formattedData as unknown as Json,
              expires_at: new Date(now + 15 * 60 * 1000).toISOString() // 15 minutes
            });
          
          // Adaptive cache time based on market volatility
          const volatility = formattedData.reduce((sum, coin) => sum + Math.abs(coin.change), 0) / formattedData.length;
          cacheTimeRef.current = Math.max(30 * 1000, Math.min(5 * 60 * 1000, 5 * 60 * 1000 / volatility));
          
          resolve(formattedData);
        } catch (err) {
          console.error('Error fetching crypto data:', err);
          clearTimeout(timeoutId);
          
          // Try to get expired cache as fallback
          try {
            const { data: expiredCache } = await supabase
              .from('market_cache')
              .select('data')
              .eq('cache_key', 'crypto_data')
              .single();
              
            if (expiredCache?.data) {
              console.log('Using expired crypto price data');
              // FIX: Add proper type assertion for expired cache data
              const expiredData = expiredCache.data as unknown as CryptoCurrency[];
              setCryptoData(expiredData);
              setLoading(false);
              setError(new Error('Using expired data'));
              lastFetchRef.current = now - cacheTimeRef.current + 30 * 1000; // Try again in 30s
              resolve(expiredData);
              return;
            }
          } catch (cacheErr) {
            console.error('Failed to get expired cache:', cacheErr);
          }
          
          // Last resort fallback
          setCryptoData(fallbackData);
          setLoading(false);
          setError(new Error('Using fallback data'));
          lastFetchRef.current = now - cacheTimeRef.current + 30 * 1000; // Try again in 30s
          resolve(fallbackData);
        }
      } catch (err) {
        console.error('Unexpected error in crypto data fetch:', err);
        setLoading(false);
        setError(err instanceof Error ? err : new Error(String(err)));
        setCryptoData(fallbackData);
        lastFetchRef.current = now - cacheTimeRef.current + 30 * 1000; // Try again in 30s
        resolve(fallbackData);
      } finally {
        fetchPromiseRef.current = null;
      }
    });
    
    // Store the promise for deduplication
    fetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  }, [cryptoData, fallbackData]);
  
  // Load data on mount
  useEffect(() => {
    fetchCryptoData();
    
    // Setup periodic refresh
    const intervalId = setInterval(() => {
      fetchCryptoData();
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [fetchCryptoData]);
  
  // Create memoized refresh function
  const refreshData = useCallback(async () => {
    return fetchCryptoData(true);
  }, [fetchCryptoData]);
  
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
        // Add lastUpdated property to the data when setting it
        const dataWithTimestamp = {
          ...globalStatsCache.data,
          lastUpdated: new Date(globalStatsCache.timestamp).toISOString()
        };
        setMarketStats(dataWithTimestamp);
      } else {
        // Fetch new data from Supabase cache
        const freshData = await fetchMarketStats();
        // Add lastUpdated property when setting fresh data
        const dataWithTimestamp = {
          ...freshData,
          lastUpdated: new Date().toISOString()
        };
        setMarketStats(dataWithTimestamp);
      }
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
        const fallbackWithTimestamp = {
          ...getFallbackMarketStats(),
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
    if (currentTime - globalStatsCache.timestamp < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - using cached market stats');
      const dataWithTimestamp = {
        ...(globalStatsCache.data || getFallbackMarketStats()),
        lastUpdated: new Date(globalStatsCache.timestamp || currentTime).toISOString()
      };
      setMarketStats(dataWithTimestamp);
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
      const dataWithTimestamp = {
        ...freshData,
        lastUpdated: new Date().toISOString()
      };
      setMarketStats(dataWithTimestamp);
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
        const fallbackWithTimestamp = {
          ...getFallbackMarketStats(),
          lastUpdated: new Date().toISOString()
        };
        setMarketStats(fallbackWithTimestamp);
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
