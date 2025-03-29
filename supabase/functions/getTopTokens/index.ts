
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

serve(async (req) => {
  try {
    const { chain } = await req.json();
    
    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch gainers and losers in parallel
    const [gainersResponse, losersResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/ranking/solana/gainers`, {
        method: "GET",
        headers: {
          "X-API-KEY": DEXTOOLS_API_KEY,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${API_BASE_URL}/ranking/solana/losers`, {
        method: "GET",
        headers: {
          "X-API-KEY": DEXTOOLS_API_KEY,
          "Content-Type": "application/json",
        },
      }),
    ]);

    if (!gainersResponse.ok || !losersResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch top tokens",
          gainersStatus: gainersResponse.status,
          losersStatus: losersResponse.status,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const gainers = await gainersResponse.json();
    const losers = await losersResponse.json();

    // Return the combined data
    return new Response(
      JSON.stringify({
        gainers,
        losers,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching top tokens:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to fetch top tokens",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
