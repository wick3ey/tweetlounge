
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Implement a basic in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const metadataCache: Map<string, CacheEntry> = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

    // Check cache first
    const cacheKey = `${chain}-${address}`;
    const cachedData = metadataCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached metadata for token: ${address}`);
      return new Response(
        JSON.stringify(cachedData.data),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: `Failed to fetch token metadata: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and return the metadata
    const metadata = await response.json();
    console.log(`Successfully fetched metadata for token: ${address}`);
    
    // Update cache
    metadataCache.set(cacheKey, {
      data: metadata,
      timestamp: Date.now()
    });

    return new Response(
      JSON.stringify(metadata),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to fetch token metadata",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
