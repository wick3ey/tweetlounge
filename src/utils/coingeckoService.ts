
import { useEffect, useState } from 'react';

// Interface for the cryptocurrency data
export interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

// Cache with timestamp to track when it was last updated
interface CryptoCache {
  data: CryptoCurrency[];
  timestamp: number;
}

// Global cache object
let globalCache: CryptoCache = {
  data: [],
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
