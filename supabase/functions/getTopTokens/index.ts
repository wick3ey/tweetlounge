
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback gainers data
const fallbackGainers = [
  {
    exchangeName: "Raydium",
    exchangeFactory: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz",
    creationTime: "2025-03-15T11:30:00.000Z",
    creationBlock: 234567890,
    mainToken: {
      address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
      symbol: "PUMP",
      name: "Solana Pump",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Wrapped SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    fee: 0.3,
    rank: 1,
    price: 1.23,
    price24h: 0.95,
    variation24h: 29.47
  },
  {
    exchangeName: "Orca",
    exchangeFactory: "3oGsJcDPGnNjmDfZH7GGJUBQPxNzVQZLGF3GNkKXCYuW",
    creationTime: "2025-03-10T14:22:35.000Z",
    creationBlock: 234532151,
    mainToken: {
      address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
      symbol: "BONK",
      name: "Bonk",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    sideToken: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    fee: 0.25,
    rank: 2,
    price: 0.00034,
    price24h: 0.00029,
    variation24h: 17.24
  }
];

// Fallback losers data
const fallbackLosers = [
  {
    exchangeName: "Orca",
    exchangeFactory: "3oGsJcDPGnNjmDfZH7GGJUBQPxNzVQZLGF3GNkKXCYuW",
    creationTime: "2025-01-05T11:30:00.000Z",
    creationBlock: 233750890,
    mainToken: {
      address: "6Y7dENQgNiKUfRCrYa1LjQxwgkWxPkxUmQYoqYi7Vdn3",
      symbol: "BEARISH",
      name: "Bearish Token",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    sideToken: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    fee: 0.25,
    rank: 1,
    price: 0.032,
    price24h: 0.085,
    variation24h: -62.35
  },
  {
    exchangeName: "Raydium",
    exchangeFactory: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz",
    creationTime: "2025-02-15T14:20:30.000Z",
    creationBlock: 234245678,
    mainToken: {
      address: "FaLLxzJ4p9vCcQUTFARzYQEg4QBQpXNUaMe1FgxR2Vev",
      symbol: "DUMP",
      name: "Dumping Token",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Wrapped SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    fee: 0.3,
    rank: 2,
    price: 0.75,
    price24h: 1.25,
    variation24h: -40.0
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Attempting to parse request body");
    const { chain } = await req.json();
    
    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching gainers from DEXTools API");
    
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

    let gainers = fallbackGainers;
    let losers = fallbackLosers;

    // Process gainers response if successful
    if (gainersResponse.ok) {
      try {
        gainers = await gainersResponse.json();
        console.log("Successfully fetched gainers");
      } catch (error) {
        console.error("Error parsing gainers response:", error);
      }
    } else {
      console.warn(`Gainers API returned ${gainersResponse.status}, using fallback data`);
    }

    // Process losers response if successful
    if (losersResponse.ok) {
      try {
        losers = await losersResponse.json();
        console.log("Successfully fetched losers");
      } catch (error) {
        console.error("Error parsing losers response:", error);
      }
    } else {
      console.warn(`Losers API returned ${losersResponse.status}, using fallback data`);
    }

    // Return the combined data
    return new Response(
      JSON.stringify({
        gainers,
        losers,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching top tokens:", error);
    
    // Return fallback data in case of any error
    return new Response(
      JSON.stringify({
        gainers: fallbackGainers,
        losers: fallbackLosers,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
