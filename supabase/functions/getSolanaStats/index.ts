
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

serve(async (req) => {
  try {
    // Fetch Solana blockchain info from DEXTools
    const response = await fetch(`${API_BASE_URL}/blockchain/solana`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error from DEXTools API: ${response.status}`, errorData);
      
      return new Response(
        JSON.stringify({
          error: `DEXTools API returned status ${response.status}`,
          details: errorData,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    // Return the data
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Solana stats:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to fetch Solana stats",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
