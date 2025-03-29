import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEXTOOLS_API_KEY = "XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd";
const API_BASE_URL = "https://public-api.dextools.io/trial/v2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=1800', // 30 minutes cache
};

// Fallback hot pools data (keep this as backup)
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
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
    },
    sideToken: {
      address: "So1111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Wrapped SOL",
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
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
      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png"
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

    // Fetch hot pools directly from DEXTools
    const response = await fetch(`${API_BASE_URL}/ranking/solana/hotpools`, {
      method: "GET",
      headers: {
        "X-API-KEY": DEXTOOLS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    let hotPools = [];

    if (response.ok) {
      try {
        const responseData = await response.json();
        console.log("Successfully fetched hot pools");
        
        // Check if the response has the correct structure
        if (responseData && responseData.statusCode === 200 && Array.isArray(responseData.data)) {
          hotPools = responseData.data;
          console.log("Successfully parsed hot pools data from API, found", hotPools.length, "pools");
        } else {
          console.log("Hot pools API response has unexpected format, using fallback");
          hotPools = fallbackHotPools;
        }
      } catch (error) {
        console.error("Error parsing hot pools response:", error);
        console.log("Using fallback hot pools data due to parse error");
        hotPools = fallbackHotPools;
      }
    } else {
      const errorText = await response.text();
      console.error(`Hot pools API error (${response.status}):`, errorText);
      console.log("Using fallback hot pools data due to API error");
      hotPools = fallbackHotPools;
    }

    // Process the hot pools data to match the expected format in our frontend
    const processedHotPools = hotPools.map(pool => {
      // Extract exchange details
      const exchangeName = pool.exchange?.name || "Unknown";
      const exchangeFactory = pool.exchange?.factory || "";
      
      // Format main token
      const mainToken = {
        address: pool.mainToken?.address || "",
        name: pool.mainToken?.name || "Unknown Token",
        symbol: pool.mainToken?.symbol || "???",
        logo: pool.mainToken?.logo || `https://placehold.co/200x200?text=${pool.mainToken?.symbol?.substring(0, 2) || "??"}`
      };
      
      // Format side token
      const sideToken = {
        address: pool.sideToken?.address || "",
        name: pool.sideToken?.name || "Unknown Token",
        symbol: pool.sideToken?.symbol || "???",
        logo: pool.sideToken?.logo || `https://placehold.co/200x200?text=${pool.sideToken?.symbol?.substring(0, 2) || "??"}`
      };
      
      // Try to get SOL logo for Wrapped SOL
      if (sideToken.address === "So1111111111111111111111111111111111111112") {
        sideToken.logo = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So1111111111111111111111111111111111111112/logo.png";
      }
      
      return {
        address: pool.address || "",
        exchangeName: exchangeName,
        exchangeFactory: exchangeFactory,
        creationTime: pool.creationTime || "",
        creationBlock: pool.creationBlock || 0,
        mainToken: mainToken,
        sideToken: sideToken,
        fee: 0.3, // Default fee
        rank: pool.rank || 0
      };
    });

    // Always return a valid response with either API data or fallback
    return new Response(
      JSON.stringify({
        hotPools: processedHotPools,
        timestamp: Date.now(),
        source: response.ok ? "api" : "fallback" 
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800", // 30 minutes cache
          "Expires": new Date(Date.now() + 30 * 60 * 1000).toUTCString() // 30 minutes from now
        },
      }
    );
  } catch (error) {
    console.error("Error in getHotPools function:", error);
    
    // Always return a valid response with fallback data
    return new Response(
      JSON.stringify({
        hotPools: fallbackHotPools,
        timestamp: Date.now(),
        source: "fallback",
        error: error.message
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800", // Still cache fallbacks for 30 minutes
          "Expires": new Date(Date.now() + 30 * 60 * 1000).toUTCString()
        },
      }
    );
  }
});
