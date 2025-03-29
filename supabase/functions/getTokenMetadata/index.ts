
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=86400', // 24 hours cache
};

// Implement a basic in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const metadataCache: Map<string, CacheEntry> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // 300ms between requests to avoid rate limiting

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  // Implement rate limiting by waiting between requests
  const now = Date.now();
  const timeToWait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  
  if (timeToWait > 0) {
    await new Promise(resolve => setTimeout(resolve, timeToWait));
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    
    // If we hit rate limiting, wait and retry
    if (response.status === 429) {
      if (maxRetries > 0) {
        console.log(`Rate limited, retrying after delay (${maxRetries} retries left)`);
        // Exponential backoff
        const backoffTime = (4 - maxRetries) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return fetchWithRetry(url, options, maxRetries - 1);
      }
    }
    
    return response;
  } catch (error) {
    if (maxRetries > 0) {
      console.log(`Network error, retrying (${maxRetries} retries left):`, error.message);
      // Exponential backoff for network errors too
      const backoffTime = (4 - maxRetries) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return fetchWithRetry(url, options, maxRetries - 1);
    }
    throw error;
  }
}

// Fallback token data for common tokens
const fallbackTokens = {
  // SOL tokens
  "So11111111111111111111111111111111111111112": {
    address: "So11111111111111111111111111111111111111112",
    name: "Wrapped SOL",
    symbol: "SOL",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    decimals: 9
  },
  // USDC token
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
    symbol: "USDC",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    decimals: 6
  },
  // BONK token
  "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU": {
    address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
    name: "Bonk",
    symbol: "BONK",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png",
    decimals: 5
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chain, address } = await req.json();
    
    if (!chain || !address) {
      return new Response(
        JSON.stringify({ 
          error: "Both chain and address parameters are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check for fallback data for known tokens first
    if (fallbackTokens[address]) {
      console.log(`Using fallback data for well-known token: ${address}`);
      return new Response(
        JSON.stringify(fallbackTokens[address]),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Source": "fallback"
          },
        }
      );
    }

    // Check cache first
    const cacheKey = `${chain}-${address}`;
    const cachedData = metadataCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached metadata for token: ${address}`);
      return new Response(
        JSON.stringify(cachedData.data),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Source": "cache"
          },
        }
      );
    }

    console.log(`Fetching token metadata for ${address} on ${chain}`);

    // Use our retry mechanism for the API call
    const response = await fetchWithRetry(`${API_BASE_URL}/token/${chain}/${address}`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token metadata API error (${response.status}):`, errorText);
      
      // If we hit rate limits after retries, return a cached version if available
      // even if it's expired
      if (response.status === 429 && cachedData) {
        console.log(`Using expired cache due to rate limiting for ${address}`);
        return new Response(
          JSON.stringify({
            ...cachedData.data,
            _fromExpiredCache: true
          }),
          {
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "X-Source": "expired-cache"
            },
          }
        );
      }
      
      // Generate a fallback token with minimal data
      const fallbackToken = {
        address: address,
        name: `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
        symbol: "UNKNOWN",
        logo: `https://placehold.co/200x200/8B4513/ffffff?text=${address.substring(0, 2)}`,
        decimals: 9 // Default for Solana
      };
      
      // Cache this fallback temporarily to avoid hitting rate limits again
      metadataCache.set(cacheKey, {
        data: fallbackToken,
        timestamp: Date.now()
      });
      
      return new Response(
        JSON.stringify({
          ...fallbackToken,
          _fallbackGenerated: true
        }),
        {
          // Return 200 with fallback data instead of an error
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Source": "generated-fallback"
          },
        }
      );
    }

    // Parse and return the metadata
    const metadata = await response.json();
    console.log(`Successfully fetched metadata for token: ${address}`);
    
    // Extract and format the token data from the response
    let tokenData;
    
    // Handle different response formats
    if (metadata.data) {
      tokenData = metadata.data;
    } else {
      tokenData = metadata;
    }
    
    // Ensure required fields are present
    const formattedTokenData = {
      address: tokenData.address || address,
      name: tokenData.name || `Token ${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
      symbol: tokenData.symbol || "UNKNOWN",
      logo: tokenData.logo || `https://placehold.co/200x200/8B4513/ffffff?text=${address.substring(0, 2)}`,
      decimals: tokenData.decimals || 9,
      creationTime: tokenData.creationTime || null,
      creationBlock: tokenData.creationBlock || null,
      socialInfo: tokenData.socialInfo || {}
    };
    
    // Update cache
    metadataCache.set(cacheKey, {
      data: formattedTokenData,
      timestamp: Date.now()
    });

    return new Response(
      JSON.stringify(formattedTokenData),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Source": "api"
        },
      }
    );
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    
    // Return a generic placeholder token as fallback during errors
    const fallbackToken = {
      address: "unknown",
      name: "Unknown Token",
      symbol: "???",
      logo: "https://placehold.co/200x200/FF0000/ffffff?text=Error",
      decimals: 9,
      _error: true,
      errorMessage: error.message
    };
    
    return new Response(
      JSON.stringify(fallbackToken),
      {
        status: 200, // Return 200 even on error to avoid breaking the UI
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Source": "error-fallback"
        },
      }
    );
  }
});
