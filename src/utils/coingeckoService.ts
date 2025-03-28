
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
    return [];
  }
};

// Function to fetch global market stats from CoinGecko
const fetchMarketStats = async (): Promise<MarketStats | null> => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/global'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch global market data from CoinGecko');
    }
    
    const { data } = await response.json();
    
    // Map the response to our MarketStats interface
    return {
      total_market_cap: data.total_market_cap.usd,
      total_volume: data.total_24h_volume.usd,
      btc_dominance: data.market_cap_percentage.btc,
      eth_dominance: data.market_cap_percentage.eth,
      active_cryptocurrencies: data.active_cryptocurrencies,
      market_cap_change_percentage_24h: data.market_cap_change_percentage_24h_usd
    };
  } catch (error) {
    console.error('Error fetching global market data:', error);
    return null;
  }
};

// Custom hook to get cryptocurrency data with caching
export const useCryptoData = (): { 
  cryptoData: CryptoCurrency[]; 
  loading: boolean; 
  error: string | null;
} => {
  const [cryptoData, setCryptoData] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const getCryptoData = async () => {
      setLoading(true);
      
      try {
        const currentTime = Date.now();
        
        // Check if cache is valid (less than 10 minutes old)
        if (globalCache.data.length > 0 && currentTime - globalCache.timestamp < CACHE_DURATION) {
          console.log('Using cached crypto data');
          setCryptoData(globalCache.data);
        } else {
          console.log('Fetching fresh crypto data');
          const freshData = await fetchCryptoData();
          
          if (freshData.length > 0) {
            // Update the global cache
            globalCache = {
              data: freshData,
              timestamp: currentTime
            };
            setCryptoData(freshData);
          } else {
            setError('No data received from CoinGecko');
          }
        }
      } catch (err) {
        setError('Failed to fetch cryptocurrency data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    getCryptoData();
    
    // Set up a timer to refresh data every 10 minutes
    const intervalId = setInterval(() => {
      getCryptoData();
    }, CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { cryptoData, loading, error };
};

// Custom hook to get market stats with caching
export const useMarketStats = (): {
  marketStats: MarketStats | null;
  loading: boolean;
  error: string | null;
} => {
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getMarketStats = async () => {
      setLoading(true);
      
      try {
        const currentTime = Date.now();
        
        // Check if cache is valid (less than 10 minutes old)
        if (marketStatsCache.data && currentTime - marketStatsCache.timestamp < CACHE_DURATION) {
          console.log('Using cached market stats data');
          setMarketStats(marketStatsCache.data);
        } else {
          console.log('Fetching fresh market stats data');
          const freshData = await fetchMarketStats();
          
          if (freshData) {
            // Update the market stats cache
            marketStatsCache = {
              data: freshData,
              timestamp: currentTime
            };
            setMarketStats(freshData);
          } else {
            setError('No market stats data received from CoinGecko');
          }
        }
      } catch (err) {
        setError('Failed to fetch market stats data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    getMarketStats();
    
    // Set up a timer to refresh data every 10 minutes
    const intervalId = setInterval(() => {
      getMarketStats();
    }, CACHE_DURATION);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  return { marketStats, loading, error };
};
