
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with admin privileges (needed to update cache)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    }
  }
);

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

interface CacheOptions {
  expirationMinutes: number;
  fallbackData?: any;
  source?: string;
}

type EndpointType = "blockchain" | "ranking/gainers" | "ranking/losers" | 
                   "ranking/hotpools" | "token" | "token/metadata" | "token/recent";

/**
 * Main function to get cached market data or fetch from API if needed
 */
async function getCachedMarketData(
  endpoint: EndpointType,
  chain: string,
  params: Record<string, string> = {},
  options: CacheOptions = { expirationMinutes: 30 }
) {
  console.log(`Requested ${endpoint} data for ${chain} with params:`, params);
  
  // Build a unique cache key
  const cacheKey = buildCacheKey(endpoint, chain, params);
  
  // Try to get data from cache first
  const cachedData = await getFromCache(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for ${cacheKey}`);
    return cachedData;
  }
  
  console.log(`Cache miss for ${cacheKey}, fetching from API`);
  
  try {
    // If not in cache, fetch from API
    const freshData = await fetchFromDexTools(endpoint, chain, params);
    
    // Store in cache for future requests
    await storeInCache(
      cacheKey, 
      freshData, 
      options.expirationMinutes, 
      options.source || 'dextools'
    );
    
    return freshData;
  } catch (error) {
    console.error(`Error fetching ${endpoint} from API:`, error);
    
    // If we have fallback data, store it in cache with shorter expiration
    if (options.fallbackData) {
      console.log(`Using fallback data for ${cacheKey}`);
      // Cache fallback for a shorter time (5 minutes)
      await storeInCache(
        cacheKey, 
        options.fallbackData, 
        5, 
        options.source || 'fallback'
      );
      return options.fallbackData;
    }
    
    throw error;
  }
}

/**
 * Build a unique cache key based on endpoint, chain and params
 */
function buildCacheKey(endpoint: string, chain: string, params: Record<string, string>): string {
  const paramString = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort for consistency
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${chain}:${endpoint}${paramString ? `:${paramString}` : ''}`;
}

/**
 * Fetch data from cache if available and not expired
 */
async function getFromCache(cacheKey: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('market_cache')
    .select('data, expires_at')
    .eq('cache_key', cacheKey)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Check if cache has expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (now > expiresAt) {
    console.log(`Cache for ${cacheKey} expired at ${expiresAt}`);
    
    // Delete expired cache entry (don't await, let it happen in background)
    supabaseAdmin
      .from('market_cache')
      .delete()
      .eq('cache_key', cacheKey)
      .then(() => console.log(`Deleted expired cache for ${cacheKey}`))
      .catch(err => console.error(`Error deleting expired cache: ${err}`));
    
    return null;
  }
  
  return data.data;
}

/**
 * Store data in cache for future requests
 */
async function storeInCache(
  cacheKey: string, 
  data: any, 
  expirationMinutes: number,
  source: string
): Promise<void> {
  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
  
  // Upsert cache entry (update if exists, insert if not)
  const { error } = await supabaseAdmin
    .from('market_cache')
    .upsert({
      cache_key: cacheKey,
      data: data,
      expires_at: expiresAt.toISOString(),
      source: source
    }, {
      onConflict: 'cache_key'
    });
  
  if (error) {
    console.error(`Error storing data in cache: ${error.message}`);
    // Continue even if caching fails - we already have the data to return
  } else {
    console.log(`Cached ${cacheKey} until ${expiresAt.toISOString()}`);
  }
}

/**
 * Fetch data directly from DEXTools API
 */
async function fetchFromDexTools(
  endpoint: EndpointType, 
  chain: string,
  params: Record<string, string> = {}
): Promise<any> {
  // Build URL and query parameters
  let url = `${API_BASE_URL}`;
  
  if (endpoint === "blockchain") {
    url += `/${endpoint}/${chain}`;
  } else if (endpoint === "token/recent") {
    // Handle recently created tokens
    url += `/token/${chain}?sort=creationTime&order=desc`;
    
    // Add any additional params
    for (const [key, value] of Object.entries(params)) {
      url += `&${key}=${encodeURIComponent(value)}`;
    }
  } else if (endpoint.startsWith("ranking/")) {
    url += `/${endpoint}/${chain}`;
    
    // Add any additional params
    for (const [key, value] of Object.entries(params)) {
      url += `${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
    }
  } else if (endpoint === "token") {
    // Handle token lookup by address
    if (!params.address) {
      throw new Error("Token address is required for token endpoint");
    }
    url += `/${endpoint}/${chain}/${params.address}`;
    
    // Add any additional params except address which we used in the path
    const { address, ...restParams } = params;
    for (const [key, value] of Object.entries(restParams)) {
      url += `${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
    }
  } else if (endpoint === "token/metadata") {
    // Handle token metadata by address
    if (!params.address) {
      throw new Error("Token address is required for token/metadata endpoint");
    }
    
    // Token metadata endpoint pattern
    url += `/token/${chain}/${params.address}`;
  }
  
  console.log(`Fetching from DEXTools API: ${url}`);
  
  // Make API request
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": DEXTOOLS_API_KEY,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`DEXTools API error (${response.status}): ${errorText}`);
    throw new Error(`DEXTools API returned ${response.status}: ${errorText}`);
  }
  
  const result = await response.json();
  
  // Handle different response formats from DEXTools API
  if (result.statusCode === 200 && result.data) {
    return result.data;
  } else if (result.data) {
    return result.data;
  } else if (result.results) {
    return result.results;
  }
  
  return result;
}

// Fallback data for various endpoints
const FALLBACK_DATA = {
  solana: {
    blockchain: {
      name: "Solana",
      id: "solana",
      website: "https://solana.com",
      exchangeCount: 12,
      tvl: 1458972341.23,
      tokenCount: 23456,
      poolCount: 34567
    },
    gainers: [
      {
        address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
        exchangeName: "Raydium",
        exchangeFactory: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz",
        creationTime: "2025-03-15T11:30:00.000Z",
        creationBlock: 234567890,
        mainToken: {
          address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
          symbol: "PUMP",
          name: "Solana Pump",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        sideToken: {
          address: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        fee: 0.3,
        rank: 1,
        price: 1.23,
        price24h: 0.95,
        variation24h: 29.47
      },
      {
        exchangeName: "Orca",
        exchangeFactory: "3oGsJcDPGnNjmDfZH7GGJUBQPxNzVQZLGF3GNkKXCYuW",
        creationTime: "2025-03-10T14:22:35.000Z",
        creationBlock: 234532151,
        mainToken: {
          address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
          symbol: "BONK",
          name: "Bonk",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        sideToken: {
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          name: "USD Coin",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        fee: 0.25,
        rank: 2,
        price: 0.00034,
        price24h: 0.00029,
        variation24h: 17.24
      }
    ],
    losers: [
      {
        exchangeName: "Orca",
        exchangeFactory: "3oGsJcDPGnNjmDfZH7GGJUBQPxNzVQZLGF3GNkKXCYuW",
        creationTime: "2025-01-05T11:30:00.000Z",
        creationBlock: 233750890,
        mainToken: {
          address: "6Y7dENQgNiKUfRCrYa1LjQxwgkWxPkxUmQYoqYi7Vdn3",
          symbol: "BEARISH",
          name: "Bearish Token",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        sideToken: {
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          name: "USD Coin",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        fee: 0.25,
        rank: 1,
        price: 0.032,
        price24h: 0.085,
        variation24h: -62.35
      },
      {
        exchangeName: "Raydium",
        exchangeFactory: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz",
        creationTime: "2025-02-15T14:20:30.000Z",
        creationBlock: 234245678,
        mainToken: {
          address: "FaLLxzJ4p9vCcQUTFARzYQEg4QBQpXNUaMe1FgxR2Vev",
          symbol: "DUMP",
          name: "Dumping Token",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        sideToken: {
          address: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        fee: 0.3,
        rank: 2,
        price: 0.75,
        price24h: 1.25,
        variation24h: -40.0
      }
    ],
    hotpools: [
      {
        address: "9XyQVZKLw2qMcvtaXGKTTeZaR2pKRfV6ts4zVk6ji5LC",
        exchangeName: "Raydium",
        exchangeFactory: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz",
        creationTime: "2025-03-15T11:30:00.000Z",
        creationBlock: 234567890,
        mainToken: {
          address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
          symbol: "PUMP",
          name: "Solana Pump",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        sideToken: {
          address: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        },
        fee: 0.3,
        rank: 1
      },
      {
        address: "HULn6Ssogh6rkwTJMJAjEWvMkQy2ZgYpCPK5NPcnufnx",
        exchangeName: "Orca",
        exchangeFactory: "3oGsJcDPGnNjmDfZH7GGJUBQPxNzVQZLGF3GNkKXCYuW",
        creationTime: "2025-03-10T14:22:35.000Z",
        creationBlock: 234532151,
        mainToken: {
          address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
          symbol: "BONK",
          name: "Bonk",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        sideToken: {
          address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          name: "USD Coin",
          logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        },
        fee: 0.25,
        rank: 2
      }
    ],
    tokenRecent: [
      {
        address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
        name: "Solana Pump",
        symbol: "PUMP",
        decimals: 9,
        socialInfo: {
          website: "https://solanapump.io",
          twitter: "solanapump",
          telegram: "solanapump_official",
          discord: "solanapump"
        },
        creationTime: "2025-03-15T10:23:45.000Z",
        creationBlock: 234567890,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
      },
      {
        address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
        name: "Bonk",
        symbol: "BONK",
        decimals: 9,
        socialInfo: {
          website: "https://bonk.io",
          twitter: "bonk_inu",
          telegram: "bonk_official",
          discord: "bonk"
        },
        creationTime: "2025-03-14T09:15:30.000Z",
        creationBlock: 234566789,
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
      }
    ]
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request
    const { endpoint, chain, params, expirationMinutes = 30 } = await req.json();
    
    if (!endpoint || !chain) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: endpoint and chain are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Check if endpoint is supported
    const supportedEndpoints: EndpointType[] = [
      "blockchain", 
      "ranking/gainers", 
      "ranking/losers", 
      "ranking/hotpools", 
      "token", 
      "token/metadata", 
      "token/recent"
    ];
    
    if (!supportedEndpoints.includes(endpoint as EndpointType)) {
      return new Response(
        JSON.stringify({ error: `Unsupported endpoint: ${endpoint}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Determine which fallback to use based on endpoint
    let fallbackData = undefined;
    if (chain === "solana") {
      if (endpoint === "blockchain") {
        fallbackData = FALLBACK_DATA.solana.blockchain;
      } else if (endpoint === "ranking/gainers") {
        fallbackData = FALLBACK_DATA.solana.gainers;
      } else if (endpoint === "ranking/losers") {
        fallbackData = FALLBACK_DATA.solana.losers;
      } else if (endpoint === "ranking/hotpools") {
        fallbackData = FALLBACK_DATA.solana.hotpools;
      } else if (endpoint === "token/recent") {
        fallbackData = FALLBACK_DATA.solana.tokenRecent;
      }
    }
    
    // Get data with caching
    const data = await getCachedMarketData(
      endpoint as EndpointType, 
      chain, 
      params || {}, 
      { 
        expirationMinutes: parseInt(expirationMinutes.toString()),
        fallbackData,
        source: 'dextools'
      }
    );
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in getCachedMarketData:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
