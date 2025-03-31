
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Duration in milliseconds - 10 minutes cache
const CACHE_DURATION = 10 * 60 * 1000;

// Define response type
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

interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

// List of cryptocurrency IDs to fetch
const CRYPTO_IDS = [
  'bitcoin', // BTC
  'ethereum', // ETH
  'solana', // SOL
  'cardano', // ADA
  'polkadot', // DOT
  'ripple', // XRP (actually "xrp" in CoinGecko)
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

// Function to fetch market stats from CoinGecko
async function fetchMarketGlobal() {
  try {
    console.log('Fetching global market data from CoinGecko');
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      total_market_cap: data.data.total_market_cap.usd,
      total_volume: data.data.total_volume.usd,
      btc_dominance: data.data.market_cap_percentage.btc,
      eth_dominance: data.data.market_cap_percentage.eth,
      active_cryptocurrencies: data.data.active_cryptocurrencies,
      market_cap_change_percentage_24h: data.data.market_cap_change_percentage_24h_usd,
    };
  } catch (error) {
    console.error('Error fetching market global data:', error);
    // Return fallback data
    return {
      total_market_cap: 2800000000000,
      total_volume: 110000000000,
      btc_dominance: 58.5,
      eth_dominance: 8.2,
      active_cryptocurrencies: 17100,
      market_cap_change_percentage_24h: -1.2,
    };
  }
}

