
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    }
  }
);

// Default fallback data
const fallbackData = {
  name: "Solana",
  id: "solana",
  website: "https://solana.com",
  exchangeCount: 12,
  tvl: 1458972341.23,
  tokenCount: 23456,
  poolCount: 34567
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Using centralized cache for Solana stats");

    const cacheKey = "solana:blockchain";
    
    // Try to get from cache first
    const { data: cachedData, error: cacheError } = await supabaseAdmin
      .from('market_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single();
    
    // If we have valid cached data, return it
    if (cachedData && !cacheError) {
      // Check if cache is still valid
      const now = new Date();
      const expiresAt = new Date(cachedData.expires_at);
      
      if (now < expiresAt) {
        console.log("Cache hit for Solana stats");
        return new Response(
          JSON.stringify(cachedData.data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log("Cache expired for Solana stats, fetching new data");
      }
    } else {
      console.log("Cache miss for Solana stats, fetching new data");
    }
    
    // Call the central cached market data endpoint
    const response = await fetch(
      `https://kasreuudfxznhzekybzg.supabase.co/functions/v1/getCachedMarketData`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          endpoint: "blockchain",
          chain: "solana",
          expirationMinutes: 60 // 1 hour
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Use fallback data if the request fails
      console.error(`Error from cached market data endpoint: ${response.status}`);
      console.log("Using fallback data");
      
      return new Response(
        JSON.stringify(fallbackData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error fetching Solana stats:", error);
    
    // Return fallback data in case of any error
    return new Response(
      JSON.stringify(fallbackData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
