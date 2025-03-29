
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

serve(async (req) => {
  try {
    const { chain, limit = 10 } = await req.json();
    
    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current date for "to" parameter
    const now = new Date();
    const to = now.toISOString();
    
    // Get date 30 days ago for "from" parameter
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString();

    // Fetch recent tokens
    const response = await fetch(
      `${API_BASE_URL}/token/solana?sort=creationTime&order=desc&from=${from}&to=${to}&page=0&pageSize=${limit}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": DEXTOOLS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DEXTools API error:", errorText);
      
      return new Response(
        JSON.stringify({
          error: `Failed to fetch recent tokens. Status: ${response.status}`,
          details: errorText,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    // Return just the results array if it exists
    return new Response(
      JSON.stringify(data.results || []),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching recent tokens:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to fetch recent tokens",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
