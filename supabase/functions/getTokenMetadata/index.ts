
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

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

    console.log(`Fetching token metadata for ${address} on ${chain}`);

    // Fetch token metadata from DEXTools API
    const response = await fetch(`${API_BASE_URL}/token/${chain}/${address}`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token metadata API error (${response.status}):`, errorText);
      
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
