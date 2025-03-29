
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

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase admin client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    }
  });
}

// Function to update a single cache entry
async function refreshCacheItem(config: { cacheKey: string, endpoint: string, ttl: number }) {
  console.log(`[${new Date().toISOString()}] Starting refreshCacheItem for ${config.cacheKey} (endpoint: ${config.endpoint})`);
  
  let supabaseAdmin;
  
  try {
    supabaseAdmin = getSupabaseClient();
    
    // Log Supabase URL (masked for security)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    console.log(`Supabase URL: ${supabaseUrl.substring(0, 8)}...${supabaseUrl.substring(supabaseUrl.length - 5)}`);
    
    // Fetch from API
    console.log(`Fetching data from ${API_BASE_URL}${config.endpoint}`);
    const response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const apiData = await response.json();
    console.log(`API request succeeded with status: ${response.status}`);
    
    // Log the structure of the response for debugging
    console.log(`API response structure for ${config.cacheKey}:`, 
      JSON.stringify(apiData).slice(0, 200) + "...");
    
    // Log some stats about the response
    if (apiData.data && Array.isArray(apiData.data)) {
      console.log(`Received ${apiData.data.length} items in the response`);
    }
    
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
      
      console.log(`Processed ${hotPools.length} hot pools successfully`);
    } else {
      // For other data types
      processedData = apiData;
      console.log(`Using default data processing for ${config.cacheKey}`);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + config.ttl);
    console.log(`Setting cache expiration to ${expiresAt.toISOString()}`);

    // Store in cache
    console.log(`Storing data in market_cache table with key ${config.cacheKey}`);
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Log every request
  console.log(`[${new Date().toISOString()}] Received request to refreshCache function`);
  console.log(`Request method: ${req.method}, URL: ${req.url}`);
  
  // Check for authorized requests
  const authHeader = req.headers.get("Authorization") || "";
  const isInternalRequest = req.headers.get("X-Client-Info")?.includes("supabase");
  
  console.log(`Authorization header exists: ${!!authHeader}`);
  console.log(`Is internal request: ${isInternalRequest}`);
  
  // Only allow requests from cron jobs or other authorized services
  if (!isInternalRequest && !authHeader.startsWith("Bearer ")) {
    console.log("Unauthorized request rejected");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    console.log("Starting cache refresh job");
    
    // Check environment
    console.log("Environment variables check:");
    console.log(`SUPABASE_URL exists: ${!!Deno.env.get("SUPABASE_URL")}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY exists: ${!!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
    
    if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const errorMsg = "Missing required environment variables";
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Refresh all configured caches
    console.log(`Refreshing ${CACHE_CONFIG.length} cache configurations`);
    const refreshResults = await Promise.all(
      CACHE_CONFIG.map(config => refreshCacheItem(config))
    );
    
    // Count successes and failures
    const succeeded = refreshResults.filter(r => r.success).length;
    const failed = refreshResults.filter(r => !r.success).length;
    
    console.log(`Cache refresh complete. Success: ${succeeded}, Failed: ${failed}`);
    console.log("Detailed results:", JSON.stringify(refreshResults));
    
    return new Response(
      JSON.stringify({
        refreshed: new Date().toISOString(),
        results: refreshResults,
        summary: { succeeded, failed }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in cache refresh job:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
