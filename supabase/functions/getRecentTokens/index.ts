
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback recent tokens data
const fallbackRecentTokens = [
  {
    address: "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
    name: "Solana Pump",
    symbol: "PUMP",
    decimals: 9,
    socialInfo: {
      website: "https://solanapump.io",
      twitter: "solanapump",
      telegram: "solanapump_official",
      discord: "solanapump"
    },
    creationTime: "2025-03-15T10:23:45.000Z",
    creationBlock: 234567890,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
  },
  {
    address: "BNTYkJdHdJzQzgJLHEquuCHAiX8VqePTjAmJi1GTh2XU",
    name: "Bonk",
    symbol: "BONK",
    decimals: 9,
    socialInfo: {
      website: "https://bonk.io",
      twitter: "bonk_inu",
      telegram: "bonk_official",
      discord: "bonk"
    },
    creationTime: "2025-03-14T09:15:30.000Z",
    creationBlock: 234566789,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
  },
  {
    address: "So11111111111111111111111111111111111111112",
    name: "Wrapped SOL",
    symbol: "SOL",
    decimals: 9,
    socialInfo: {
      website: "https://solana.com",
      twitter: "solana",
      telegram: "solana",
      discord: "solana"
    },
    creationTime: "2020-03-16T00:00:00.000Z",
    creationBlock: 1234567,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body");
    const { chain, limit = 10 } = await req.json();
    
    if (chain !== "solana") {
      return new Response(
        JSON.stringify({ error: "Only Solana chain is supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Using centralized cache for recent tokens");
    
    // Fetch recent tokens from centralized cache
    const response = await fetch(
      `https://kasreuudfxznhzekybzg.supabase.co/functions/v1/getCachedMarketData`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          endpoint: "token/recent",
          chain: "solana",
          params: {
            page: "0",
            pageSize: limit.toString()
          },
          expirationMinutes: 15 // 15 minutes
        })
      }
    );

    let recentTokens = fallbackRecentTokens;

    if (response.ok) {
      try {
        recentTokens = await response.json();
        console.log(`Successfully fetched ${recentTokens.length} recent tokens from cache`);
      } catch (error) {
        console.error("Error parsing recent tokens response:", error);
      }
    } else {
      console.warn(`Recent tokens API returned ${response.status}, using fallback data`);
    }

    // Return the results array
    return new Response(
      JSON.stringify(recentTokens),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching recent tokens:", error);
    
    // Return fallback data in case of any error
    return new Response(
      JSON.stringify(fallbackRecentTokens),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
