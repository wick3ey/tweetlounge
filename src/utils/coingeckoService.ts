
import { useEffect, useState } from 'react';

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

// CORS proxies list - we'll try these in sequence
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.org/?'
];

// Helper function to try fetching with multiple proxies
const fetchWithProxies = async (url: string): Promise<any> => {
  let lastError: Error | null = null;
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error with proxy ${proxy}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to the next proxy
    }
  }
  
  // If all proxies failed, throw the last error
  throw lastError || new Error('All proxies failed');
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
    console.info('Fetching fresh crypto data');
    // CoinGecko free API endpoint for top cryptocurrencies
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h';
    
    const data = await fetchWithProxies(url);
    
    // Map the response to our CryptoCurrency interface
    const cryptoData = data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change: coin.price_change_percentage_24h || 0
    }));
    
    // Update the global cache
    globalCryptoCache.data = cryptoData;
    globalCryptoCache.timestamp = Date.now();
    
    return cryptoData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching crypto data:', errorMessage);
    globalCryptoCache.lastError = errorMessage;
    throw error;
  } finally {
    // Reset loading flag
    globalCryptoCache.isLoading = false;
  }
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
    return { value: 0, value_classification: '' };
  }
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
    console.info('Fetching fresh market stats data');
    // Fetch global market data
    const url = 'https://api.coingecko.com/api/v3/global';
    
    const { data } = await fetchWithProxies(url);
    
    // Get Fear & Greed index
    let fearGreedData;
    try {
      fearGreedData = await fetchFearGreedIndex();
    } catch (err) {
      console.warn('Could not fetch Fear & Greed index, continuing without it');
      fearGreedData = { value: 0, value_classification: '' };
    }
    
    // Safely extract values from the response structure
    const marketStats: MarketStats = {
      total_market_cap: data.total_market_cap?.usd || 0,
      total_volume: data.total_volume?.usd || 0,
      btc_dominance: data.market_cap_percentage?.btc || 0,
      eth_dominance: data.market_cap_percentage?.eth || 0,
      active_cryptocurrencies: data.active_cryptocurrencies || 0,
      market_cap_change_percentage_24h: data.market_cap_change_percentage_24h_usd || 0,
      fear_greed_value: fearGreedData.value,
      fear_greed_label: fearGreedData.value_classification
    };
    
    // Update global cache
    globalStatsCache.data = marketStats;
    globalStatsCache.timestamp = Date.now();
    
    return marketStats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching global market data:', errorMessage);
    globalStatsCache.lastError = errorMessage;
    throw error;
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
        console.log('Using cached crypto data');
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
        console.log('Using cached market stats data');
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
