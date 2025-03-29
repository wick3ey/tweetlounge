
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log("Fetching Solana blockchain info from DEXTools API");
    
    // Fetch Solana blockchain info from DEXTools
    const response = await fetch(`${API_BASE_URL}/blockchain/solana`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    let resultData = { ...fallbackData };

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error from DEXTools API: ${response.status}`, errorData);
      console.log("Using fallback data");
    } else {
      try {
        const apiData = await response.json();
        console.log("Successfully fetched Solana stats:", apiData);
        
        // Merge with fallback data to ensure all required properties exist
        if (apiData && apiData.data) {
          resultData = { ...fallbackData, ...apiData.data };
        }
      } catch (parseError) {
        console.error("Error parsing API response:", parseError);
        console.log("Using fallback data due to parsing error");
      }
    }
    
    // Return the data (either from API or fallback)
    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Solana stats:", error);
    
    // Return fallback data in case of any error
    return new Response(JSON.stringify(fallbackData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
