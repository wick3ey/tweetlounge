
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

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;
// Minimum time between API refresh attempts (1 minute) to prevent API spam
const MIN_REFRESH_INTERVAL = 60 * 1000;

// Updated CORS proxies list - we'll try these in sequence
const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.org/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://cors.eu.org/'
];

// Helper function to try fetching with multiple proxies
const fetchWithProxies = async (url: string): Promise<any> => {
  let lastError: Error | null = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      console.log(`Trying proxy: ${proxy} for URL: ${url}`);
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json'
        },
        // Adding cache-busting parameter
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched data using proxy: ${proxy}`);
      
      // Check if the response contains an error message from CoinGecko
      if (data && data.status && data.status.error_code) {
        console.error('API rate limit error:', data.status.error_message);
        throw new Error(`CoinGecko API error: ${data.status.error_message}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error with proxy ${proxy}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to the next proxy
    }
  }
  
  // If all proxies failed, throw the last error with a more descriptive message
  throw lastError || new Error('All proxies failed to fetch data');
};

// Function to safely parse API response data with fallbacks
const safelyParseCoinsData = (data: any): CryptoCurrency[] => {
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data format received:', data);
    // If we receive an object with an error status instead of an array, it's likely a rate limit error
    if (data && data.status && data.status.error_code === 429) {
      console.warn('Rate limit hit. Using fallback data.');
    }
    return [];
  }
  
  try {
    return data.map((coin: any) => ({
      id: coin.id || '',
      name: coin.name || '',
      symbol: (coin.symbol || '').toUpperCase(),
      price: typeof coin.current_price === 'number' ? coin.current_price : 0,
      change: typeof coin.price_change_percentage_24h === 'number' ? coin.price_change_percentage_24h : 0
    }));
  } catch (error) {
    console.error('Error parsing coin data:', error);
    return [];
  }
};

// Function to fetch crypto data from CoinGecko
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
    // First check database cache
    const cachedData = await getCachedData<CryptoCurrency[]>(CACHE_KEYS.CRYPTO_DATA);
    if (cachedData && cachedData.length > 0) {
      console.log('Using database cached crypto data');
      globalCryptoCache.data = cachedData;
      globalCryptoCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.info('Fetching fresh crypto data from API');
    // CoinGecko free API endpoint for top cryptocurrencies
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h';
    
    try {
      const data = await fetchWithProxies(url);
      const cryptoData = safelyParseCoinsData(data);
      
      if (cryptoData.length > 0) {
        // Update the global cache
        globalCryptoCache.data = cryptoData;
        globalCryptoCache.timestamp = Date.now();
        
        // Store in database cache
        await setCachedData(
          CACHE_KEYS.CRYPTO_DATA, 
          cryptoData, 
          CACHE_DURATIONS.MEDIUM, 
          'coingecko'
        );
        
        return cryptoData;
      } else {
        throw new Error('API returned empty or invalid data');
      }
    } catch (error) {
      console.error('Error fetching crypto data, using fallback data:', error);
      // Return fallback data
      return getFallbackCryptoData();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in fetchCryptoData:', errorMessage);
    globalCryptoCache.lastError = errorMessage;
    
    // Return fallback data if we have no valid data
    return getFallbackCryptoData();
  } finally {
    // Reset loading flag
    globalCryptoCache.isLoading = false;
  }
};

// Fallback data to use when the API fails
const getFallbackCryptoData = (): CryptoCurrency[] => {
  const fallbackData: CryptoCurrency[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 82364, change: -1.67 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1815, change: -3.04 },
    { id: 'tether', name: 'Tether', symbol: 'USDT', price: 0.999, change: 0.02 },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: 600, change: -3.62 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 124, change: -3.28 },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 2.12, change: -2.90 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.67, change: -3.91 },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.168, change: -6.48 },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7.5, change: -4.2 },
    { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: 0.00002, change: -5.3 }
  ];
  return fallbackData;
};

// Function to fetch fear and greed index
const fetchFearGreedIndex = async (): Promise<{value: number, value_classification: string}> => {
  try {
    const url = 'https://api.alternative.me/fng/';
    
    const data = await fetchWithProxies(url);
    
    if (data && data.data && data.data[0]) {
      return {
        value: parseInt(data.data[0].value, 10),
        value_classification: data.data[0].value_classification
      };
    }
    
    throw new Error('Unexpected Fear & Greed API response structure');
  } catch (error) {
    console.error('Error fetching Fear & Greed index:', error);
    return { value: 50, value_classification: 'Neutral' };
  }
};

