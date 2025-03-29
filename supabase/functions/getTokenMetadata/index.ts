
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        JSON.stringify({ error: "Both chain and address are required" }),
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

    console.log(`Using centralized cache for token metadata: ${address}`);
    
    // Fetch token metadata from centralized cache
    const response = await fetch(
      `https://kasreuudfxznhzekybzg.supabase.co/functions/v1/getCachedMarketData`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          endpoint: "token/metadata",
          chain: "solana",
          params: { address },
          expirationMinutes: 60 // 1 hour since token metadata changes rarely
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching token metadata for ${address}: ${response.status} - ${errorText}`);
      
      // For a 500 error from the cache service, return a cleaner error to the client
      return new Response(
        JSON.stringify({ 
          statusCode: 200,  // Return 200 even on error to avoid cascading failures
          data: {
            address: address,
            name: `Token ${address.substring(0, 4)}...`,
            symbol: address.substring(0, 6),
            error: "Could not fetch complete metadata"
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: data
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in getTokenMetadata:", error);
    return new Response(
      JSON.stringify({ 
        statusCode: 500,
        error: "Failed to fetch token metadata" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
