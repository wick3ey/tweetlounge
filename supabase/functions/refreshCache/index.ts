
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API constants
const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Cache constants
const CACHE_CONFIG = [
  {
    cacheKey: "solana_hot_pools",
    endpoint: "/ranking/solana/hotpools",
    ttl: 30 * 60, // 30 minutes in seconds
  },
  // Can add more endpoints to keep fresh in the cache
];

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      persistSession: false,
    }
  }
);

// Function to update a single cache entry
async function refreshCacheItem(config: { cacheKey: string, endpoint: string, ttl: number }) {
  console.log(`Refreshing cache for ${config.cacheKey} (endpoint: ${config.endpoint})`);
  
  try {
    // Fetch from API
    const response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${await response.text()}`);
    }

    const apiData = await response.json();
    
    // Log the structure of the response for debugging
    console.log(`API response structure for ${config.cacheKey}:`, 
      JSON.stringify(apiData).slice(0, 200) + "...");
    
    // Process the data based on cache key
    let processedData;
    
    if (config.cacheKey === "solana_hot_pools" && apiData.statusCode === 200 && Array.isArray(apiData.data)) {
      // For hot pools, we must preserve the exact ranking and order from the API
      // Only do minimal transformation to ensure consistent field access
      const hotPools = apiData.data.map((pool: any) => {
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

      processedData = {
        hotPools: hotPools,
        timestamp: Date.now(),
        source: "api_cron" 
      };
    } else {
      // For other data types
      processedData = apiData;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + config.ttl);

    // Store in cache
    const { error } = await supabaseAdmin
      .from('market_cache')
      .upsert({
        cache_key: config.cacheKey,
        data: processedData,
        expires_at: expiresAt.toISOString(),
        source: "cron_job"
      });

    if (error) {
      throw new Error(`Cache upsert error: ${error.message}`);
    }

    console.log(`Successfully refreshed cache for ${config.cacheKey}, expires at ${expiresAt.toISOString()}`);
    return { cacheKey: config.cacheKey, success: true };
  } catch (error) {
    console.error(`Error refreshing cache for ${config.cacheKey}:`, error);
    return { cacheKey: config.cacheKey, success: false, error: error.message };
  }
}

serve(async (req) => {
  // Check for authorized requests
  const authHeader = req.headers.get("Authorization") || "";
  const isInternalRequest = req.headers.get("X-Client-Info")?.includes("supabase");
  
  // Only allow requests from cron jobs or other authorized services
  if (!isInternalRequest && !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    console.log("Starting cache refresh job");
    
    // Refresh all configured caches
    const refreshResults = await Promise.all(
      CACHE_CONFIG.map(config => refreshCacheItem(config))
    );
    
    // Count successes and failures
    const succeeded = refreshResults.filter(r => r.success).length;
    const failed = refreshResults.filter(r => !r.success).length;
    
    console.log(`Cache refresh complete. Success: ${succeeded}, Failed: ${failed}`);
    
    return new Response(
      JSON.stringify({
        refreshed: new Date().toISOString(),
        results: refreshResults,
        summary: { succeeded, failed }
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in cache refresh job:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
