
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0'

// Define the base URL for our API
const API_URL = 'https://f3oci3ty.xyz/api/crypto'

// Cache keys for storage
const CACHE_KEYS = {
  MARKET_DATA: 'market_data',
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

// Interface for the market data
interface FinancialInfo {
  circulatingSupply: number | null;
  totalSupply: number;
  mcap: number | null;
  fdv: number;
  holders: number;
  transactions?: number;
}

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  price: number;
  mcap: number;
  variation24h: number;
  rank: number;
  exchange: string;
  pool: string;
  logoUrl: string;
  financialInfo: {
    statusCode?: number;
    data?: FinancialInfo;
  } | FinancialInfo;
}

interface HotPool {
  symbol: string;
  name: string;
  tokenAddress: string;
  poolAddress: string;
  mcap: number;
  rank: number;
  exchange: string;
  creationTime: string;
  logoUrl: string;
  financialInfo: {
    statusCode?: number;
    data?: FinancialInfo;
  } | FinancialInfo;
}

interface MarketData {
  gainers: TokenData[];
  losers: TokenData[];
  hotPools: HotPool[];
  lastUpdated: string;
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
function safelyParseMarketData(data: any): MarketData {
  if (!data || typeof data !== 'object') {
    console.error('Invalid data format received for market data:', data);
    return {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
  }
  
  try {
    // Return the data as is - it should already match our MarketData interface
    return data as MarketData;
  } catch (error) {
    console.error('Error parsing market data:', error);
    return {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
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

// Main function to fetch market data
async function fetchMarketData(): Promise<MarketData> {
  try {
    console.info('Fetching fresh market data from API');
    
    try {
      const data = await fetchWithRetry(API_URL);
      const marketData = safelyParseMarketData(data);
      
      if (marketData.gainers.length > 0 || marketData.losers.length > 0 || marketData.hotPools.length > 0) {
        // Store in database cache
        await setCachedData(
          CACHE_KEYS.MARKET_DATA, 
          marketData, 
          CACHE_DURATION, 
          'f3oci3ty.xyz'
        );
        
        return marketData;
      } else {
        throw new Error('API returned empty data');
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Return empty data structure
      const emptyData = {
        gainers: [],
        losers: [],
        hotPools: [],
        lastUpdated: new Date().toISOString()
      };
      
      return emptyData;
    }
  } catch (error) {
    console.error('Error in fetchMarketData:', error);
    return {
      gainers: [],
      losers: [],
      hotPools: [],
      lastUpdated: new Date().toISOString()
    };
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
    console.log('Starting to fetch market data...');
    const marketData = await fetchMarketData();
    console.log('Successfully fetched and cached market data.');
    
    // Respond with success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data fetched and cached successfully', 
        timestamp: new Date().toISOString(),
        dataItems: {
          gainers: marketData.gainers.length,
          losers: marketData.losers.length,
          hotPools: marketData.hotPools.length
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in fetchMarketData handler:', error);
    
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
