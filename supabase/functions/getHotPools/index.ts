
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";
const CACHE_KEY = "solana_hot_pools";
const CACHE_TTL = 30 * 60; // 30 minutes in seconds

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=1800', // 30 minutes browser cache
};

// Fallback hot pools data (keep this as backup)
const fallbackHotPools = [
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
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "So1111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Wrapped SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
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
  },
  {
    address: "EBLsYKzxeRAJzNinz4xK2WgUjSKxgZ3jvXvNMG1z5JJq",
    exchangeName: "Jupiter",
    exchangeFactory: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    creationTime: "2025-02-28T09:10:20.000Z",
    creationBlock: 234389012,
    mainToken: {
      address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      symbol: "mSOL",
      name: "Marinade staked SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    fee: 0.2,
    rank: 3
  }
];

// Initialize Supabase client with environment variables
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      persistSession: false,
    }
  }
);

// Function to read from cache
async function getFromCache() {
  try {
    const { data, error } = await supabaseAdmin
      .from('market_cache')
      .select('data, created_at, expires_at')
      .eq('cache_key', CACHE_KEY)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.log("Cache read error or no valid cache entry:", error.message);
      return null;
    }
    
    console.log(`Found valid cache from ${data.created_at}, expires at ${data.expires_at}`);
    return data.data;
  } catch (error) {
    console.error("Error accessing cache:", error);
    return null;
  }
}

// Function to write to cache
async function writeToCache(data, source = "api") {
  try {
    // Calculate the expiration date (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + CACHE_TTL);

    const { error } = await supabaseAdmin
      .from('market_cache')
      .upsert({
        cache_key: CACHE_KEY,
        data: data,
        expires_at: expiresAt.toISOString(),
        source: source
      });

    if (error) {
      console.error("Cache write error:", error);
    } else {
      console.log(`Successfully cached hot pools data, expires at ${expiresAt.toISOString()}`);
    }
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

// Function to fetch hot pools from API
async function fetchHotPoolsFromAPI() {
  console.log("Fetching hot pools from DEXTools API");
  
  try {
    // Fetch hot pools directly from DEXTools
    const response = await fetch(`${API_BASE_URL}/ranking/solana/hotpools`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hot pools API error (${response.status}):`, errorText);
      console.log("Using fallback hot pools data due to API error");
      
      // Cache the fallback data too, but with a shorter expiration
      const fallbackResponse = {
        hotPools: fallbackHotPools,
        timestamp: Date.now(),
        source: "fallback" 
      };
      
      await writeToCache(fallbackResponse, "fallback");
      return fallbackResponse;
    }

    try {
      const responseData = await response.json();
      console.log("Successfully fetched hot pools");
      
      // Check if the response has the correct structure
      if (responseData && responseData.statusCode === 200 && Array.isArray(responseData.data)) {
        console.log("Successfully parsed hot pools data from API, found", responseData.data.length, "pools");
        
        // Preserve the exact structure and order from the API
        const hotPools = responseData.data.map(pool => {
          return {
            rank: pool.rank || 0,
            address: pool.address || "",
            creationTime: pool.creationTime || "",
            creationBlock: pool.creationBlock || 0,
            exchangeName: pool.exchange?.name || "Unknown",
            exchangeFactory: pool.exchange?.factory || "",
            mainToken: {
              name: pool.mainToken?.name || "Unknown Token",
              symbol: pool.mainToken?.symbol || "???",
              address: pool.mainToken?.address || "",
              logo: pool.mainToken?.logo || `https://placehold.co/200x200?text=${pool.mainToken?.symbol?.substring(0, 2) || "??"}`,
            },
            sideToken: {
              name: pool.sideToken?.name || "Unknown Token", 
              symbol: pool.sideToken?.symbol || "???",
              address: pool.sideToken?.address || "",
              logo: pool.sideToken?.logo || `https://placehold.co/200x200?text=${pool.sideToken?.symbol?.substring(0, 2) || "??"}`,
            },
            fee: 0.3, // Default fee
          };
        });

        const result = {
          hotPools: hotPools,
          timestamp: Date.now(),
          source: "api" 
        };
        
        // Cache the successful API response
        await writeToCache(result, "api");
        return result;
      } else {
        console.log("Hot pools API response has unexpected format, using fallback");
        const fallbackResponse = {
          hotPools: fallbackHotPools,
          timestamp: Date.now(),
          source: "fallback"
        };
        
        await writeToCache(fallbackResponse, "fallback_format");
        return fallbackResponse;
      }
    } catch (error) {
      console.error("Error parsing hot pools response:", error);
      console.log("Using fallback hot pools data due to parse error");
      
      const fallbackResponse = {
        hotPools: fallbackHotPools,
        timestamp: Date.now(),
        source: "fallback_parse"
      };
      
      await writeToCache(fallbackResponse, "fallback_parse");
      return fallbackResponse;
    }
  } catch (error) {
    console.error("Error fetching from API:", error);
    
    const fallbackResponse = {
      hotPools: fallbackHotPools,
      timestamp: Date.now(),
      source: "fallback_network"
    };
    
    await writeToCache(fallbackResponse, "fallback_network");
    return fallbackResponse;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to parse request body");
    const { chain } = await req.json();
    
    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // First, try to get data from cache
    let cacheResult = await getFromCache();
    let result;
    
    if (cacheResult) {
      console.log("Using cached hot pools data");
      result = cacheResult;
    } else {
      console.log("No valid cache found, fetching fresh data");
      result = await fetchHotPoolsFromAPI();
    }

    // Get SOL logo for Wrapped SOL tokens
    if (result && result.hotPools) {
      result.hotPools.forEach(pool => {
        if (pool.sideToken?.address === "So11111111111111111111111111111111111111112") {
          pool.sideToken.logo = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
        }
      });
    }

    // Always return a valid response with either API data or fallback
    return new Response(
      JSON.stringify(result),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800", // 30 minutes cache
          "Expires": new Date(Date.now() + 30 * 60 * 1000).toUTCString() // 30 minutes from now
        },
      }
    );
  } catch (error) {
    console.error("Error in getHotPools function:", error);
    
    // Always return a valid response with fallback data
    return new Response(
      JSON.stringify({
        hotPools: fallbackHotPools,
        timestamp: Date.now(),
        source: "fallback",
        error: error.message
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800", // Still cache fallbacks for 30 minutes
          "Expires": new Date(Date.now() + 30 * 60 * 1000).toUTCString()
        },
      }
    );
  }
});
