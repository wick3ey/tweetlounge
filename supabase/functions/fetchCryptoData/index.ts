
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0'

// Define the base URL for CoinGecko
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'

// Cache keys for storage
const CACHE_KEYS = {
  CRYPTO_DATA: 'crypto_data',
  MARKET_STATS: 'market_stats'
}

// Define the duration for data caching - 30 minutes in milliseconds
const CACHE_DURATION = 30 * 60 * 1000

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseKey)

// Interface for the cryptocurrency data
interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

// Interface for market statistics data
interface MarketStats {
  total_market_cap: number;
  total_volume: number;
  btc_dominance: number;
  eth_dominance: number;
  active_cryptocurrencies: number;
  market_cap_change_percentage_24h: number;
  fear_greed_value?: number;
  fear_greed_label?: string;
}

// Helper function to fetch data with retries
async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}: Fetching ${url}`)
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched data from ${url}`)
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      // Wait longer between retries
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

// Function to safely parse API response data with fallbacks
function safelyParseCoinsData(data: any): CryptoCurrency[] {
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data format received for crypto coins:', data);
    return getFallbackCryptoData();
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
    return getFallbackCryptoData();
  }
}

// Function to safely parse global market data with fallbacks
function safelyParseGlobalData(data: any): MarketStats {
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
}

// Fallback data to use when the API fails
function getFallbackCryptoData(): CryptoCurrency[] {
  return [
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
}

// Fallback market stats
function getFallbackMarketStats(): MarketStats {
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
}

// Function to fetch fear and greed index
async function fetchFearGreedIndex(): Promise<{value: number, value_classification: string}> {
  try {
    const url = 'https://api.alternative.me/fng/';
    
    const data = await fetchWithRetry(url);
    
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
}

// Function to store data in cache
async function setCachedData(key: string, data: any, duration: number = CACHE_DURATION, source?: string): Promise<boolean> {
  try {
    console.log(`Setting cache for key: ${key}, duration: ${duration}ms`);
    
    // Calculate expiration time
    const expires = new Date(Date.now() + duration);
    
    // First, remove any existing entries with this key
    const { error: deleteError } = await supabase
      .from('market_cache')
      .delete()
      .eq('cache_key', key);
    
    if (deleteError) {
      console.error(`Error clearing existing cache: ${deleteError.message}`);
    }
    
    // Then insert the new cache entry
    const { error } = await supabase
      .from('market_cache')
      .insert({
        cache_key: key,
        data: data,
        source,
        expires_at: expires.toISOString()
      });
    
    if (error) {
      console.error(`Error setting cache: ${error.message}`);
      return false;
    }
    
    console.log(`Successfully cached data for key: ${key}, expires: ${expires.toISOString()}`);
    return true;
  } catch (err) {
    console.error(`Unexpected error in setCachedData: ${err}`);
    return false;
  }
}

// Cleanup expired cache entries
async function cleanupExpiredCache(): Promise<void> {
  try {
    const { error } = await supabase
      .from('market_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error(`Error cleaning up cache: ${error.message}`);
    } else {
      console.log('Successfully cleaned up expired cache entries');
    }
  } catch (err) {
    console.error(`Unexpected error in cleanupExpiredCache: ${err}`);
  }
}

// Main function to fetch crypto data
async function fetchCryptoData(): Promise<CryptoCurrency[]> {
  try {
    console.info('Fetching fresh crypto data from API');
    // CoinGecko API endpoint for top cryptocurrencies
    const url = `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;
    
    try {
      const data = await fetchWithRetry(url);
      const cryptoData = safelyParseCoinsData(data);
      
      if (cryptoData.length > 0) {
        // Store in database cache
        await setCachedData(
          CACHE_KEYS.CRYPTO_DATA, 
          cryptoData, 
          CACHE_DURATION, 
          'coingecko'
        );
        
        return cryptoData;
      } else {
        throw new Error('API returned empty or invalid data');
      }
    } catch (error) {
      console.error('Error fetching crypto data, using fallback data:', error);
      // Return and cache fallback data
      const fallbackData = getFallbackCryptoData();
      await setCachedData(
        CACHE_KEYS.CRYPTO_DATA, 
        fallbackData, 
        CACHE_DURATION, 
        'fallback'
      );
      return fallbackData;
    }
  } catch (error) {
    console.error('Error in fetchCryptoData:', error);
    return getFallbackCryptoData();
  }
}

// Function to fetch global market stats
async function fetchMarketStats(): Promise<MarketStats> {
  try {
    console.info('Fetching fresh market stats data from API');
    // Fetch global market data
    const url = `${COINGECKO_API_URL}/global`;
    
    let marketStats: MarketStats;
    try {
      const data = await fetchWithRetry(url);
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
    
    // Store in database cache
    await setCachedData(
      CACHE_KEYS.MARKET_STATS, 
      marketStats, 
      CACHE_DURATION, 
      'coingecko'
    );
    
    return marketStats;
  } catch (error) {
    console.error('Error in fetchMarketStats:', error);
    
    // Return and cache fallback data
    const fallbackStats = getFallbackMarketStats();
    await setCachedData(
      CACHE_KEYS.MARKET_STATS, 
      fallbackStats, 
      CACHE_DURATION, 
      'fallback'
    );
    return fallbackStats;
  }
}

// Function to handle the HTTP request
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Clean up expired cache
  await cleanupExpiredCache();
  
  try {
    // Start fetching data
    console.log('Starting to fetch crypto data...');
    const cryptoData = await fetchCryptoData();
    console.log('Successfully fetched and cached crypto data. Items:', cryptoData.length);
    
    console.log('Starting to fetch market stats...');
    const marketStats = await fetchMarketStats();
    console.log('Successfully fetched and cached market stats.');
    
    // Respond with success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data fetched and cached successfully', 
        timestamp: new Date().toISOString(),
        cryptoCount: cryptoData.length,
        hasMarketStats: !!marketStats
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in fetchCryptoData handler:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Failed to fetch data: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})
