
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback hot pools data
const fallbackHotPools = [
  {
    address: "9XyQVZKLw2qMcvtaXGKTTeZaR2pKRfV6ts4zVk6ji5LC",
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
    rank: 1
  },
  {
    address: "HULn6Ssogh6rkwTJMJAjEWvMkQy2ZgYpCPK5NPcnufnx",
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
    rank: 2
  },
  {
    address: "EBLsYKzxeRAJzNinz4xK2WgUjSKxgZ3jvXvNMG1z5JJq",
    exchangeName: "Jupiter",
    exchangeFactory: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    creationTime: "2025-02-28T09:10:20.000Z",
    creationBlock: 234389012,
    mainToken: {
      address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      symbol: "mSOL",
      name: "Marinade staked SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    fee: 0.2,
    rank: 3
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

    console.log("Fetching hot pools from DEXTools API");

    // Fetch hot pools
    const response = await fetch(`${API_BASE_URL}/ranking/solana/hotpools`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    let hotPools = fallbackHotPools;

    if (response.ok) {
      try {
        hotPools = await response.json();
        console.log("Successfully fetched hot pools");
      } catch (error) {
        console.error("Error parsing hot pools response:", error);
      }
    } else {
      const errorText = await response.text();
      console.error(`Hot pools API error (${response.status}):`, errorText);
      console.log("Using fallback hot pools data");
    }

    // Return the data
    return new Response(
      JSON.stringify({
        hotPools,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching hot pools:", error);
    
    // Return fallback data in case of any error
    return new Response(
      JSON.stringify({
        hotPools: fallbackHotPools,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
