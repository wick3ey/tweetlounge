
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const DEXTOOLS_API_KEY = 'XE9c5ofzgr2FA5t096AjT70CO45koL0mcZA0HOHd';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DexToolsApiParams {
  endpoint: string;
  tokenAddress?: string;
  params?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, tokenAddress, params = {} } = await req.json() as DexToolsApiParams;
    
    console.log(`Processing request for endpoint: ${endpoint}, tokenAddress: ${tokenAddress}`);
    
    // Build base URL based on endpoint
    let url = `https://public-api.dextools.io/trial/v2`;
    
    switch (endpoint) {
      case 'tokens':
        url += `/token/solana`;
        break;
      case 'price':
        if (!tokenAddress) throw new Error('Token address is required for price endpoint');
        url += `/token/solana/${tokenAddress}/price`;
        break;
      case 'info':
        if (!tokenAddress) throw new Error('Token address is required for info endpoint');
        url += `/token/solana/${tokenAddress}/info`;
        break;
      case 'hotpools':
        url += `/ranking/solana/hotpools`;
        break;
      case 'gainers':
        url += `/ranking/solana/gainers`;
        break;
      case 'losers':
        url += `/ranking/solana/losers`;
        break;
      case 'blockchain':
        url += `/blockchain/solana`;
        break;
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    
    // Add query parameters if present
    if (Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      url += `?${queryParams.toString()}`;
    }
    
    console.log(`Fetching data from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': DEXTOOLS_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from DexTools API: ${response.status} ${errorText}`);
      throw new Error(`DexTools API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Return success response with CORS headers
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error handling request:', error);
    
    // Return error response with CORS headers
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
