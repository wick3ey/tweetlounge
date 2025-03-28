
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

// Cache with timestamp to track when it was last updated
interface CryptoCache {
  data: CryptoCurrency[];
  timestamp: number;
}

interface MarketStatsCache {
  data: MarketStats | null;
  timestamp: number;
}

// Global cache object
let globalCache: CryptoCache = {
  data: [],
  timestamp: 0
};

// Global market stats cache
let marketStatsCache: MarketStatsCache = {
  data: null,
  timestamp: 0
};

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

// Function to fetch crypto data from CoinGecko
const fetchCryptoData = async (): Promise<CryptoCurrency[]> => {
  try {
    // CoinGecko free API endpoint for top cryptocurrencies
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from CoinGecko');
    }
    
    const data = await response.json();
    
    // Map the response to our CryptoCurrency interface
    return data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change: coin.price_change_percentage_24h || 0
    }));
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    throw error; // Re-throw to let caller handle it
  }
};

// Function to fetch fear and greed index
const fetchFearGreedIndex = async (): Promise<{value: number, value_classification: string}> => {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed index');
    }
    
    const data = await response.json();
    
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
  try {
    // Fetch global market data
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    
    if (!response.ok) {
      throw new Error('Failed to fetch global market data from CoinGecko');
    }
    
    const { data } = await response.json();
    
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
    
    return marketStats;
  } catch (error) {
    console.error('Error fetching global market data:', error);
    throw error; // Re-throw the error to let the caller handle it
  }
};

// Custom hook to get cryptocurrency data with caching
export const useCryptoData = (): { 
  cryptoData: CryptoCurrency[]; 
  loading: boolean; 
  error: string | null;
  refreshData: () => Promise<void>;
} => {
  const [cryptoData, setCryptoData] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const getCryptoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentTime = Date.now();
      
      // Check if cache is valid (less than 10 minutes old)
      if (globalCache.data.length > 0 && currentTime - globalCache.timestamp < CACHE_DURATION) {
        console.log('Using cached crypto data');
        setCryptoData(globalCache.data);
      } else {
        console.log('Fetching fresh crypto data');
        const freshData = await fetchCryptoData();
        
        // Update the global cache
        globalCache = {
          data: freshData,
          timestamp: currentTime
        };
        
        setCryptoData(freshData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cryptocurrency data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh data
  const refreshData = async () => {
    // Force refresh by invalidating cache
    globalCache.timestamp = 0;
    await getCryptoData();
  };
  
  useEffect(() => {
    getCryptoData();
    
    // Set up a timer to refresh data every 10 minutes
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
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getMarketStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentTime = Date.now();
      
      // Check if cache is valid (less than 10 minutes old)
      if (marketStatsCache.data && currentTime - marketStatsCache.timestamp < CACHE_DURATION) {
        console.log('Using cached market stats data');
        setMarketStats(marketStatsCache.data);
      } else {
        console.log('Fetching fresh market stats data');
        const freshData = await fetchMarketStats();
        
        // Update the market stats cache
        marketStatsCache = {
          data: freshData,
          timestamp: currentTime
        };
        
        setMarketStats(freshData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market stats data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to manually refresh data
  const refreshData = async () => {
    // Force refresh by invalidating cache
    marketStatsCache.timestamp = 0;
    await getMarketStats();
  };
  
  useEffect(() => {
    getMarketStats();
    
    // Set up a timer to refresh data every 10 minutes
    const intervalId = setInterval(() => {
      getMarketStats();
    }, CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { marketStats, loading, error, refreshData };
};