// Function to fetch fear and greed index
async function fetchFearAndGreed() {
  try {
    console.log('Fetching fear and greed data');
    const response = await fetch('https://api.alternative.me/fng/');
    
    if (!response.ok) {
      throw new Error(`Fear and Greed API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return {
        fear_greed_value: parseInt(data.data[0].value),
        fear_greed_label: data.data[0].value_classification,
      };
    }
    
    throw new Error('Invalid fear and greed data format');
  } catch (error) {
    console.error('Error fetching fear and greed data:', error);
    // Return fallback data
    return {
      fear_greed_value: 50,
      fear_greed_label: 'Neutral',
    };
  }
}

// Function to fetch cryptocurrency prices
async function fetchCryptoTokens() {
  try {
    console.log('Fetching crypto token prices');
    
    // To ensure we get all our specified coins, we'll fetch more per page
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter to include only our specified cryptocurrencies
    const filteredData = data.filter((coin: any) => CRYPTO_IDS.includes(coin.id));
    
    // Check if we got all the coins we wanted
    if (filteredData.length < CRYPTO_IDS.length) {
      console.warn(`Couldn't find all requested cryptocurrencies. Found ${filteredData.length} out of ${CRYPTO_IDS.length}`);
      
      // Find which coins are missing
      const foundIds = filteredData.map((coin: any) => coin.id);
      const missingIds = CRYPTO_IDS.filter(id => !foundIds.includes(id));
      console.warn('Missing coins:', missingIds);
    }
    
    // Format the data
    return filteredData.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change: coin.price_change_percentage_24h || 0,
    }));
  } catch (error) {
    console.error('Error fetching crypto token prices:', error);
    // Return fallback data for requested coins
    return [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 83000, change: 0.9 },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1840, change: 1.8 },
      { id: 'solana', name: 'Solana', symbol: 'SOL', price: 126, change: 1.3 },
      { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.65, change: -1.2 },
      { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7.5, change: -0.8 },
      { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 2.12, change: -0.7 },
      { id: 'algorand', name: 'Algorand', symbol: 'ALGO', price: 0.18, change: -1.1 },
      { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.16, change: -0.4 },
      { id: 'the-graph', name: 'The Graph', symbol: 'GRT', price: 0.15, change: -0.9 },
      { id: 'hedera-hashgraph', name: 'Hedera', symbol: 'HBAR', price: 0.09, change: -1.5 },
      { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: 13.5, change: 0.7 },
      { id: 'sui', name: 'Sui', symbol: 'SUI', price: 1.2, change: 0.3 },
      { id: 'hype', name: 'Hype', symbol: 'HYPE', price: 0.005, change: 3.1 },
      { id: 'pepe', name: 'Pepe', symbol: 'PEPE', price: 0.00001, change: 2.4 },
      { id: 'ondo-finance', name: 'Ondo Finance', symbol: 'ONDO', price: 1.05, change: 0.8 }
    ];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Parse request body if any
    let requestParams = {};
    if (req.method === 'POST') {
      try {
        requestParams = await req.json();
        console.log('Request params:', requestParams);
      } catch (e) {
        console.log('No request body or invalid JSON');
      }
    }

    // First, check if we have fresh cached data
    let cachedMarketStats = null;
    let cachedCryptoData = null;
    const now = new Date();

    // Check for market_stats in cache
    const { data: marketStatsCache, error: marketStatsCacheError } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', 'market_stats')
      .gt('expires_at', now.toISOString())
      .maybeSingle();

    if (!marketStatsCacheError && marketStatsCache) {
      console.log('Using cached market stats');
      cachedMarketStats = marketStatsCache.data;
    }

    // Check for crypto_data in cache
    const { data: cryptoDataCache, error: cryptoDataCacheError } = await supabase
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', 'crypto_data')
      .gt('expires_at', now.toISOString())
      .maybeSingle();

    if (!cryptoDataCacheError && cryptoDataCache) {
      console.log('Using cached crypto data');
      cachedCryptoData = cryptoDataCache.data;
    }

    // If we have both cached, return them
    if (cachedMarketStats && cachedCryptoData && requestParams.trigger !== 'manual') {
      console.log('Returning cached data for both market stats and crypto');
      return new Response(
        JSON.stringify({
          marketStats: cachedMarketStats,
          cryptoData: cachedCryptoData,
          lastUpdated: now.toISOString(),
          cached: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Otherwise, fetch fresh data
    console.log('Fetching fresh data');
    
    // Use Promise.all to fetch all data in parallel
    const [marketGlobal, fearAndGreed, cryptoTokens] = await Promise.all([
      fetchMarketGlobal(),
      fetchFearAndGreed(),
      fetchCryptoTokens()
    ]);
    
    // Combine market data
    const marketStats: MarketStats = {
      ...marketGlobal,
      ...fearAndGreed
    };
    
    // Calculate expiration time
    const expiresAt = new Date(now.getTime() + CACHE_DURATION).toISOString();
    
    // Store market stats in cache
    const { error: marketStatsError } = await supabase
      .from('market_cache')
      .upsert({
        cache_key: 'market_stats',
        data: marketStats,
        expires_at: expiresAt,
        source: 'edge-function'
      });
      
    if (marketStatsError) {
      console.error('Error storing market stats in cache:', marketStatsError);
    }
    
    // Store crypto data in cache
    const { error: cryptoDataError } = await supabase
      .from('market_cache')
      .upsert({
        cache_key: 'crypto_data',
        data: cryptoTokens,
        expires_at: expiresAt,
        source: 'edge-function'
      });
      
    if (cryptoDataError) {
      console.error('Error storing crypto data in cache:', cryptoDataError);
    }
    
    return new Response(
      JSON.stringify({
        marketStats,
        cryptoData: cryptoTokens,
        lastUpdated: now.toISOString(),
        cached: false
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in fetchCryptoData function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        fallbackData: {
          marketStats: {
            total_market_cap: 2800000000000,
            total_volume: 110000000000,
            btc_dominance: 58.5,
            eth_dominance: 8.2,
            active_cryptocurrencies: 17100,
            market_cap_change_percentage_24h: -1.2,
            fear_greed_value: 50,
            fear_greed_label: 'Neutral'
          },
          cryptoData: [
            { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 83000, change: 0.9 },
            { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 1840, change: 1.8 },
            { id: 'solana', name: 'Solana', symbol: 'SOL', price: 126, change: 1.3 },
            { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.65, change: -1.2 },
            { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7.5, change: -0.8 }
          ],
          lastUpdated: new Date().toISOString(),
          cached: false
        }
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
});