// Function to safely parse global market data with fallbacks
const safelyParseGlobalData = (data: any): MarketStats => {
  // Check if the response contains an error message
  if (data && data.status && data.status.error_code) {
    console.error('API error:', data.status.error_message);
    return getFallbackMarketStats();
  }
  
  if (!data || !data.data) {
    console.error('Invalid global market data format received:', data);
    return getFallbackMarketStats();
  }
  
  try {
    const marketData = data.data;
    return {
      total_market_cap: marketData.total_market_cap?.usd || 0,
      total_volume: marketData.total_volume?.usd || 0,
      btc_dominance: marketData.market_cap_percentage?.btc || 0,
      eth_dominance: marketData.market_cap_percentage?.eth || 0,
      active_cryptocurrencies: marketData.active_cryptocurrencies || 0,
      market_cap_change_percentage_24h: marketData.market_cap_change_percentage_24h_usd || 0
    };
  } catch (error) {
    console.error('Error parsing global market data:', error);
    return getFallbackMarketStats();
  }
};

// Fallback market stats
const getFallbackMarketStats = (): MarketStats => {
  return {
    total_market_cap: 2821150162185,
    total_volume: 110950262631,
    btc_dominance: 58.86,
    eth_dominance: 8.00,
    active_cryptocurrencies: 17159,
    market_cap_change_percentage_24h: -5.83
  };
};

// Function to fetch global market stats from CoinGecko
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
    // First check database cache
    const cachedData = await getCachedData<MarketStats>(CACHE_KEYS.MARKET_STATS);
    if (cachedData) {
      console.log('Using database cached market stats data');
      globalStatsCache.data = cachedData;
      globalStatsCache.timestamp = Date.now();
      return cachedData;
    }
    
    console.info('Fetching fresh market stats data from API');
    // Fetch global market data
    const url = 'https://api.coingecko.com/api/v3/global';
    
    let marketStats: MarketStats;
    try {
      const data = await fetchWithProxies(url);
      marketStats = safelyParseGlobalData(data);
      
      if (marketStats.total_market_cap === 0 && marketStats.total_volume === 0) {
        console.warn('API returned zeros for market stats, using fallback data');
        marketStats = getFallbackMarketStats();
      }
    } catch (error) {
      console.error('Error fetching global market data, using fallback:', error);
      marketStats = getFallbackMarketStats();
    }
    
    // Get Fear & Greed index
    let fearGreedData;
    try {
      fearGreedData = await fetchFearGreedIndex();
      
      // Add fear and greed data to market stats
      marketStats.fear_greed_value = fearGreedData.value;
      marketStats.fear_greed_label = fearGreedData.value_classification;
    } catch (err) {
      console.warn('Could not fetch Fear & Greed index, continuing without it');
      marketStats.fear_greed_value = 50;
      marketStats.fear_greed_label = 'Neutral';
    }
    
    // Update global cache
    globalStatsCache.data = marketStats;
    globalStatsCache.timestamp = Date.now();
    
    // Store in database cache
    await setCachedData(
      CACHE_KEYS.MARKET_STATS, 
      marketStats, 
      CACHE_DURATIONS.MEDIUM, 
      'coingecko'
    );
    
    return marketStats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in fetchMarketStats:', errorMessage);
    globalStatsCache.lastError = errorMessage;
    
    // Return fallback data
    const fallbackStats = getFallbackMarketStats();
    return fallbackStats;
  } finally {
    // Reset loading flag
    globalStatsCache.isLoading = false;
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
      
      // Check if cache is valid (less than cache duration)
      if (globalCryptoCache.data.length > 0 && currentTime - globalCryptoCache.timestamp < CACHE_DURATION) {
        console.log('Using in-memory cached crypto data');
        setCryptoData(globalCryptoCache.data);
      } else {
        // Fetch new data
        const freshData = await fetchCryptoData();
        setCryptoData(freshData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in getCryptoData:', errorMessage);
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
      setCryptoData(globalCryptoCache.data);
      return;
    }
    
    // Force refresh by invalidating timestamp
    try {
      const freshData = await fetchCryptoData();
      setCryptoData(freshData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };
  
  useEffect(() => {
    getCryptoData();
    
    // Set up a timer to refresh data periodically (once every cache duration)
    const intervalId = setInterval(() => {
      getCryptoData();
    }, CACHE_DURATION);
    
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
      
      // Check if cache is valid (less than cache duration)
      if (globalStatsCache.data && currentTime - globalStatsCache.timestamp < CACHE_DURATION) {
        console.log('Using in-memory cached market stats data');
        setMarketStats(globalStatsCache.data);
      } else {
        // Fetch new data
        const freshData = await fetchMarketStats();
        setMarketStats(freshData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Error in getMarketStats:', errorMessage);
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
      setMarketStats(globalStatsCache.data);
      return;
    }
    
    // Force refresh
    try {
      const freshData = await fetchMarketStats();
      setMarketStats(freshData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };
  
  useEffect(() => {
    getMarketStats();
    
    // Set up a timer to refresh data periodically
    const intervalId = setInterval(() => {
      getMarketStats();
    }, CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { marketStats, loading, error, refreshData };
};
